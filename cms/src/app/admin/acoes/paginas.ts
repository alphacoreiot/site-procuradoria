"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirOrgao } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";
import { LIMITES_PAGINA as L, LIMITES_PROCESSO as LP, SLUGS_RESERVADOS, normalizarBusca } from "@/lib/documentos-shared";
import { gerarSlug } from "@/lib/noticias-shared";

const schemaPagina = z.object({
  titulo: z.string().trim().min(3, "Título: mínimo de 3 caracteres.").max(L.titulo, `Título: no máximo ${L.titulo} caracteres.`),
  slug: z.string().trim().toLowerCase().max(L.slug).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Endereço: só letras minúsculas, números e hífen.").or(z.literal("")),
  descricaoSeo: z.string().trim().max(L.seo),
  conteudo: z.string().max(L.conteudo, `Conteúdo: no máximo ${L.conteudo} caracteres.`),
  publicada: z.boolean(),
});

export async function salvarPagina(orgao: string, id: string | null, entrada: unknown) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const d = schemaPagina.parse(entrada);
    const slug = d.slug || gerarSlug(d.titulo).slice(0, L.slug).replace(/-+$/, "");
    if (SLUGS_RESERVADOS.has(slug)) throw new ErroUsuario("Este endereço é reservado pelo sistema. Escolha outro.");
    const mesmo = await db.pagina.findUnique({ where: { orgaoId_slug: { orgaoId: o.id, slug } } });
    if (mesmo && mesmo.id !== id) throw new ErroUsuario("Já existe uma página com este endereço.");
    const dados = { titulo: d.titulo, slug, descricaoSeo: d.descricaoSeo, conteudo: d.conteudo, publicada: d.publicada };
    let salva;
    if (id) {
      const atual = await db.pagina.findFirst({ where: { id: String(id), orgaoId: o.id } });
      if (!atual || atual.slug === "inicio") throw new ErroUsuario("Página não encontrada.");
      salva = await db.pagina.update({ where: { id: atual.id }, data: dados });
      await auditar({ acao: "pagina.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "pagina", entidadeId: atual.id, detalhes: { anterior: { titulo: atual.titulo, slug: atual.slug, conteudo: atual.conteudo, publicada: atual.publicada } } });
    } else {
      salva = await db.pagina.create({ data: { ...dados, orgaoId: o.id } });
      await auditar({ acao: "pagina.criar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "pagina", entidadeId: salva.id });
    }
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/paginas`);
    return { ok: true as const, dados: { id: salva.id, slug: salva.slug }, msg: "Página salva." };
  });
}

export async function excluirPagina(orgao: string, id: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const p = await db.pagina.findFirst({ where: { id: String(id), orgaoId: o.id } });
    if (!p || p.slug === "inicio") throw new ErroUsuario("Página não encontrada.");
    await db.pagina.delete({ where: { id: p.id } });
    await auditar({ acao: "pagina.excluir", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "pagina", entidadeId: p.id, detalhes: { anterior: { titulo: p.titulo, slug: p.slug, conteudo: p.conteudo } } });
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/paginas`);
    return { ok: true as const, msg: "Página excluída." };
  });
}

// ---------------------------------------------------------------- processos
const schemaProcesso = z.object({
  titulo: z.string().trim().min(3, "Título: mínimo de 3 caracteres.").max(LP.titulo, `Título: no máximo ${LP.titulo} caracteres.`),
  publicado: z.boolean(),
  exigencias: z.array(z.object({
    documento: z.string().trim().min(2, "Informe o nome do documento.").max(LP.documento, `Documento: no máximo ${LP.documento} caracteres.`),
    obrigatorio: z.boolean(),
  })).max(LP.itens, `No máximo ${LP.itens} documentos.`),
});

export async function salvarProcesso(orgao: string, id: string | null, entrada: unknown) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const d = schemaProcesso.parse(entrada);
    const dados = { titulo: d.titulo, publicado: d.publicado, exigencias: JSON.stringify(d.exigencias), busca: normalizarBusca(d.titulo) };
    let salvo;
    if (id) {
      const atual = await db.processo.findFirst({ where: { id: String(id), orgaoId: o.id } });
      if (!atual) throw new ErroUsuario("Processo não encontrado.");
      salvo = await db.processo.update({ where: { id: atual.id }, data: dados });
      await auditar({ acao: "processo.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "processo", entidadeId: atual.id, detalhes: { anterior: { titulo: atual.titulo, exigencias: atual.exigencias, publicado: atual.publicado } } });
    } else {
      const raiz = gerarSlug(d.titulo).slice(0, 100).replace(/-+$/, "");
      let slug = raiz;
      for (let i = 2; await db.processo.findUnique({ where: { orgaoId_slug: { orgaoId: o.id, slug } } }); i++) slug = `${raiz}-${i}`;
      salvo = await db.processo.create({ data: { ...dados, slug, orgaoId: o.id } });
      await auditar({ acao: "processo.criar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "processo", entidadeId: salvo.id });
    }
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/processos`);
    return { ok: true as const, dados: { id: salvo.id }, msg: "Processo salvo." };
  });
}

export async function excluirProcesso(orgao: string, id: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const p = await db.processo.findFirst({ where: { id: String(id), orgaoId: o.id } });
    if (!p) throw new ErroUsuario("Processo não encontrado.");
    await db.processo.delete({ where: { id: p.id } });
    await auditar({ acao: "processo.excluir", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "processo", entidadeId: p.id, detalhes: { anterior: { titulo: p.titulo, exigencias: p.exigencias } } });
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/processos`);
    return { ok: true as const, msg: "Processo excluído." };
  });
}
