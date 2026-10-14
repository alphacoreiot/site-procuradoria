import "server-only";
import { cache } from "react";
import { db } from "./db";
import { BLOCOS_POR_TIPO, CAMPOS_CONFIG } from "@/blocks/specs";
import { completar, idsDeImagens } from "@/blocks/campos";
import type { MapaMidias } from "@/components/site/ui";

export type BlocoCarregado = { id: string; tipo: string; area: string; ordem: number; visivel: boolean; dados: Record<string, unknown> };

function lerJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/** Tudo que o site público do órgão precisa, numa leitura só. */
export const carregarSite = cache(async (slug: string, incluirOcultos = false) => {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return null;
  const orgao = await db.orgao.findUnique({ where: { slug }, include: { configuracao: true } });
  if (!orgao || (!orgao.ativo && !incluirOcultos)) return null;

  const pagina = await db.pagina.findUnique({
    where: { orgaoId_slug: { orgaoId: orgao.id, slug: "inicio" } },
    include: { blocos: { orderBy: { ordem: "asc" } } },
  });

  const config = completar(CAMPOS_CONFIG, lerJson(orgao.configuracao?.dados ?? "{}"));
  const blocos: BlocoCarregado[] = (pagina?.blocos ?? [])
    .filter((b) => BLOCOS_POR_TIPO[b.tipo] && (incluirOcultos || b.visivel))
    .map((b) => ({
      id: b.id, tipo: b.tipo, area: b.area, ordem: b.ordem, visivel: b.visivel,
      dados: completar(BLOCOS_POR_TIPO[b.tipo].campos, lerJson(b.dados)),
    }));

  const noticias = await db.noticia.findMany({
    where: { orgaoId: orgao.id, status: "PUBLICADA", publicadaEm: { lte: new Date() } },
    orderBy: [{ destaque: "desc" }, { publicadaEm: "desc" }],
    take: 6,
    select: { id: true, slug: true, titulo: true, resumo: true, categoria: true, capaId: true, capaAlt: true, publicadaEm: true },
  });

  // todas as imagens usadas, num mapa id -> dimensões
  const ids = new Set<string>();
  idsDeImagens(CAMPOS_CONFIG, config, ids);
  for (const b of blocos) idsDeImagens(BLOCOS_POR_TIPO[b.tipo].campos, b.dados, ids);
  for (const n of noticias) if (n.capaId) ids.add(n.capaId);
  const midias = await mapaMidias([...ids], orgao.id);

  return { orgao, pagina, config, blocos, noticias, midias };
});

export async function mapaMidias(ids: string[], orgaoId: string): Promise<MapaMidias> {
  if (ids.length === 0) return {};
  const lista = await db.midia.findMany({ where: { id: { in: ids }, orgaoId } });
  return Object.fromEntries(lista.map((m) => [m.id, { largura: m.largura, altura: m.altura, alt: m.alt }]));
}
