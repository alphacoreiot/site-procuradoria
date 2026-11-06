import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";

export default async function ListaPaginasAdmin({ params }: { params: Promise<{ orgao: string }> }) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  const paginas = await db.pagina.findMany({ where: { orgaoId: orgao.id, slug: { not: "inicio" } }, orderBy: { titulo: "asc" } });
  return (
    <>
      <div className="adm-topo">
        <div><h1>Páginas de conteúdo</h1><p className="sub">{paginas.length} página(s). A página inicial é editada em “Página e componentes”.</p></div>
        <a className="bt bt--pri" href={`/admin/${orgao.slug}/paginas/nova`}>+ Nova página</a>
      </div>
      <section className="card">
        <ul className="lista">
          {paginas.map((p) => (
            <li key={p.id}>
              <div className="lista__info">
                <strong>{p.titulo}</strong> <span className={`tag ${p.publicada ? "tag--ok" : ""}`}>{p.publicada ? "Publicada" : "Rascunho"}</span>
                <small>/{orgao.slug}/{p.slug}</small>
              </div>
              <div className="acoes">
                <a className="bt bt--pri bt--peq" href={`/admin/${orgao.slug}/paginas/${p.id}`}>Editar</a>
                {p.publicada && <a className="bt bt--peq" href={`/${orgao.slug}/${p.slug}`} target="_blank" rel="noopener noreferrer">Ver ↗</a>}
              </div>
            </li>
          ))}
          {paginas.length === 0 && <li className="sub">Nenhuma página ainda.</li>}
        </ul>
      </section>
    </>
  );
}
