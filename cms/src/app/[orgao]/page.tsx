import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { carregarSite } from "@/lib/site";
import { BlocoPrincipal, type Ctx } from "@/blocks/render";
import { SiteShell } from "@/components/site/SiteShell";
import { urlMidia } from "@/lib/media-shared";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await carregarSite((await params).orgao);
  if (!site) return {};
  const c = site.config as Record<string, never>;
  const fav = (c.favicon as { id?: string })?.id;
  return {
    title: (c.tituloSite as string) || site.orgao.nome,
    description: (c.descricaoSeo as string) || undefined,
    icons: fav ? { icon: urlMidia(fav, 160, "1x1"), apple: urlMidia(fav, 160, "1x1") } : undefined,
  };
}

export default async function SiteOrgao({ params }: Props) {
  const site = await carregarSite((await params).orgao);
  if (!site) notFound();
  const ctx: Ctx = { orgaoSlug: site.orgao.slug, midias: site.midias, noticias: site.noticias };
  const principais = site.blocos.filter((b) => b.area === "principal");
  const contagem: Record<string, number> = {};
  return (
    <SiteShell ctx={ctx} nomeOrgao={site.orgao.nome} config={site.config} blocos={site.blocos}>
      {principais.map((b) => {
        const idx = (contagem[b.tipo] = (contagem[b.tipo] ?? -1) + 1);
        return <BlocoPrincipal key={b.id} tipo={b.tipo} d={b.dados} ctx={ctx} idx={idx} />;
      })}
    </SiteShell>
  );
}
