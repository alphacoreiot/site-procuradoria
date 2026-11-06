import { orgaoDaPagina } from "@/lib/auth";
import { FormPagina } from "../FormPagina";

export default async function NovaPagina({ params }: { params: Promise<{ orgao: string }> }) {
  const { usuario, orgao } = await orgaoDaPagina((await params).orgao);
  return (
    <>
      <div className="adm-topo"><h1>Nova página</h1></div>
      <FormPagina orgao={orgao.slug} id={null} podeExcluir={usuario.papel !== "EDITOR"} inicial={{ titulo: "", slug: "", descricaoSeo: "", conteudo: "", publicada: true }} />
    </>
  );
}
