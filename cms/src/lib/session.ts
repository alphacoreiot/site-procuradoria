import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { ipCliente, navegadorCliente } from "./request";

const PRODUCAO = process.env.NODE_ENV === "production";
// Prefixo __Host-: o navegador só aceita o cookie com Secure, Path=/ e sem Domain.
export const COOKIE_SESSAO = PRODUCAO ? "__Host-cms_sessao" : "cms_sessao";
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url"); // 256 bits
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  await db.sessao.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId,
      expiraEm,
      ip: await ipCliente(),
      navegador: await navegadorCliente(),
    },
  });
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: PRODUCAO,
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
}

export type UsuarioSessao = {
  id: string;
  email: string;
  nome: string;
  papel: "SUPERADMIN" | "ADMIN" | "EDITOR";
  orgaoId: string | null;
};

/** Usuário logado (ou null). Cacheado por requisição. */
export const obterSessao = cache(async (): Promise<UsuarioSessao | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || token.length > 100) return null;
  const sessao = await db.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: true },
  });
  if (!sessao) return null;
  if (sessao.expiraEm <= new Date() || !sessao.usuario.ativo) {
    await db.sessao.delete({ where: { id: sessao.id } }).catch(() => {});
    return null;
  }
  const u = sessao.usuario;
  return { id: u.id, email: u.email, nome: u.nome, papel: u.papel as UsuarioSessao["papel"], orgaoId: u.orgaoId };
});

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await db.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE_SESSAO);
}

/** Derruba todas as sessões do usuário (ex.: troca de senha, desativação). */
export async function encerrarTodasSessoes(usuarioId: string): Promise<void> {
  await db.sessao.deleteMany({ where: { usuarioId } });
}
