import { notFound } from "next/navigation";
import { carregarSite } from "@/lib/site";
import { buscarDocumentos } from "@/lib/documentos";
import { formatarBytes, rotuloFormato, type TipoDoc } from "@/lib/documentos-shared";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "./SiteShell";
import { Icone } from "./ui";
import { CorpoNoticia, dataNoticia } from "./noticias";

export type FiltrosDoc = { q?: string; categoria?: string; pagina?: string };

const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bahia" });

function linkFiltro(base: string, f: { q?: string; categoria?: string; pagina?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** Página pública de documentos com busca, filtro por categoria e paginação. */
export async function PaginaDocumentos({
  orgaoSlug, tipo, caminho, titulo, introducao, filtros,
}: {
  orgaoSlug: string;
  tipo: TipoDoc;
  caminho: string;
  titulo: string;
  introducao: string;
  filtros: FiltrosDoc;
}) {
  const site = await carregarSite(orgaoSlug);
  if (!site) notFound();
  const q = String(filtros.q ?? "").slice(0, 100);
  const categoria = String(filtros.categoria ?? "").slice(0, 60);
  const pagina = Math.max(1, Math.min(1000, Number(filtros.pagina) || 1));
  const { total, itens, categorias, paginas } = await buscarDocumentos(site.orgao.id, tipo, q, categoria, pagina);
  const base = `/${site.orgao.slug}/${caminho}`;
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };

  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <section className="section news-page">
        <div className="container">
          <header className="section__head section__head--wide">
            <h6><a href={`/${site.orgao.slug}`}>{site.orgao.sigla}</a></h6>
            <h1 className="news-page__title">{titulo}</h1>
            <p>{introducao}</p>
          </header>

          <form className="busca-doc" action={base} method="get" role="search">
            <label className="sr-only" htmlFor="busca-doc">Buscar por título ou assunto</label>
            <Icone id="search" />
            <input id="busca-doc" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Buscar por título ou assunto" />
            {categoria && <input type="hidden" name="categoria" value={categoria} />}
            <button className="btn btn--pill btn--sm" type="submit">Buscar</button>
          </form>

          {categorias.length > 1 && (
            <nav className="filtros-doc" aria-label="Filtrar por categoria">
              <a href={linkFiltro(base, { q })} aria-current={!categoria ? "true" : undefined}>Todas</a>
              {categorias.map((c) => (
                <a key={c.nome} href={linkFiltro(base, { q, categoria: c.nome })} aria-current={categoria === c.nome ? "true" : undefined}>
                  {c.nome} <span>{c.total}</span>
                </a>
              ))}
            </nav>
          )}

          <p className="doc-total" role="status">{total === 1 ? "1 documento" : `${total} documentos`}{q ? ` para “${q}”` : ""}</p>

          {itens.length === 0
            ? <p className="news-empty">Nenhum documento encontrado. Tente outras palavras ou limpe o filtro.</p>
            : (
              <ul className="doc-lista">
                {itens.map((d) => {
                  const href = d.arquivo ? `/doc/${d.id}` : d.linkExterno;
                  const externo = !d.arquivo;
                  return (
                    <li key={d.id}>
                      <a className="doc-item" href={href} {...(externo || d.mime === "application/pdf" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        <span className="doc-item__formato">{d.arquivo ? rotuloFormato(d.mime) : "LINK"}</span>
                        <span className="doc-item__texto">
                          <strong>{d.titulo}</strong>
                          {d.descricao && <span className="doc-item__desc">{d.descricao}</span>}
                          <small>
                            {d.categoria && <>{d.categoria} · </>}
                            {dataCurta.format(d.data)}
                            {d.bytes > 0 && <> · {formatarBytes(d.bytes)}</>}
                          </small>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}

          {paginas > 1 && (
            <nav className="news-pager" aria-label="Paginação">
              {pagina > 1 && <a className="btn btn--outline" href={linkFiltro(base, { q, categoria, pagina: pagina - 1 })}>← Anteriores</a>}
              <span>Página {pagina} de {paginas}</span>
              {pagina < paginas && <a className="btn btn--outline" href={linkFiltro(base, { q, categoria, pagina: pagina + 1 })}>Próximas →</a>}
            </nav>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

/** Moldura de uma página interna (título + texto em Markdown). */
export async function MolduraTexto({
  orgaoSlug, titulo, markdown, children, alteradaEm, voltar, depois,
}: {
  depois?: React.ReactNode; // componentes em largura total, depois do texto
  orgaoSlug: string;
  titulo: string;
  markdown?: string;
  children?: React.ReactNode;
  alteradaEm?: Date;
  voltar?: { href: string; texto: string };
}) {
  const site = await carregarSite(orgaoSlug);
  if (!site) notFound();
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };
  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <section className="section news-page">
        <div className="container container--texto">
          <header className="section__head section__head--wide">
            <h6><a href={voltar?.href ?? `/${site.orgao.slug}`}>{voltar?.texto ?? site.orgao.sigla}</a></h6>
            <h1 className="news-page__title">{titulo}</h1>
          </header>
          {markdown && <CorpoNoticia markdown={markdown} />}
          {children}
          {alteradaEm && <p className="pagina-rodape">Atualizada em {dataNoticia(alteradaEm)}.</p>}
        </div>
      </section>
      {depois}
    </SiteShell>
  );
}
