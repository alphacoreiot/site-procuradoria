import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { FormDocumento } from "../FormDocumento";

export default async function NovoDocumento({ params }: { params: Promise<{ orgao: string }> }) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  const cats = await db.documento.findMany({ where: { orgaoId: orgao.id }, distinct: ["categoria"], select: { categoria: true } });
  return (
    <>
      <div className="adm-topo"><h1>Novo documento</h1></div>
      <FormDocumento
        orgao={orgao.slug}
        id={null}
        categorias={cats.map((c) => c.categoria).filter(Boolean)}
        inicial={{ tipo: "LEGISLACAO", titulo: "", descricao: "", categoria: "", linkExterno: "", data: new Date().toISOString().slice(0, 10), publicado: true, nomeArquivo: "" }}
      />
    </>
  );
}
