import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { dataNoticia } from "@/components/site/noticias";

type Props = { params: Promise<{ orgao: string }> };

export default async function ListaNoticiasAdmin({ params }: Props) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  const noticias = await db.noticia.findMany({
    where: { orgaoId: orgao.id },
    orderBy: [{ status: "asc" }, { publicadaEm: "desc" }, { alteradaEm: "desc" }],
    take: 200,
    include: { autor: { select: { nome: true } } },
  });
  const agora = new Date();
  return (
    <>
      <div className="adm-topo">
        <div><h1>Notícias</h1><p className="sub">{noticias.length} notícia(s) de {orgao.sigla}.</p></div>
        <a className="bt bt--pri" href={`/admin/${orgao.slug}/noticias/nova`}>+ Nova notícia</a>
      </div>
      <section className="card">
        <ul className="lista">
          {noticias.map((n) => {
            const agendada = n.status === "PUBLICADA" && n.publicadaEm && n.publicadaEm > agora;
            return (
              <li key={n.id}>
                <div className="lista__info">
                  <strong>{n.titulo}</strong>{" "}
                  <span className={`tag ${n.status === "PUBLICADA" ? (agendada ? "tag--roxo" : "tag--ok") : ""}`}>{n.status === "PUBLICADA" ? (agendada ? "Agendada" : "Publicada") : "Rascunho"}</span>
                  {n.destaque && <> <span className="tag tag--roxo">Destaque</span></>}
                  <small>{n.publicadaEm ? dataNoticia(n.publicadaEm) : "Sem data"} · {n.categoria || "Sem categoria"} · {n.autor?.nome ?? "—"}</small>
                </div>
                <div className="acoes">
                  <a className="bt bt--pri bt--peq" href={`/admin/${orgao.slug}/noticias/${n.id}`}>Editar</a>
                  {n.status === "PUBLICADA" && !agendada && <a className="bt bt--peq" href={`/${orgao.slug}/noticias/${n.slug}`} target="_blank" rel="noopener noreferrer">Ver ↗</a>}
                </div>
              </li>
            );
          })}
          {noticias.length === 0 && <li className="sub">Nenhuma notícia ainda.</li>}
        </ul>
      </section>
    </>
  );
}
