import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { carregarSite } from "@/lib/site";
import { normalizarBusca } from "@/lib/documentos-shared";
import { fraseAmigavel } from "@/lib/texto";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { CabecalhoPagina } from "@/components/site/pagina";
import { Abas } from "@/components/site/abas";
import { Icone } from "@/components/site/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<{ q?: string; tema?: string }> };

/** Atalhos de tema: só aparecem os que têm algum processo. */
const TEMAS = ["ITIV", "IPTU", "ISS", "TFF", "COSIP", "Isenção", "Certidão", "Inscrição", "Cadastro", "Cancelamento"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  return site ? { title: `Processos Digitais — ${site.orgao.sigla}` } : {};
}

export default async function Processos({ params, searchParams }: Props) {
  const site = await carregarSite((await params).orgao);
  if (!site) notFound();
  const sp = await searchParams;
  const q = String(sp.q ?? "").slice(0, 100);
  const tema = TEMAS.includes(String(sp.tema)) ? String(sp.tema) : "";
  const termos = normalizarBusca(`${q} ${tema}`).split(" ").filter(Boolean).slice(0, 8);
  const base = { orgaoId: site.orgao.id, publicado: true };
  const [lista, todos] = await Promise.all([
    db.processo.findMany({ where: { ...base, AND: termos.map((t) => ({ busca: { contains: t } })) }, orderBy: { titulo: "asc" }, select: { id: true, slug: true, titulo: true } }),
    db.processo.findMany({ where: base, select: { busca: true } }),
  ]);
  const temas = TEMAS.map((t) => ({ t, n: todos.filter((p) => p.busca.includes(normalizarBusca(t))).length })).filter((x) => x.n > 0);
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };
  const url = `/${site.orgao.slug}/processos`;
  const link = (t: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("tema", t);
    const s = p.toString();
    return s ? `${url}?${s}` : url;
  };
  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <CabecalhoPagina
        trilha={[{ href: `/${site.orgao.slug}`, texto: "Início" }, { texto: "Processos Digitais" }]}
        titulo="Processos Digitais"
        texto="Encontre o seu processo e veja quais documentos separar antes de começar."
      >
        <form className="busca-doc" action={url} method="get" role="search">
          <label className="sr-only" htmlFor="busca-proc">Buscar processo</label>
          <Icone id="search" />
          <input id="busca-proc" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Ex.: reavaliação, isenção, restituição" />
          {tema && <input type="hidden" name="tema" value={tema} />}
          <button className="btn btn--pill btn--sm" type="submit">Buscar</button>
        </form>
      </CabecalhoPagina>
      <section className="pag-corpo">
        <div className="container">
          {temas.length > 1 && (
            <Abas rotulo="Filtrar por tema" itens={[{ href: link(""), texto: "Todos", total: todos.length, ativo: !tema }, ...temas.map((x) => ({ href: link(x.t), texto: x.t, total: x.n, ativo: tema === x.t }))]} />
          )}
          <p className="doc-total" role="status">
            <strong>{lista.length === 1 ? "1 processo" : `${lista.length} processos`}</strong>
            {q ? ` para “${q}”` : ""}{tema ? ` em ${tema}` : ""}
            {(q || tema) && <a href={url}>Limpar filtros</a>}
          </p>
          {lista.length === 0
            ? <p className="news-empty">Nenhum processo encontrado. Tente outras palavras ou limpe os filtros.</p>
            : <ul className="proc-lista">{lista.map((p) => <li key={p.id}><a href={`${url}/${p.slug}`}><span>{fraseAmigavel(p.titulo)}</span><Icone id="arrow" /></a></li>)}</ul>}
        </div>
      </section>
    </SiteShell>
  );
}
