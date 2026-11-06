import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { BLOCOS_POR_TIPO } from "@/blocks/specs";
import { FormPagina } from "../FormPagina";

export default async function EditarPagina({ params }: { params: Promise<{ orgao: string; id: string }> }) {
  const p = await params;
  const { usuario, orgao } = await orgaoDaPagina(p.orgao);
  const d = await db.pagina.findFirst({ where: { id: p.id, orgaoId: orgao.id, slug: { not: "inicio" } }, include: { blocos: { orderBy: { ordem: "asc" } } } });
  if (!d) notFound();
  return (
    <>
      <div className="adm-topo"><h1>Editar página</h1></div>
      {d.blocos.length > 0 && (
        <section className="card">
          <h2>Componentes desta página</h2>
          <ul className="lista">
            {d.blocos.map((b) => (
              <li key={b.id}>
                <div className="lista__info"><strong>{BLOCOS_POR_TIPO[b.tipo]?.nome ?? b.tipo}</strong></div>
                <div className="acoes"><a className="bt bt--pri bt--peq" href={`/admin/${orgao.slug}/bloco/${b.id}`}>Editar</a></div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <FormPagina orgao={orgao.slug} id={d.id} podeExcluir={usuario.papel !== "EDITOR"} inicial={{ titulo: d.titulo, slug: d.slug, descricaoSeo: d.descricaoSeo, conteudo: d.conteudo, publicada: d.publicada }} />
    </>
  );
}
