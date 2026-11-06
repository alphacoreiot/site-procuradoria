import "server-only";
import { db } from "./db";
import { normalizarBusca, type TipoDoc } from "./documentos-shared";

export const POR_PAGINA_DOC = 20;

/** Consulta pública de documentos: só publicados, com busca e categoria. */
export async function buscarDocumentos(orgaoId: string, tipo: TipoDoc, q: string, categoria: string, pagina: number) {
  const base = { orgaoId, tipo, publicado: true };
  const termos = normalizarBusca(q).split(" ").filter(Boolean).slice(0, 8);
  const filtro = {
    ...base,
    ...(categoria ? { categoria } : {}),
    AND: termos.map((t) => ({ busca: { contains: t } })),
  };
  const [total, itens, grupos] = await Promise.all([
    db.documento.count({ where: filtro }),
    db.documento.findMany({
      where: filtro,
      orderBy: [{ data: "desc" }, { titulo: "asc" }],
      skip: (pagina - 1) * POR_PAGINA_DOC,
      take: POR_PAGINA_DOC,
      select: { id: true, titulo: true, descricao: true, categoria: true, data: true, mime: true, bytes: true, linkExterno: true, arquivo: true },
    }),
    db.documento.groupBy({ by: ["categoria"], where: base, _count: { _all: true }, orderBy: { categoria: "asc" } }),
  ]);
  const categorias = grupos.filter((g) => g.categoria).map((g) => ({ nome: g.categoria, total: g._count._all }));
  return { total, itens, categorias, paginas: Math.max(1, Math.ceil(total / POR_PAGINA_DOC)) };
}
