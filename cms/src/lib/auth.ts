import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";
import { obterSessao, type UsuarioSessao } from "./session";

export const PAPEIS = ["SUPERADMIN", "ADMIN", "EDITOR"] as const;
export type Papel = (typeof PAPEIS)[number];
const NIVEL: Record<Papel, number> = { EDITOR: 1, ADMIN: 2, SUPERADMIN: 3 };

export class AcessoNegado extends Error {
  constructor(msg = "Acesso negado.") {
    super(msg);
  }
}

/** Exige usuário logado. Em páginas, redireciona para o login. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const u = await obterSessao();
  if (!u) redirect("/admin/login");
  return u;
}

export function podeNoOrgao(u: UsuarioSessao, orgaoId: string, minimo: Papel = "EDITOR"): boolean {
  if (u.papel === "SUPERADMIN") return true;
  return u.orgaoId === orgaoId && NIVEL[u.papel] >= NIVEL[minimo];
}

/**
 * Confere, NO SERVIDOR, se o usuário pode agir no órgão com o papel mínimo.
 * Toda Server Action chama isto antes de ler ou gravar dados do órgão.
 */
export async function exigirOrgao(orgaoSlugOuId: string, minimo: Papel = "EDITOR") {
  const u = await obterSessao();
  if (!u) throw new AcessoNegado("Sessão expirada. Entre novamente.");
  const orgao = await db.orgao.findFirst({
    where: { OR: [{ id: orgaoSlugOuId }, { slug: orgaoSlugOuId }] },
  });
  if (!orgao || !podeNoOrgao(u, orgao.id, minimo)) throw new AcessoNegado();
  return { usuario: u, orgao };
}

export async function exigirSuperadmin(): Promise<UsuarioSessao> {
  const u = await obterSessao();
  if (!u || u.papel !== "SUPERADMIN") throw new AcessoNegado();
  return u;
}

/** Órgãos que o usuário pode administrar. */
export async function orgaosDoUsuario(u: UsuarioSessao) {
  if (u.papel === "SUPERADMIN") return db.orgao.findMany({ orderBy: { nome: "asc" } });
  if (!u.orgaoId) return [];
  return db.orgao.findMany({ where: { id: u.orgaoId } });
}

/** Para páginas do painel: confere acesso ao órgão; sem acesso, mostra 404. */
export async function orgaoDaPagina(slug: string, minimo: Papel = "EDITOR") {
  const u = await exigirUsuario();
  const orgao = /^[a-z0-9-]{2,40}$/.test(slug) ? await db.orgao.findUnique({ where: { slug } }) : null;
  if (!orgao || !podeNoOrgao(u, orgao.id, minimo)) notFound();
  return { usuario: u, orgao };
}
