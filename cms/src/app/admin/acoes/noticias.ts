"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirOrgao } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";
import { LIMITES_NOTICIA, gerarSlug } from "@/lib/noticias-shared";

const schema = z.object({
  titulo: z.string().trim().min(5, "Título: mínimo de 5 caracteres.").max(LIMITES_NOTICIA.titulo, `Título: no máximo ${LIMITES_NOTICIA.titulo} caracteres.`),
  slug: z.string().trim().toLowerCase().max(LIMITES_NOTICIA.slug).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Endereço: só letras minúsculas, números e hífen.").or(z.literal("")),
  resumo: z.string().trim().min(10, "Resumo: mínimo de 10 caracteres.").max(LIMITES_NOTICIA.resumo, `Resumo: no máximo ${LIMITES_NOTICIA.resumo} caracteres.`),
  conteudo: z.string().max(LIMITES_NOTICIA.conteudo, `Conteúdo: no máximo ${LIMITES_NOTICIA.conteudo} caracteres.`),
  categoria: z.string().trim().max(LIMITES_NOTICIA.categoria),
  capaId: z.string().regex(/^[a-z0-9]{10,40}$/).or(z.literal("")),
  capaAlt: z.string().trim().max(LIMITES_NOTICIA.capaAlt),
  destaque: z.boolean(),
  status: z.enum(["RASCUNHO", "PUBLICADA"]),
  publicadaEm: z.string().max(30).or(z.literal("")), // ISO local "2026-10-14T09:30"
});

export async function salvarNoticia(orgao: string, id: string | null, entrada: unknown) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const d = schema.parse(entrada);
    if (d.capaId && !(await db.midia.count({ where: { id: d.capaId, orgaoId: o.id } }))) throw new ErroUsuario("Capa inválida.");

    let slug = d.slug || gerarSlug(d.titulo);
    // garante endereço único dentro do órgão
    for (let i = 2; ; i++) {
      const existe = await db.noticia.findUnique({ where: { orgaoId_slug: { orgaoId: o.id, slug } } });
      if (!existe || existe.id === id) break;
      slug = `${(d.slug || gerarSlug(d.titulo)).slice(0, 110)}-${i}`;
    }

    let publicadaEm: Date | null = null;
    if (d.status === "PUBLICADA") {
      publicadaEm = d.publicadaEm ? new Date(d.publicadaEm + (d.publicadaEm.length <= 16 ? ":00-03:00" : "")) : new Date();
      if (isNaN(publicadaEm.getTime())) throw new ErroUsuario("Data de publicação inválida.");
    }
    const dados = {
      titulo: d.titulo, slug, resumo: d.resumo, conteudo: d.conteudo, categoria: d.categoria,
      capaId: d.capaId || null, capaAlt: d.capaAlt, destaque: d.destaque, status: d.status, publicadaEm,
    };

    let salva;
    if (id) {
      const atual = await db.noticia.findFirst({ where: { id: String(id), orgaoId: o.id } });
      if (!atual) throw new ErroUsuario("Notícia não encontrada.");
      salva = await db.noticia.update({ where: { id: atual.id }, data: dados });
      await auditar({ acao: atual.status !== d.status ? `noticia.${d.status === "PUBLICADA" ? "publicar" : "despublicar"}` : "noticia.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "noticia", entidadeId: atual.id, detalhes: { anterior: { titulo: atual.titulo, resumo: atual.resumo, conteudo: atual.conteudo, status: atual.status } } });
    } else {
      salva = await db.noticia.create({ data: { ...dados, orgaoId: o.id, autorId: usuario.id } });
      await auditar({ acao: "noticia.criar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "noticia", entidadeId: salva.id });
    }
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/noticias`);
    return { ok: true as const, dados: { id: salva.id, slug: salva.slug }, msg: d.status === "PUBLICADA" ? "Notícia salva e publicada." : "Rascunho salvo." };
  });
}

export async function excluirNoticia(orgao: string, id: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const n = await db.noticia.findFirst({ where: { id: String(id), orgaoId: o.id } });
    if (!n) throw new ErroUsuario("Notícia não encontrada.");
    await db.noticia.delete({ where: { id: n.id } });
    await auditar({ acao: "noticia.excluir", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "noticia", entidadeId: n.id, detalhes: { anterior: n } });
    revalidatePath(`/${o.slug}`, "layout");
    revalidatePath(`/admin/${o.slug}/noticias`);
  });
}
