import "server-only";
import { db } from "./db";
import { normalizarBusca } from "./documentos-shared";

const CAMPOS = { id: true, slug: true, titulo: true, resumo: true, categoria: true, tipo: true, chamada: true, autorNome: true, capaId: true, capaAlt: true, publicadaEm: true } as const;
const VAZIAS = new Set("para com sobre pela pelo como mais seus suas sefaz camacari municipio prefeitura secretaria nova novo".split(" "));
const palavras = (s: string) => new Set(normalizarBusca(s).split(/[^a-z0-9]+/).filter((p) => p.length > 3 && !VAZIAS.has(p)));

/** Notícias parecidas: mesmo assunto pesa mais, depois tipo, palavras do título e proximidade da data. */
export async function noticiasRelacionadas(n: { id: string; orgaoId: string; titulo: string; categoria: string; tipo: string; publicadaEm: Date | null }, quantas = 3) {
  const candidatas = await db.noticia.findMany({
    where: { orgaoId: n.orgaoId, status: "PUBLICADA", publicadaEm: { lte: new Date() }, id: { not: n.id } },
    orderBy: { publicadaEm: "desc" },
    take: 200,
    select: CAMPOS,
  });
  const base = palavras(n.titulo);
  const ref = n.publicadaEm?.getTime() ?? Date.now();
  const nota = (c: (typeof candidatas)[number]) => {
    let s = 0;
    if (n.categoria && n.categoria !== "Geral" && c.categoria === n.categoria) s += 6;
    if (n.tipo && c.tipo === n.tipo) s += 1.5;
    for (const p of palavras(c.titulo)) if (base.has(p)) s += 1;
    const dias = Math.abs((c.publicadaEm?.getTime() ?? 0) - ref) / 864e5;
    return s + Math.max(0, 1 - dias / 365);
  };
  return candidatas.map((c) => ({ c, s: nota(c) })).sort((a, b) => b.s - a.s).slice(0, quantas).map((x) => x.c);
}

/** Notícia anterior e seguinte, por data. */
export async function vizinhas(orgaoId: string, data: Date) {
  const base = { orgaoId, status: "PUBLICADA", publicadaEm: { not: null } };
  const sel = { slug: true, titulo: true };
  const [anterior, proxima] = await Promise.all([
    db.noticia.findFirst({ where: { ...base, publicadaEm: { lt: data } }, orderBy: { publicadaEm: "desc" }, select: sel }),
    db.noticia.findFirst({ where: { ...base, publicadaEm: { gt: data, lte: new Date() } }, orderBy: { publicadaEm: "asc" }, select: sel }),
  ]);
  return { anterior, proxima };
}
