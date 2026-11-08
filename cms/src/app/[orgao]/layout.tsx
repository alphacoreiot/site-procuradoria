import type { Metadata } from "next";
import { carregarSite } from "@/lib/site";
import { urlMidia } from "@/lib/media-shared";

export async function generateMetadata({ params }: { params: Promise<{ orgao: string }> }): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  const fav = (site?.config.favicon as { id?: string } | undefined)?.id;
  return site?.config.visualModerno && fav ? { icons: { icon: urlMidia(fav, 160, "1x1"), apple: urlMidia(fav, 160, "1x1") } } : {};
}

export default function LayoutOrgao({ children }: { children: React.ReactNode }) {
  const v = process.env.VERSAO_ATIVOS ? `?v=${process.env.VERSAO_ATIVOS}` : "";
  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css" precedence="default" />
      <link rel="stylesheet" href={`/assets/css/design-system.css${v}`} precedence="default" />
      <link rel="stylesheet" href={`/assets/css/portal.css${v}`} precedence="default" />
      <link rel="stylesheet" href={`/assets/css/cms.css${v}`} precedence="default" />
      {children}
    </>
  );
}
