import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { TIPOS_DOC, normalizarBusca, rotuloFormato, type TipoDoc } from "@/lib/documentos-shared";

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<{ tipo?: string; q?: string; situacao?: string; pagina?: string }> };
const POR_PAGINA = 50;
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia" });

export default async function ListaDocumentosAdmin({ params, searchParams }: Props) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  const s = await searchParams;
  const tipo = s.tipo === "LEGISLACAO" || s.tipo === "CONTEUDO" ? (s.tipo as TipoDoc) : undefined;
  const q = String(s.q ?? "").slice(0, 100);
  const rascunhos = s.situacao === "rascunho";
  const pagina = Math.max(1, Math.min(1000, Number(s.pagina) || 1));
  const filtro = {
    orgaoId: orgao.id,
    ...(tipo ? { tipo } : {}),
    ...(rascunhos ? { publicado: false } : {}),
    AND: normalizarBusca(q).split(" ").filter(Boolean).slice(0, 8).map((t) => ({ busca: { contains: t } })),
  };
  const [total, docs] = await Promise.all([
    db.documento.count({ where: filtro }),
    db.documento.findMany({ where: filtro, orderBy: { data: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (tipo) u.set("tipo", tipo);
    if (q) u.set("q", q);
    if (rascunhos) u.set("situacao", "rascunho");
    u.set("pagina", String(p));
    return `?${u}`;
  };
  return (
    <>
      <div className="adm-topo">
        <div><h1>Documentos</h1><p className="sub">{total} documento(s) de {orgao.sigla}.</p></div>
        <a className="bt bt--pri" href={`/admin/${orgao.slug}/documentos/novo`}>+ Novo documento</a>
      </div>
      <form className="card filtro-adm" method="get">
        <div className="campo"><label htmlFor="f-q">Buscar</label><input id="f-q" name="q" defaultValue={q} maxLength={100} /></div>
        <div className="campo">
          <label htmlFor="f-tipo">Área</label>
          <select id="f-tipo" name="tipo" defaultValue={tipo ?? ""}>
            <option value="">Todas</option>
            {Object.entries(TIPOS_DOC).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="f-sit">Situação</label>
          <select id="f-sit" name="situacao" defaultValue={rascunhos ? "rascunho" : ""}>
            <option value="">Todas</option>
            <option value="rascunho">Só não publicados</option>
          </select>
        </div>
        <button className="bt" type="submit">Filtrar</button>
      </form>
      <section className="card">
        <ul className="lista">
          {docs.map((d) => (
            <li key={d.id}>
              <div className="lista__info">
                <strong>{d.titulo}</strong>{" "}
                <span className={`tag ${d.publicado ? "tag--ok" : ""}`}>{d.publicado ? "Publicado" : "Não publicado"}</span>
                {!d.arquivo && !d.linkExterno && <> <span className="tag tag--off">Sem arquivo</span></>}
                <small>{TIPOS_DOC[d.tipo as TipoDoc] ?? d.tipo} · {d.categoria || "Sem categoria"} · {fmt.format(d.data)} · {d.arquivo ? rotuloFormato(d.mime) : d.linkExterno ? "Link" : "—"}</small>
                {d.observacao && <small>{d.observacao}</small>}
              </div>
              <div className="acoes"><a className="bt bt--pri bt--peq" href={`/admin/${orgao.slug}/documentos/${d.id}`}>Editar</a></div>
            </li>
          ))}
          {docs.length === 0 && <li className="sub">Nenhum documento encontrado.</li>}
        </ul>
        {paginas > 1 && (
          <p className="sub">
            {pagina > 1 && <><a href={qs(pagina - 1)}>← Anteriores</a> · </>}
            Página {pagina} de {paginas}
            {pagina < paginas && <> · <a href={qs(pagina + 1)}>Próximos →</a></>}
          </p>
        )}
      </section>
    </>
  );
}
