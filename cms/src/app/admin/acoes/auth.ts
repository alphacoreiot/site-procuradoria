"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { conferirSenha, gerarHashSenha, hashDeTempoConstante, validarForcaSenha } from "@/lib/password";
import { criarSessao, encerrarSessao, encerrarTodasSessoes, obterSessao } from "@/lib/session";
import { consumirLimite } from "@/lib/ratelimit";
import { ipCliente } from "@/lib/request";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";

const MAX_FALHAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;
const ERRO_GENERICO = "E-mail ou senha incorretos.";

export type EstadoLogin = { erro?: string } | undefined;

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const dados = z
    .object({ email: z.string().trim().toLowerCase().email().max(120), senha: z.string().min(1).max(128) })
    .safeParse({ email: form.get("email"), senha: form.get("senha") });
  if (!dados.success) return { erro: ERRO_GENERICO };
  const { email, senha } = dados.data;

  // limite por IP (20 tentativas / 15 min) e por e-mail (bloqueio da conta)
  const ip = await ipCliente();
  if (!(await consumirLimite(`login:ip:${ip}`, 20, BLOQUEIO_MS))) {
    return { erro: "Muitas tentativas. Aguarde alguns minutos." };
  }

  const u = await db.usuario.findUnique({ where: { email } });
  if (!u) {
    await conferirSenha(await hashDeTempoConstante(), senha); // mesmo tempo de resposta
    await auditar({ acao: "login.falha", email, detalhes: { motivo: "usuario-inexistente" } });
    return { erro: ERRO_GENERICO };
  }
  if (u.bloqueadoAte && u.bloqueadoAte > new Date()) {
    await auditar({ acao: "login.bloqueado", email, usuarioId: u.id, orgaoId: u.orgaoId });
    return { erro: "Conta bloqueada temporariamente por excesso de tentativas. Tente em 15 minutos." };
  }
  const ok = await conferirSenha(u.senhaHash, senha);
  if (!ok || !u.ativo) {
    const falhas = u.falhasLogin + 1;
    await db.usuario.update({
      where: { id: u.id },
      data: { falhasLogin: falhas, bloqueadoAte: falhas >= MAX_FALHAS ? new Date(Date.now() + BLOQUEIO_MS) : null },
    });
    await auditar({ acao: "login.falha", email, usuarioId: u.id, orgaoId: u.orgaoId, detalhes: { falhas, inativo: !u.ativo } });
    return { erro: ERRO_GENERICO };
  }

  await db.usuario.update({ where: { id: u.id }, data: { falhasLogin: 0, bloqueadoAte: null, ultimoAcesso: new Date() } });
  await criarSessao(u.id);
  await auditar({ acao: "login.sucesso", email, usuarioId: u.id, orgaoId: u.orgaoId });
  redirect("/admin");
}

export async function sair() {
  const u = await obterSessao();
  await encerrarSessao();
  if (u) await auditar({ acao: "logout", email: u.email, usuarioId: u.id, orgaoId: u.orgaoId });
  redirect("/admin/login");
}

export async function trocarMinhaSenha(atual: string, nova: string) {
  return executar(async () => {
    const s = await obterSessao();
    if (!s) throw new ErroUsuario("Sessão expirada.");
    const u = await db.usuario.findUniqueOrThrow({ where: { id: s.id } });
    if (!(await conferirSenha(u.senhaHash, String(atual).slice(0, 128)))) throw new ErroUsuario("Senha atual incorreta.");
    const problema = validarForcaSenha(String(nova));
    if (problema) throw new ErroUsuario(problema);
    await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await gerarHashSenha(String(nova)), senhaAlteradaEm: new Date() } });
    await encerrarTodasSessoes(u.id); // derruba outras sessões
    await criarSessao(u.id);
    await auditar({ acao: "senha.trocar", email: u.email, usuarioId: u.id, orgaoId: u.orgaoId });
    return { ok: true as const, msg: "Senha alterada. As outras sessões foram encerradas." };
  });
}
