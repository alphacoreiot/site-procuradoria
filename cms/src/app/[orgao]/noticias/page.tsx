import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { carregarSite, mapaMidias } from "@/lib/site";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { CardNoticia } from "@/components/site/noticias";

export const dynamic = "force-dynamic";
const POR_PAGINA = 12;

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  return site ? { title: `Notícias — ${site.orgao.nome}` } : {};
}

export default async function ListaNoticias({ params, searchParams }: Props) {
  const site = await carregarSite((await params).orgao);
  if (!site) notFound();
  const pagina = Math.max(1, Math.min(1000, Number((await searchParams).pagina) || 1));
  const filtro = { orgaoId: site.orgao.id, status: "PUBLICADA", publicadaEm: { lte: new Date() } };
  const [total, noticias] = await Promise.all([
    db.noticia.count({ where: filtro }),
    db.noticia.findMany({
      where: filtro,
      orderBy: { publicadaEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, slug: true, titulo: true, resumo: true, categoria: true, capaId: true, capaAlt: true, publicadaEm: true },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const midias = { ...site.midias, ...(await mapaMidias(noticias.flatMap((n) => (n.capaId ? [n.capaId] : [])), site.orgao.id)) };
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias, noticias: site.noticias };

  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <section className="section news-page">
        <div className="container">
          <header className="section__head section__head--wide">
            <h6><a href={`/${site.orgao.slug}`}>{site.orgao.sigla}</a></h6>
            <h1 className="news-page__title">Notícias</h1>
          </header>
          {noticias.length === 0
            ? <p className="news-empty">Nenhuma notícia publicada ainda.</p>
            : <div className="news-grid">{noticias.map((n) => <CardNoticia key={n.id} n={n} orgaoSlug={site.orgao.slug} midias={midias} />)}</div>}
          {paginas > 1 && (
            <nav className="news-pager" aria-label="Paginação">
              {pagina > 1 && <a className="btn btn--outline" href={`?pagina=${pagina - 1}`}>← Anteriores</a>}
              <span>Página {pagina} de {paginas}</span>
              {pagina < paginas && <a className="btn btn--outline" href={`?pagina=${pagina + 1}`}>Próximas →</a>}
            </nav>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
