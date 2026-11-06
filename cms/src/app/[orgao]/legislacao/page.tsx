import type { Metadata } from "next";
import { carregarSite } from "@/lib/site";
import { PaginaDocumentos, type FiltrosDoc } from "@/components/site/documentos";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string }>; searchParams: Promise<FiltrosDoc> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  return site ? { title: `Legislação — ${site.orgao.sigla}` } : {};
}

export default async function Legislacao({ params, searchParams }: Props) {
  return (
    <PaginaDocumentos
      orgaoSlug={(await params).orgao}
      tipo="LEGISLACAO"
      caminho="legislacao"
      titulo="Legislação"
      introducao="Código tributário, leis, decretos, portarias, instruções normativas e demais atos."
      filtros={await searchParams}
    />
  );
}
