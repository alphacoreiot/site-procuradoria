import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import type { TipoDoc } from "@/lib/documentos-shared";
import { FormDocumento } from "../FormDocumento";

export default async function EditarDocumento({ params }: { params: Promise<{ orgao: string; id: string }> }) {
  const p = await params;
  const { orgao } = await orgaoDaPagina(p.orgao);
  const d = await db.documento.findFirst({ where: { id: p.id, orgaoId: orgao.id } });
  if (!d) notFound();
  const cats = await db.documento.findMany({ where: { orgaoId: orgao.id }, distinct: ["categoria"], select: { categoria: true } });
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Editar documento</h1>
          {d.observacao && <p className="sub">{d.observacao}</p>}
        </div>
      </div>
      <FormDocumento
        orgao={orgao.slug}
        id={d.id}
        categorias={cats.map((c) => c.categoria).filter(Boolean)}
        inicial={{ tipo: d.tipo as TipoDoc, titulo: d.titulo, descricao: d.descricao, categoria: d.categoria, linkExterno: d.linkExterno, data: d.data.toISOString().slice(0, 10), publicado: d.publicado, nomeArquivo: d.nomeArquivo }}
      />
    </>
  );
}
