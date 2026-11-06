import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";

export default async function ListaProcessosAdmin({ params }: { params: Promise<{ orgao: string }> }) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  const processos = await db.processo.findMany({ where: { orgaoId: orgao.id }, orderBy: { titulo: "asc" } });
  return (
    <>
      <div className="adm-topo">
        <div><h1>Processos digitais</h1><p className="sub">{processos.length} processo(s) de {orgao.sigla}.</p></div>
        <a className="bt bt--pri" href={`/admin/${orgao.slug}/processos/novo`}>+ Novo processo</a>
      </div>
      <section className="card">
        <ul className="lista">
          {processos.map((p) => (
            <li key={p.id}>
              <div className="lista__info">
                <strong>{p.titulo}</strong> <span className={`tag ${p.publicado ? "tag--ok" : ""}`}>{p.publicado ? "Publicado" : "Rascunho"}</span>
              </div>
              <div className="acoes"><a className="bt bt--pri bt--peq" href={`/admin/${orgao.slug}/processos/${p.id}`}>Editar</a></div>
            </li>
          ))}
          {processos.length === 0 && <li className="sub">Nenhum processo ainda.</li>}
        </ul>
      </section>
    </>
  );
}
