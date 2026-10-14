"use server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirOrgao } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";
import { consumirLimite } from "@/lib/ratelimit";
import { DIR_UPLOADS, salvarUpload, TAMANHO_MAX } from "@/lib/media";

export type ItemMidia = { id: string; largura: number; altura: number; alt: string; nome: string; focoX: number; focoY: number };

export async function listarMidias(orgao: string): Promise<ItemMidia[]> {
  const { orgao: o } = await exigirOrgao(orgao, "EDITOR");
  const lista = await db.midia.findMany({ where: { orgaoId: o.id }, orderBy: { criadaEm: "desc" }, take: 300 });
  return lista.map((m) => ({ id: m.id, largura: m.largura, altura: m.altura, alt: m.alt, nome: m.nomeOriginal, focoX: m.focoX, focoY: m.focoY }));
}

export async function enviarMidia(orgao: string, form: FormData) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    if (!(await consumirLimite(`upload:${usuario.id}`, 60, 60 * 60 * 1000))) throw new ErroUsuario("Limite de envios por hora atingido.");
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) throw new ErroUsuario("Escolha um arquivo.");
    if (arquivo.size > TAMANHO_MAX) throw new ErroUsuario("A imagem pode ter no máximo 5 MB.");
    const alt = String(form.get("alt") ?? "").slice(0, 160);
    const m = await salvarUpload({ dados: Buffer.from(await arquivo.arrayBuffer()), nomeOriginal: arquivo.name || "imagem", orgaoId: o.id, usuarioId: usuario.id, alt });
    await auditar({ acao: "midia.enviar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "midia", entidadeId: m.id, detalhes: { nome: m.nomeOriginal, largura: m.largura, altura: m.altura } });
    revalidatePath(`/admin/${o.slug}/midia`);
    return { id: m.id, largura: m.largura, altura: m.altura, alt: m.alt, nome: m.nomeOriginal, focoX: m.focoX, focoY: m.focoY } satisfies ItemMidia;
  });
}

export async function atualizarMidia(orgao: string, id: string, entrada: unknown) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const d = z.object({ alt: z.string().trim().max(160), focoX: z.number().min(0).max(1), focoY: z.number().min(0).max(1) }).parse(entrada);
    const m = await db.midia.findFirst({ where: { id: String(id), orgaoId: o.id } });
    if (!m) throw new ErroUsuario("Imagem não encontrada.");
    await db.midia.update({ where: { id: m.id }, data: d });
    await auditar({ acao: "midia.editar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "midia", entidadeId: m.id, detalhes: { anterior: { alt: m.alt, focoX: m.focoX, focoY: m.focoY } } });
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/midia`);
    return { ok: true as const, msg: "Imagem atualizada." };
  });
}

/** Exclui só se a imagem não estiver em uso (componentes, configurações ou notícias). */
export async function excluirMidia(orgao: string, id: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const m = await db.midia.findFirst({ where: { id: String(id), orgaoId: o.id } });
    if (!m) throw new ErroUsuario("Imagem não encontrada.");
    const [blocos, config, noticias] = await Promise.all([
      db.bloco.count({ where: { pagina: { orgaoId: o.id }, dados: { contains: m.id } } }),
      db.configuracao.count({ where: { orgaoId: o.id, dados: { contains: m.id } } }),
      db.noticia.count({ where: { orgaoId: o.id, capaId: m.id } }),
    ]);
    if (blocos + config + noticias > 0) throw new ErroUsuario("Esta imagem está em uso no site. Troque-a antes de excluir.");
    await db.midia.delete({ where: { id: m.id } });
    await unlink(path.join(DIR_UPLOADS, m.arquivo)).catch(() => {});
    await auditar({ acao: "midia.excluir", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "midia", entidadeId: m.id, detalhes: { nome: m.nomeOriginal } });
    revalidatePath(`/admin/${o.slug}/midia`);
  });
}
