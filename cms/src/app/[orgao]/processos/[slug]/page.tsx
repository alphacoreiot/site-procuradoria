import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { carregarSite } from "@/lib/site";
import { fraseAmigavel } from "@/lib/texto";
import { MolduraTexto } from "@/components/site/documentos";
import { Icone, propsLink } from "@/components/site/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgao: string; slug: string }> };
type Exigencia = { documento: string; obrigatorio: boolean };

const buscar = cache(async (orgaoSlug: string, slug: string) => {
  const site = await carregarSite(orgaoSlug);
  if (!site || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const p = await db.processo.findUnique({ where: { orgaoId_slug: { orgaoId: site.orgao.id, slug } } });
  return p && p.publicado ? { site, p } : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgao, slug } = await params;
  const r = await buscar(orgao, slug);
  return r ? { title: `${fraseAmigavel(r.p.titulo)} — ${r.site.orgao.sigla}` } : {};
}

function Lista({ titulo, nota, itens }: { titulo: string; nota: string; itens: Exigencia[] }) {
  if (itens.length === 0) return null;
  return (
    <section className="check-grupo">
      <h2>{titulo} <span>{itens.length}</span></h2>
      <p>{nota}</p>
      <ul>
        {itens.map((e, i) => (
          <li key={i}><label><input type="checkbox" data-check /><span>{fraseAmigavel(e.documento)}</span></label></li>
        ))}
      </ul>
    </section>
  );
}

export default async function ProcessoDetalhe({ params }: Props) {
  const { orgao, slug } = await params;
  const r = await buscar(orgao, slug);
  if (!r) notFound();
  let itens: Exigencia[] = [];
  try {
    itens = JSON.parse(r.p.exigencias);
  } catch {
    itens = [];
  }
  const cfg = r.site.config as { linkSistema?: string; rotuloSistema?: string };
  const obrig = itens.filter((e) => e.obrigatorio), opc = itens.filter((e) => !e.obrigatorio);
  return (
    <MolduraTexto
      orgaoSlug={orgao}
      titulo={r.p.titulo}
      texto={itens.length ? `Separe ${itens.length === 1 ? "o documento" : `os ${itens.length} documentos`} antes de abrir o processo. Marque o que você já tem.` : undefined}
      trilha={[{ href: `/${orgao}/processos`, texto: "Processos Digitais" }]}
      acoesTopo={(
        <div className="pag-acoes">
          {cfg.linkSistema && <a className="pag-bt pag-bt--pri" {...propsLink(cfg.linkSistema)}>{cfg.rotuloSistema || "Acessar o sistema"}<Icone id="arrow" /></a>}
          {itens.length > 0 && <button type="button" className="pag-bt" data-acao="imprimir"><Icone id="doc" />Imprimir lista</button>}
        </div>
      )}
    >
      {itens.length === 0
        ? <p className="news-empty">A lista de documentos deste processo ainda não está disponível.</p>
        : (
          <div className="check" data-checklist>
            <div className="check__progresso" aria-hidden="true"><span data-check-barra /></div>
            <p className="check__conta" role="status" data-check-conta>0 de {itens.length} documentos separados</p>
            <Lista titulo="Obrigatórios" nota="Sem estes documentos o processo não pode seguir." itens={obrig} />
            <Lista titulo="Quando se aplica" nota="Necessários apenas em alguns casos, como quando há procurador." itens={opc} />
          </div>
        )}
    </MolduraTexto>
  );
}
