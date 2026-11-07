import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { carregarSite } from "@/lib/site";
import { analisarConteudo } from "@/lib/conteudo";
import { BLOCOS_POR_TIPO } from "@/blocks/specs";
import { completar } from "@/blocks/campos";
import { BlocoPrincipal, type Ctx } from "@/blocks/render";
import { MolduraTexto } from "@/components/site/documentos";
import { Segmentos } from "@/components/site/pagina";

export const dynamic = "force-dynamic";
const MARCADOR = "{{organograma}}";

type Props = { params: Promise<{ orgao: string; pagina: string }> };

const buscar = cache(async (orgaoSlug: string, slug: string) => {
  const site = await carregarSite(orgaoSlug);
  if (!site || slug === "inicio" || !/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const p = await db.pagina.findUnique({
    where: { orgaoId_slug: { orgaoId: site.orgao.id, slug } },
    include: { blocos: { where: { visivel: true, area: "principal" }, orderBy: { ordem: "asc" } } },
  });
  return p && p.publicada ? { site, p } : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgao, pagina } = await params;
  const r = await buscar(orgao, pagina);
  return r ? { title: `${r.p.titulo} — ${r.site.orgao.sigla}`, description: r.p.descricaoSeo || undefined } : {};
}

export default async function PaginaInterna({ params }: Props) {
  const { orgao, pagina } = await params;
  const r = await buscar(orgao, pagina);
  if (!r) notFound();
  const ctx: Ctx = { orgaoSlug: r.site.orgao.slug, midias: r.site.midias, noticias: r.site.noticias };
  const contagem: Record<string, number> = {};
  const montar = (b: (typeof r.p.blocos)[number], embutido: boolean) => {
    const idx = (contagem[b.tipo] = (contagem[b.tipo] ?? -1) + 1);
    let dados: unknown = {};
    try { dados = JSON.parse(b.dados); } catch { /* usa vazio */ }
    return <BlocoPrincipal key={b.id} tipo={b.tipo} d={completar(BLOCOS_POR_TIPO[b.tipo].campos, dados)} ctx={ctx} idx={idx} embutido={embutido} />;
  };
  const blocos = r.p.blocos.filter((b) => BLOCOS_POR_TIPO[b.tipo]);

  // {{organograma}} no texto coloca o componente naquele ponto, sem seção própria
  const org = blocos.find((b) => b.tipo === "organograma");
  const partes = org ? r.p.conteudo.split(MARCADOR) : [r.p.conteudo];
  const embutir = Boolean(org) && partes.length > 1;
  const a = analisarConteudo(partes[0], "a");
  const b = embutir ? analisarConteudo(partes.slice(1).join(""), "b", false) : null;
  const comAbas = a.segs.some((s) => s.t === "grupos");

  return (
    <MolduraTexto
      orgaoSlug={orgao}
      titulo={r.p.titulo}
      texto={r.p.descricaoSeo || undefined}
      capa={a.capa}
      cta={a.cta}
      indice={[...a.indice, ...(b?.indice ?? [])]}
      lateral={!embutir && !comAbas}
      larga={comAbas || embutir}
      depois={blocos.filter((x) => !(embutir && x === org)).map((x) => montar(x, false))}
    >
      <Segmentos segs={a.segs} />
      {embutir && org && montar(org, true)}
      {b && <Segmentos segs={b.segs} />}
    </MolduraTexto>
  );
}
