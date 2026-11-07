import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { carregarSite, mapaMidias } from "@/lib/site";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { CardNoticia } from "@/components/site/noticias";
import { CabecalhoPagina } from "@/components/site/pagina";
import { BuscaNoticias, FiltrosNoticias, linkNoticias } from "./FiltrosNoticias";
import { normalizarBusca } from "@/lib/documentos-shared";

export const dynamic = "force-dynamic";
const POR_PAGINA = 12;

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<{ pagina?: string; q?: string; tipo?: string; tema?: string; ano?: string; autor?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  return site ? { title: `Notícias — ${site.orgao.nome}` } : {};
}

export default async function ListaNoticias({ params, searchParams }: Props) {
  const site = await carregarSite((await params).orgao);
  if (!site) notFound();
  const sp = await searchParams;
  const pagina = Math.max(1, Math.min(1000, Number(sp.pagina) || 1));
  const moderno = Boolean(site.config.visualModerno);
  const publicas = { orgaoId: site.orgao.id, status: "PUBLICADA", publicadaEm: { lte: new Date() } };
  const f = { q: String(sp.q ?? "").slice(0, 100), tipo: String(sp.tipo ?? "").slice(0, 40), tema: String(sp.tema ?? "").slice(0, 40), autor: String(sp.autor ?? "").slice(0, 80), ano: /^\d{4}$/.test(String(sp.ano)) ? String(sp.ano) : "" };
  const filtro = moderno
    ? {
      ...publicas,
      ...(f.tipo ? { tipo: f.tipo } : {}),
      ...(f.tema ? { categoria: f.tema } : {}),
      ...(f.autor ? { autorNome: f.autor } : {}),
      ...(f.ano ? { publicadaEm: { gte: new Date(`${f.ano}-01-01T00:00:00-03:00`), lt: new Date(`${Number(f.ano) + 1}-01-01T00:00:00-03:00`) } } : {}),
      AND: normalizarBusca(f.q).split(" ").filter(Boolean).slice(0, 8).map((t) => ({ busca: { contains: t } })),
    }
    : publicas;
  const [total, noticias] = await Promise.all([
    db.noticia.count({ where: filtro }),
    db.noticia.findMany({
      where: filtro,
      orderBy: { publicadaEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, slug: true, titulo: true, resumo: true, categoria: true, tipo: true, chamada: true, autorNome: true, capaId: true, capaAlt: true, publicadaEm: true },
    }),
  ]);
  const todas = moderno ? await db.noticia.findMany({ where: publicas, select: { tipo: true, categoria: true, autorNome: true, publicadaEm: true } }) : [];
  const contar = (lista: string[]) => [...new Set(lista.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((nome) => ({ nome, total: lista.filter((x) => x === nome).length }));
  const anos = [...new Set(todas.map((n) => n.publicadaEm?.getFullYear() ?? 0).filter(Boolean))].sort((a, b) => b - a);
  const base = `/${site.orgao.slug}/noticias`;
  const semFiltro = !f.q && !f.tipo && !f.tema && !f.ano && !f.autor;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const midias = { ...site.midias, ...(await mapaMidias(noticias.flatMap((n) => (n.capaId ? [n.capaId] : [])), site.orgao.id)) };
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias, noticias: site.noticias };

  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      {moderno && <CabecalhoPagina trilha={[{ href: `/${site.orgao.slug}`, texto: "Início" }, { texto: "Notícias" }]} titulo="Notícias" texto="Novidades, prazos, orientações e comunicados da Secretaria."><BuscaNoticias base={base} f={f} /></CabecalhoPagina>}
      <section className={moderno ? "pag-corpo" : "section news-page"}>
        <div className="container">
          {!moderno && (
            <header className="section__head section__head--wide">
              <h6><a href={`/${site.orgao.slug}`}>{site.orgao.sigla}</a></h6>
              <h1 className="news-page__title">Notícias</h1>
            </header>
          )}
          {moderno && <FiltrosNoticias base={base} f={f} tipos={contar(todas.map((n) => n.tipo))} temas={contar(todas.map((n) => n.categoria))} autores={contar(todas.map((n) => n.autorNome))} anos={anos} total={total} />}
          {noticias.length === 0
            ? <p className="news-empty">Nenhuma notícia publicada ainda.</p>
            : <div className={`news-grid${moderno && pagina === 1 && semFiltro ? " news-grid--destaque" : ""}`}>{noticias.map((n) => <CardNoticia key={n.id} n={n} orgaoSlug={site.orgao.slug} midias={midias} />)}</div>}
          {paginas > 1 && (
            <nav className="news-pager" aria-label="Paginação">
              {pagina > 1 && <a className="btn btn--outline" href={moderno ? linkNoticias(base, { ...f, pagina: pagina - 1 }) : `?pagina=${pagina - 1}`}>← Anteriores</a>}
              <span>Página {pagina} de {paginas}</span>
              {pagina < paginas && <a className="btn btn--outline" href={moderno ? linkNoticias(base, { ...f, pagina: pagina + 1 }) : `?pagina=${pagina + 1}`}>Próximas →</a>}
            </nav>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
