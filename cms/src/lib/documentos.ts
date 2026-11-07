import "server-only";
import { db } from "./db";
import { normalizarBusca, type TipoDoc } from "./documentos-shared";

export const POR_PAGINA_DOC = 20;

/** Todos os documentos publicados de uma área, para a visão organizada. */
export function documentosDaArea(orgaoId: string, tipo: TipoDoc) {
  return db.documento.findMany({
    where: { orgaoId, tipo, publicado: true },
    select: { id: true, titulo: true, categoria: true, ano: true, mime: true, bytes: true, arquivo: true, linkExterno: true },
  });
}

/** Consulta pública de documentos: só publicados, com busca e categoria. */
export async function buscarDocumentos(orgaoId: string, tipo: TipoDoc, q: string, categoria: string, pagina: number, ano = "", ordem = "recentes", destaque?: string) {
  const base = { orgaoId, tipo, publicado: true };
  const termos = normalizarBusca(q).split(" ").filter(Boolean).slice(0, 8);
  const filtro = {
    ...base,
    ...(categoria ? { categoria } : {}),
    ...(ano ? { ano: Number(ano) } : {}),
    AND: termos.map((t) => ({ busca: { contains: t } })),
  };
  const orderBy = ordem === "titulo" ? [{ titulo: "asc" as const }]
    : ordem === "antigos" ? [{ ano: "asc" as const }, { data: "asc" as const }]
      : [{ ano: "desc" as const }, { data: "desc" as const }];
  const [total, itens, grupos, porAno, emDestaque] = await Promise.all([
    db.documento.count({ where: filtro }),
    db.documento.findMany({
      where: filtro,
      orderBy,
      skip: (pagina - 1) * POR_PAGINA_DOC,
      take: POR_PAGINA_DOC,
      select: { id: true, titulo: true, descricao: true, categoria: true, data: true, ano: true, mime: true, bytes: true, linkExterno: true, arquivo: true },
    }),
    db.documento.groupBy({ by: ["categoria"], where: base, _count: { _all: true }, orderBy: { categoria: "asc" } }),
    db.documento.groupBy({ by: ["ano"], where: base, orderBy: { ano: "desc" } }),
    destaque ? db.documento.findFirst({ where: { ...base, categoria: destaque, arquivo: { not: null } }, orderBy: { data: "desc" }, select: { id: true, titulo: true, categoria: true } }) : null,
  ]);
  const anos = porAno.map((a) => a.ano).filter((a): a is number => a !== null);
  const categorias = grupos.filter((g) => g.categoria).map((g) => ({ nome: g.categoria, total: g._count._all }));
  const todas = grupos.reduce((s, g) => s + g._count._all, 0);
  return { total, todas, itens, categorias, anos, emDestaque, paginas: Math.max(1, Math.ceil(total / POR_PAGINA_DOC)) };
}
