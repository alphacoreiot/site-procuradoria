import { orgaoDaPagina } from "@/lib/auth";
import { FormNoticia } from "../FormNoticia";

type Props = { params: Promise<{ orgao: string }> };

export default async function NovaNoticia({ params }: Props) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  return (
    <>
      <p className="sub" style={{ marginBottom: 6 }}><a href={`/admin/${orgao.slug}/noticias`}>← Notícias</a></p>
      <h1>Nova notícia</h1>
      <p className="sub">Salve como rascunho para revisar antes de publicar.</p>
      <FormNoticia orgao={orgao.slug} id={null} inicial={{ titulo: "", slug: "", resumo: "", conteudo: "", categoria: "", capaId: "", capaAlt: "", destaque: false, status: "RASCUNHO", publicadaEm: "" }} />
    </>
  );
}
