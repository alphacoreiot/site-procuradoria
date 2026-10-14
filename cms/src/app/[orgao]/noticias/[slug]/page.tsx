import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { carregarSite, mapaMidias } from "@/lib/site";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { CorpoNoticia, dataNoticia } from "@/components/site/noticias";
import { Img } from "@/components/site/ui";
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
