import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Fragment } from "react";
import { db } from "@/lib/db";
import { carregarSite } from "@/lib/site";
import { analisarConteudo } from "@/lib/conteudo";
import { BLOCOS_POR_TIPO } from "@/blocks/specs";
import { completar } from "@/blocks/campos";
import { BlocoPrincipal, type Ctx } from "@/blocks/render";
import { MolduraTexto } from "@/components/site/documentos";
import { Segmentos } from "@/components/site/pagina";

export const dynamic = "force-dynamic";
const EMBUTIVEIS = ["organograma", "competencias", "atendimento"];

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

  // {{organograma}} ou {{competencias}} no texto colocam o componente naquele ponto, sem seção própria
  const tipos = blocos.filter((x) => EMBUTIVEIS.includes(x.tipo)).map((x) => x.tipo);
  const partes = tipos.length ? r.p.conteudo.split(new RegExp(`\\{\\{(${tipos.join("|")})\\}\\}`)) : [r.p.conteudo];
  const a = analisarConteudo(partes[0], "a");
  const trechos: { bloco: (typeof blocos)[number]; conteudo: ReturnType<typeof analisarConteudo> }[] = [];
  for (let i = 1; i < partes.length; i += 2) {
    trechos.push({ bloco: blocos.find((x) => x.tipo === partes[i])!, conteudo: analisarConteudo(partes[i + 1], String.fromCharCode(97 + (i + 1) / 2), false) });
  }
  const embutidos = trechos.map((t) => t.bloco);
  const embutir = trechos.length > 0;
  const comAbas = a.segs.some((s) => s.t === "grupos");

  return (
    <MolduraTexto
      orgaoSlug={orgao}
      titulo={r.p.titulo}
      texto={r.p.descricaoSeo || undefined}
      capa={a.capa}
      cta={a.cta}
      indice={[...a.indice, ...trechos.flatMap((t) => t.conteudo.indice)]}
      lateral={!embutir && !comAbas}
      larga={comAbas || embutir}
      depois={blocos.filter((x) => !embutidos.includes(x)).map((x) => montar(x, false))}
    >
      <Segmentos segs={a.segs} />
      {trechos.map((t) => (
        <Fragment key={t.bloco.id}>
          {montar(t.bloco, true)}
          <Segmentos segs={t.conteudo.segs} />
        </Fragment>
      ))}
    </MolduraTexto>
  );
}
