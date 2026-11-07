import { Icone } from "@/components/site/ui";
import { Abas, LinhaFiltro } from "@/components/site/abas";

export type FiltrosN = { q?: string; tipo?: string; tema?: string; ano?: string; autor?: string };

export function linkNoticias(base: string, f: FiltrosN & { pagina?: number }) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.tema) p.set("tema", f.tema);
  if (f.ano) p.set("ano", f.ano);
  if (f.autor) p.set("autor", f.autor);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

export function BuscaNoticias({ base, f }: { base: string; f: FiltrosN }) {
  return (
    <form className="busca-doc" action={base} method="get" role="search">
      <label className="sr-only" htmlFor="busca-not">Buscar notícias</label>
      <Icone id="search" />
      <input id="busca-not" type="search" name="q" defaultValue={f.q} maxLength={100} placeholder="Buscar por assunto, tributo ou palavra" />
      {f.tipo && <input type="hidden" name="tipo" value={f.tipo} />}
      {f.tema && <input type="hidden" name="tema" value={f.tema} />}
      {f.ano && <input type="hidden" name="ano" value={f.ano} />}
      {f.autor && <input type="hidden" name="autor" value={f.autor} />}
      <button className="btn btn--pill btn--sm" type="submit">Buscar</button>
    </form>
  );
}

/** Tipos em abas; assunto, autor e ano com todas as opções à vista. */
export function FiltrosNoticias({ base, f, tipos, temas, autores, anos, total }: {
  base: string;
  f: FiltrosN;
  tipos: { nome: string; total: number }[];
  temas: { nome: string; total: number }[];
  autores: { nome: string; total: number }[];
  anos: number[];
  total: number;
}) {
  const ativos = f.q || f.tipo || f.tema || f.ano || f.autor;
  return (
    <>
      <Abas rotulo="Filtrar por tipo" itens={[{ href: linkNoticias(base, { ...f, tipo: "" }), texto: "Todas", total: tipos.reduce((s, t) => s + t.total, 0), ativo: !f.tipo }, ...tipos.map((t) => ({ href: linkNoticias(base, { ...f, tipo: t.nome }), texto: t.nome, total: t.total, ativo: f.tipo === t.nome }))]} />
      <div className="flt-painel">
        <LinhaFiltro rotulo="Assunto" itens={[{ href: linkNoticias(base, { ...f, tema: "" }), texto: "Todos", ativo: !f.tema }, ...temas.map((t) => ({ href: linkNoticias(base, { ...f, tema: t.nome }), texto: t.nome, total: t.total, ativo: f.tema === t.nome }))]} />
        <LinhaFiltro rotulo="Autor" itens={[{ href: linkNoticias(base, { ...f, autor: "" }), texto: "Todos", ativo: !f.autor }, ...autores.map((t) => ({ href: linkNoticias(base, { ...f, autor: t.nome }), texto: t.nome, total: t.total, ativo: f.autor === t.nome }))]} />
        <LinhaFiltro rotulo="Ano" itens={[{ href: linkNoticias(base, { ...f, ano: "" }), texto: "Todos", ativo: !f.ano }, ...anos.map((a) => ({ href: linkNoticias(base, { ...f, ano: String(a) }), texto: String(a), ativo: f.ano === String(a) }))]} />
      </div>
      <div className="res-barra">
        <p className="doc-total" role="status">
          <strong>{total === 1 ? "1 notícia" : `${total} notícias`}</strong>
          {f.q ? ` para “${f.q}”` : ""}
          {ativos && <a href={base}>Limpar filtros</a>}
        </p>
      </div>
    </>
  );
}
