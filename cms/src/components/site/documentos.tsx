import { notFound } from "next/navigation";
import { carregarSite } from "@/lib/site";
import { buscarDocumentos, documentosDaArea } from "@/lib/documentos";
import { CATEGORIAS_CENTRAL, organizarCentral } from "@/lib/central";
import { formatarBytes, rotuloFormato, type TipoDoc } from "@/lib/documentos-shared";
import { fraseAmigavel } from "@/lib/texto";
import type { EntradaIndice } from "@/lib/conteudo";
import type { Ctx } from "@/blocks/render";
import { SiteShell } from "./SiteShell";
import { Icone } from "./ui";
import { AcoesCompartilhar, CabecalhoPagina, LateralPagina, ProximosPassos, type Trilha } from "./pagina";
import { Abas, LinhaFiltro } from "./abas";
import { CentralOrganizada } from "./central";

export type FiltrosDoc = { q?: string; categoria?: string; pagina?: string; ano?: string; ordem?: string };

const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bahia" });

function linkFiltro(base: string, f: { q?: string; categoria?: string; pagina?: number; ano?: string; ordem?: string }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.ano) p.set("ano", f.ano);
  if (f.ordem && f.ordem !== "recentes") p.set("ordem", f.ordem);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** Página pública de documentos com busca, filtro por categoria e paginação. */
export async function PaginaDocumentos({
  orgaoSlug, tipo, caminho, titulo, introducao, filtros, destaque, organizada = false,
}: {
  orgaoSlug: string;
  tipo: TipoDoc;
  caminho: string;
  titulo: string;
  introducao: string;
  filtros: FiltrosDoc;
  destaque?: string; // categoria cujo documento mais recente fica em evidência
  organizada?: boolean; // sem busca nem ano, mostra por categoria e em séries
}) {
  const site = await carregarSite(orgaoSlug);
  if (!site) notFound();
  const q = String(filtros.q ?? "").slice(0, 100);
  const categoria = String(filtros.categoria ?? "").slice(0, 60);
  const pagina = Math.max(1, Math.min(1000, Number(filtros.pagina) || 1));
  const ano = /^\d{4}$/.test(String(filtros.ano)) ? String(filtros.ano) : "";
  const ordem = filtros.ordem === "antigos" || filtros.ordem === "titulo" ? filtros.ordem : "recentes";
  const { total, todas, itens, categorias, paginas, anos, emDestaque } = await buscarDocumentos(site.orgao.id, tipo, q, categoria, pagina, ano, ordem, destaque);
  const manter = { q, categoria, ano, ordem };
  const semFiltro = !q && !categoria && !ano && pagina === 1;
  const secoes = organizada && !q && !ano ? organizarCentral(await documentosDaArea(site.orgao.id, tipo), categoria) : null;
  const ordemCat = (n: string) => { const i = CATEGORIAS_CENTRAL.findIndex((c) => c.nome === n); return i < 0 ? 99 : i; };
  const abas = organizada ? [...categorias].sort((a, b) => ordemCat(a.nome) - ordemCat(b.nome)) : categorias;
  const base = `/${site.orgao.slug}/${caminho}`;
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };

  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <CabecalhoPagina trilha={[{ href: `/${site.orgao.slug}`, texto: "Início" }, { texto: titulo }]} titulo={titulo} texto={introducao}>
        <form className="busca-doc" action={base} method="get" role="search">
          <label className="sr-only" htmlFor="busca-doc">Buscar por título ou assunto</label>
          <Icone id="search" />
          <input id="busca-doc" type="search" name="q" defaultValue={q} maxLength={100} placeholder="Buscar por título ou assunto" />
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          {ano && <input type="hidden" name="ano" value={ano} />}
          <button className="btn btn--pill btn--sm" type="submit">Buscar</button>
        </form>
      </CabecalhoPagina>

      <section className="pag-corpo">
        <div className="container">
          {categorias.length > 1 && (
            <Abas
              rotulo="Filtrar por categoria"
              itens={[
                { href: linkFiltro(base, { ...manter, categoria: "" }), texto: "Todas", total: todas, ativo: !categoria },
                ...abas.map((c) => ({ href: linkFiltro(base, { ...manter, categoria: c.nome }), texto: c.nome, total: c.total, ativo: categoria === c.nome })),
              ]}
            />
          )}
          <div className="doc-resultados">
            {semFiltro && emDestaque && (
              <a className="doc-destaque" href={`/doc/${emDestaque.id}`} target="_blank" rel="noopener noreferrer">
                <span>
                  <small>{emDestaque.categoria}</small>
                  <strong>{fraseAmigavel(emDestaque.titulo)}</strong>
                </span>
                <span className="pag-bt">Abrir documento<Icone id="arrow" /></span>
              </a>
            )}
            <div className="flt-painel">
              <LinhaFiltro rotulo="Ano" itens={[{ href: linkFiltro(base, { ...manter, ano: "" }), texto: "Todos", ativo: !ano }, ...anos.map((x) => ({ href: linkFiltro(base, { ...manter, ano: String(x) }), texto: String(x), ativo: ano === String(x) }))]} />
              {!secoes && <LinhaFiltro rotulo="Ordem" itens={[["recentes", "Mais recentes"], ["antigos", "Mais antigos"], ["titulo", "Título (A–Z)"]].map(([v, t]) => ({ href: linkFiltro(base, { ...manter, ordem: v }), texto: t, ativo: ordem === v }))} />}
            </div>
            <div className="res-barra">
              <p className="doc-total" role="status">
                <strong>{total === 1 ? "1 documento" : `${total} documentos`}</strong>
                {q ? ` para “${q}”` : ""}{categoria ? ` em ${categoria}` : ""}{ano ? ` de ${ano}` : ""}
                {(q || categoria || ano) && <a href={base}>Limpar filtros</a>}
              </p>
            </div>
            {secoes ? <CentralOrganizada secoes={secoes} /> : itens.length === 0
              ? <p className="news-empty">Nenhum documento encontrado. Tente outras palavras ou limpe os filtros.</p>
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
                            <strong>{fraseAmigavel(d.titulo)}</strong>
                            {d.descricao && d.descricao !== d.titulo && <span className="doc-item__desc">{d.descricao}</span>}
                            <small>
                              {d.categoria && <>{d.categoria} · </>}
                              {d.ano ?? dataCurta.format(d.data)}
                              {d.bytes > 0 && <> · {formatarBytes(d.bytes)}</>}
                            </small>
                          </span>
                          <span className="doc-item__acao">{!d.arquivo ? "Abrir" : d.mime === "application/pdf" ? "Abrir PDF" : "Baixar"}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            {!secoes && paginas > 1 && (
              <nav className="news-pager" aria-label="Paginação">
                {pagina > 1 && <a className="btn btn--outline" href={linkFiltro(base, { ...manter, pagina: pagina - 1 })}>← Anteriores</a>}
                <span>Página {pagina} de {paginas}</span>
                {pagina < paginas && <a className="btn btn--outline" href={linkFiltro(base, { ...manter, pagina: pagina + 1 })}>Próximas →</a>}
              </nav>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

/** Moldura de uma página interna: abertura, conteúdo e coluna lateral. */
export async function MolduraTexto({
  orgaoSlug, titulo, texto, capa, cta, trilha, children, indice, lateral = true, larga = false, depois, acoesTopo, compartilhar = true,
}: {
  orgaoSlug: string;
  titulo: string;
  texto?: string;
  capa?: { src: string; alt: string } | null;
  cta?: { texto: string; url: string } | null;
  acoesTopo?: React.ReactNode;
  compartilhar?: boolean;
  trilha?: Trilha;
  children?: React.ReactNode;
  indice?: EntradaIndice[];
  lateral?: boolean;
  larga?: boolean;
  depois?: React.ReactNode; // componentes em largura total, depois do texto
}) {
  const site = await carregarSite(orgaoSlug);
  if (!site) notFound();
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };
  const inicio = { href: `/${site.orgao.slug}`, texto: "Início" };
  const contato = site.blocos.find((b) => b.tipo === "contato")?.dados;
  const rodape = site.blocos.find((b) => b.tipo === "rodape")?.dados as { links?: { rotulo: string; url: string }[] } | undefined;
  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      <CabecalhoPagina trilha={[inicio, ...(trilha ?? []), { texto: titulo }]} titulo={titulo} texto={texto} capa={capa} cta={cta}>{acoesTopo}</CabecalhoPagina>
      <section className="pag-corpo" data-pagina>
        <div className={`container pag-grade${larga ? " pag-grade--larga" : lateral ? "" : " pag-grade--unica"}`}>
          <div className="pag-texto">
            {children}
            {compartilhar && <div className="noticia-rodape"><p>Compartilhe esta página</p><AcoesCompartilhar imprimir /></div>}
          </div>
          {lateral && <LateralPagina indice={indice} contato={contato} whatsapp={Boolean(site.config.whatsappNumero)} atendimento={`/${site.orgao.slug}#fale-conosco`} />}
        </div>
      </section>
      {depois}
      <ProximosPassos links={rodape?.links ?? []} atual={`/${site.orgao.slug}`} />
    </SiteShell>
  );
}
