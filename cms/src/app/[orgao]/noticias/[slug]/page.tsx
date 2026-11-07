import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { carregarSite, mapaMidias } from "@/lib/site";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { CorpoNoticia, dataNoticia } from "@/components/site/noticias";
import { Icone, Img } from "@/components/site/ui";
import { CabecalhoPagina, AcoesCompartilhar, LateralPagina } from "@/components/site/pagina";
import { noticiasRelacionadas, vizinhas } from "@/lib/noticias";
import { CardNoticia } from "@/components/site/noticias";
import { tempoLeitura } from "@/lib/noticias-shared";
import { urlMidia } from "@/lib/media-shared";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string; slug: string }> };

const buscar = cache(async (orgaoSlug: string, slug: string) => {
  const site = await carregarSite(orgaoSlug);
  if (!site || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const noticia = await db.noticia.findUnique({
    where: { orgaoId_slug: { orgaoId: site.orgao.id, slug } },
  });
  if (!noticia || noticia.status !== "PUBLICADA" || !noticia.publicadaEm || noticia.publicadaEm > new Date()) return null;
  return { site, noticia };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgao, slug } = await params;
  const r = await buscar(orgao, slug);
  if (!r) return {};
  return {
    title: `${r.noticia.titulo} — ${r.site.orgao.sigla}`,
    description: r.noticia.resumo,
    openGraph: {
      title: r.noticia.titulo,
      description: r.noticia.resumo,
      type: "article",
      images: r.noticia.capaId ? [urlMidia(r.noticia.capaId, 1280, "16x9")] : undefined,
    },
  };
}

export default async function PaginaNoticia({ params }: Props) {
  const { orgao, slug } = await params;
  const r = await buscar(orgao, slug);
  if (!r) notFound();
  const { site, noticia: n } = r;
  const midias = { ...site.midias, ...(await mapaMidias(n.capaId ? [n.capaId] : [], site.orgao.id)) };
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias, noticias: site.noticias };

  if (site.config.visualModerno) {
    const base = `/${site.orgao.slug}/noticias`;
    const rel = await noticiasRelacionadas(n);
    const viz = await vizinhas(site.orgao.id, n.publicadaEm!);
    const midiasRel = { ...midias, ...(await mapaMidias(rel.flatMap((x) => (x.capaId ? [x.capaId] : [])), site.orgao.id)) };
    const temTema = n.categoria && n.categoria !== "Geral";
    const contato = site.blocos.find((b) => b.tipo === "contato")?.dados;
    return (
      <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
        <div className="leitura-barra" data-leitura-barra aria-hidden="true" />
        <CabecalhoPagina trilha={[{ href: `/${site.orgao.slug}`, texto: "Início" }, { href: base, texto: "Notícias" }, { texto: n.tipo || "Notícia" }]} titulo={n.titulo} chamada={n.chamada}>
          <p className="noticia-selos">
            {n.tipo && <a className="selo" href={`${base}?tipo=${encodeURIComponent(n.tipo)}`}>{n.tipo}</a>}
            {temTema && <a className="selo selo--tema" href={`${base}?tema=${encodeURIComponent(n.categoria)}`}>{n.categoria}</a>}
          </p>
          <p className="noticia-meta">
            {n.autorNome && <a href={`${base}?autor=${encodeURIComponent(n.autorNome)}`}>Por <strong>{n.autorNome}</strong></a>}
            {n.publicadaEm && <time dateTime={n.publicadaEm.toISOString()}>{dataNoticia(n.publicadaEm)}</time>}
            <span>{tempoLeitura(n.conteudo)} min de leitura</span>
          </p>
        </CabecalhoPagina>
        <section className="pag-corpo" data-pagina>
          <div className="container pag-grade">
            <article className="pag-texto" data-leitura>
              {n.capaId && (
                <figure className="noticia-capa">
                  <Img valor={{ id: n.capaId, alt: n.capaAlt }} midias={midias} proporcao="16x9" larguras={[800, 1280, 1920]} sizes="(max-width: 900px) 100vw, 800px" prioridade />
                </figure>
              )}
              <CorpoNoticia markdown={n.conteudo} />
              <div className="noticia-rodape">
                <p>Compartilhe esta notícia</p>
                <AcoesCompartilhar />
              </div>
              {(viz.anterior || viz.proxima) && (
                <nav className="noticia-nav" aria-label="Outras notícias">
                  {viz.anterior && <a href={`${base}/${viz.anterior.slug}`}><small>← Anterior</small><span>{viz.anterior.titulo}</span></a>}
                  {viz.proxima && <a className="proxima" href={`${base}/${viz.proxima.slug}`}><small>Próxima →</small><span>{viz.proxima.titulo}</span></a>}
                </nav>
              )}
            </article>
            <LateralPagina contato={contato} whatsapp={Boolean(site.config.whatsappNumero)} atendimento={`/${site.orgao.slug}#fale-conosco`} />
          </div>
        </section>
        {rel.length > 0 && (
          <section className="rel" aria-labelledby="rel-titulo">
            <div className="container">
              <div className="rel__topo">
                <h2 id="rel-titulo">Notícias relacionadas</h2>
                <a className="pag-bt pag-bt--mudo" href={temTema ? `${base}?tema=${encodeURIComponent(n.categoria)}` : base}>{temTema ? `Mais sobre ${n.categoria}` : "Todas as notícias"}<Icone id="arrow" /></a>
              </div>
              <div className="rel-grade">{rel.map((x) => <CardNoticia key={x.id} n={x} orgaoSlug={site.orgao.slug} midias={midiasRel} />)}</div>
            </div>
          </section>
        )}
      </SiteShell>
    );
  }

  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <article className="section news-article">
        <div className="container news-article__inner">
          <p className="news-article__back"><a href={`/${site.orgao.slug}/noticias`}>← Todas as notícias</a></p>
          <p className="news-card__meta">
            {n.categoria && <span className="news-card__cat">{n.categoria}</span>}
            {n.publicadaEm && <time dateTime={n.publicadaEm.toISOString()}>{dataNoticia(n.publicadaEm)}</time>}
          </p>
          <h1 className="news-article__title">{n.titulo}</h1>
          <p className="news-article__lead">{n.resumo}</p>
          {n.capaId && (
            <figure className="news-article__cover">
              <Img valor={{ id: n.capaId, alt: n.capaAlt }} midias={midias} proporcao="16x9" larguras={[800, 1280, 1920]} sizes="(max-width: 900px) 100vw, 860px" prioridade />
            </figure>
          )}
          <CorpoNoticia markdown={n.conteudo} />
        </div>
      </article>
    </SiteShell>
  );
}
