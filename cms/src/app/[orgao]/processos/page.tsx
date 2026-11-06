import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { carregarSite } from "@/lib/site";
import { normalizarBusca } from "@/lib/documentos-shared";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { Icone } from "@/components/site/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  return site ? { title: `Processos Digitais — ${site.orgao.sigla}` } : {};
}

export default async function Processos({ params, searchParams }: Props) {
  const site = await carregarSite((await params).orgao);
  if (!site) notFound();
  const q = String((await searchParams).q ?? "").slice(0, 100);
  const termos = normalizarBusca(q).split(" ").filter(Boolean).slice(0, 8);
  const lista = await db.processo.findMany({
    where: { orgaoId: site.orgao.id, publicado: true, AND: termos.map((t) => ({ busca: { contains: t } })) },
    orderBy: { titulo: "asc" },
    select: { id: true, slug: true, titulo: true },
  });
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };
  const base = `/${site.orgao.slug}/processos`;
  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <section className="section news-page">
        <div className="container">
          <header className="section__head section__head--wide">
            <h6><a href={`/${site.orgao.slug}`}>{site.orgao.sigla}</a></h6>
            <h1 className="news-page__title">Processos Digitais</h1>
            <p>Consulte os processos disponíveis e a documentação necessária para cada um.</p>
          </header>
          <form className="busca-doc" action={base} method="get" role="search">
            <label className="sr-only" htmlFor="busca-proc">Buscar processo</label>
            <Icone id="search" />
            <input id="busca-proc" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Buscar processo (ex.: ITIV, isenção, IPTU)" />
            <button className="btn btn--pill btn--sm" type="submit">Buscar</button>
          </form>
          <p className="doc-total" role="status">{lista.length === 1 ? "1 processo" : `${lista.length} processos`}{q ? ` para “${q}”` : ""}</p>
          {lista.length === 0
            ? <p className="news-empty">Nenhum processo encontrado.</p>
            : <ul className="proc-lista">{lista.map((p) => <li key={p.id}><a href={`${base}/${p.slug}`}>{p.titulo}<Icone id="arrow" /></a></li>)}</ul>}
        </div>
      </section>
    </SiteShell>
  );
}
