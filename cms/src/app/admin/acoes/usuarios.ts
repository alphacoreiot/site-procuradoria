"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirOrgao } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";
import { gerarHashSenha, validarForcaSenha } from "@/lib/password";
import { encerrarTodasSessoes } from "@/lib/session";

const schemaNovo = z.object({
  nome: z.string().trim().min(3).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  papel: z.enum(["ADMIN", "EDITOR"]),
  senha: z.string().max(128),
});

/** Cria usuário do órgão (só ADMIN do órgão ou SUPERADMIN). */
export async function criarUsuario(orgao: string, entrada: unknown) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const d = schemaNovo.parse(entrada);
    const problema = validarForcaSenha(d.senha);
    if (problema) throw new ErroUsuario(problema);
    if (await db.usuario.findUnique({ where: { email: d.email } })) throw new ErroUsuario("Já existe um usuário com esse e-mail.");
    const novo = await db.usuario.create({
      data: { nome: d.nome, email: d.email, papel: d.papel, orgaoId: o.id, senhaHash: await gerarHashSenha(d.senha) },
    });
    await auditar({ acao: "usuario.criar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "usuario", entidadeId: novo.id, detalhes: { email: d.email, papel: d.papel } });
    revalidatePath(`/admin/${o.slug}/usuarios`);
    return { ok: true as const, msg: `Usuário ${d.email} criado. Repasse a senha por um canal seguro.` };
  });
}

async function alvoDoOrgao(orgaoId: string, alvoId: string, quemId: string) {
  const alvo = await db.usuario.findFirst({ where: { id: String(alvoId), orgaoId } });
  if (!alvo) throw new ErroUsuario("Usuário não encontrado.");
  if (alvo.id === quemId) throw new ErroUsuario("Use \"Minha conta\" para alterar o seu próprio acesso.");
  return alvo;
}

export async function alternarUsuario(orgao: string, alvoId: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const alvo = await alvoDoOrgao(o.id, alvoId, usuario.id);
    await db.usuario.update({ where: { id: alvo.id }, data: { ativo: !alvo.ativo, falhasLogin: 0, bloqueadoAte: null } });
    if (alvo.ativo) await encerrarTodasSessoes(alvo.id);
    await auditar({ acao: alvo.ativo ? "usuario.desativar" : "usuario.ativar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "usuario", entidadeId: alvo.id });
    revalidatePath(`/admin/${o.slug}/usuarios`);
  });
}

export async function redefinirSenha(orgao: string, alvoId: string, senha: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const alvo = await alvoDoOrgao(o.id, alvoId, usuario.id);
    const problema = validarForcaSenha(String(senha));
    if (problema) throw new ErroUsuario(problema);
    await db.usuario.update({ where: { id: alvo.id }, data: { senhaHash: await gerarHashSenha(String(senha)), senhaAlteradaEm: new Date(), falhasLogin: 0, bloqueadoAte: null } });
    await encerrarTodasSessoes(alvo.id);
    await auditar({ acao: "usuario.redefinir-senha", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "usuario", entidadeId: alvo.id });
    return { ok: true as const, msg: "Senha redefinida. As sessões do usuário foram encerradas." };
  });
}
