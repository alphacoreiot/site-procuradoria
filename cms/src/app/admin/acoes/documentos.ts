"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirOrgao } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";
import { consumirLimite } from "@/lib/ratelimit";
import { apagarArquivoDoc, salvarArquivoDoc } from "@/lib/documentos-core";
import { LIMITES_DOC as L, TAMANHO_MAX_DOC, normalizarBusca } from "@/lib/documentos-shared";

const schema = z.object({
  tipo: z.enum(["LEGISLACAO", "CONTEUDO"]),
  titulo: z.string().trim().min(3, "Título: mínimo de 3 caracteres.").max(L.titulo, `Título: no máximo ${L.titulo} caracteres.`),
  descricao: z.string().trim().max(L.descricao, `Descrição: no máximo ${L.descricao} caracteres.`),
  categoria: z.string().trim().max(L.categoria),
  linkExterno: z.string().trim().max(L.link).regex(/^https?:\/\/[^\s"'<>]+$/, "Link: use um endereço http(s) completo.").or(z.literal("")),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  publicado: z.boolean(),
});

export async function salvarDocumento(orgao: string, id: string | null, form: FormData) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const d = schema.parse({
      tipo: form.get("tipo"), titulo: form.get("titulo"), descricao: form.get("descricao") ?? "", categoria: form.get("categoria") ?? "",
      linkExterno: form.get("linkExterno") ?? "", data: form.get("data"), publicado: form.get("publicado") === "1",
    });
    const atual = id ? await db.documento.findFirst({ where: { id: String(id), orgaoId: o.id } }) : null;
    if (id && !atual) throw new ErroUsuario("Documento não encontrado.");

    const envio = form.get("arquivo");
    let novo: Awaited<ReturnType<typeof salvarArquivoDoc>> | null = null;
    if (envio instanceof File && envio.size > 0) {
      if (envio.size > TAMANHO_MAX_DOC) throw new ErroUsuario("O arquivo pode ter no máximo 40 MB.");
      if (!(await consumirLimite(`upload:${usuario.id}`, 60, 60 * 60 * 1000))) throw new ErroUsuario("Limite de envios por hora atingido.");
      novo = await salvarArquivoDoc(Buffer.from(await envio.arrayBuffer()), envio.name || "documento");
    }
    if (d.publicado && !novo && !atual?.arquivo && !d.linkExterno) throw new ErroUsuario("Para publicar, envie um arquivo ou informe um link.");

    const dados = {
      tipo: d.tipo, titulo: d.titulo, descricao: d.descricao, categoria: d.categoria, linkExterno: d.linkExterno,
      data: new Date(`${d.data}T12:00:00-03:00`), publicado: d.publicado,
      busca: normalizarBusca(`${d.titulo} ${d.descricao}`),
      ...(novo ?? {}),
    };
    let salvo;
    if (atual) {
      salvo = await db.documento.update({ where: { id: atual.id }, data: dados });
      if (novo) await apagarArquivoDoc(atual.arquivo);
      await auditar({ acao: "documento.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "documento", entidadeId: atual.id, detalhes: { anterior: { titulo: atual.titulo, descricao: atual.descricao, categoria: atual.categoria, publicado: atual.publicado, nomeArquivo: atual.nomeArquivo } } });
    } else {
      salvo = await db.documento.create({ data: { ...dados, orgaoId: o.id } });
      await auditar({ acao: "documento.criar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "documento", entidadeId: salvo.id });
    }
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/documentos`);
    return { ok: true as const, dados: { id: salvo.id, nomeArquivo: salvo.nomeArquivo }, msg: "Documento salvo." };
  });
}

export async function excluirDocumento(orgao: string, id: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const d = await db.documento.findFirst({ where: { id: String(id), orgaoId: o.id } });
    if (!d) throw new ErroUsuario("Documento não encontrado.");
    await db.documento.delete({ where: { id: d.id } });
    await apagarArquivoDoc(d.arquivo);
    await auditar({ acao: "documento.excluir", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "documento", entidadeId: d.id, detalhes: { anterior: { titulo: d.titulo, categoria: d.categoria, nomeArquivo: d.nomeArquivo } } });
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/documentos`);
    return { ok: true as const, msg: "Documento excluído." };
  });
}
