import type { Metadata } from "next";
import { carregarSite } from "@/lib/site";
import { PaginaDocumentos, type FiltrosDoc } from "@/components/site/documentos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<FiltrosDoc> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  return site ? { title: `Central de Conteúdo — ${site.orgao.sigla}` } : {};
}

export default async function CentralDeConteudo({ params, searchParams }: Props) {
  return (
    <PaginaDocumentos
      orgaoSlug={(await params).orgao}
      tipo="CONTEUDO"
      caminho="central-de-conteudo"
      titulo="Central de Conteúdo"
      introducao="Modelos de documentos, manuais, guias, formulários, publicações e materiais de apoio."
      filtros={await searchParams}
    />
  );
}
