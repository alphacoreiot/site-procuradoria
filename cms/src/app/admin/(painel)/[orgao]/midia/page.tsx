import { orgaoDaPagina } from "@/lib/auth";
import { listarMidias } from "../../../acoes/midia";
import { GerenciarMidia } from "./GerenciarMidia";

type Props = { params: Promise<{ orgao: string }> };

export default async function Midia({ params }: Props) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  const itens = await listarMidias(orgao.slug);
  return (
    <>
      <h1>Mídia</h1>
      <p className="sub">
        Imagens de {orgao.sigla}. Toda imagem enviada é verificada, otimizada (WebP, sem metadados) e recortada automaticamente
        na proporção de cada lugar do site. Clique numa imagem para editar a descrição e o <strong>ponto focal</strong> (o centro dos recortes).
      </p>
      <GerenciarMidia orgao={orgao.slug} inicial={itens} />
    </>
  );
}
