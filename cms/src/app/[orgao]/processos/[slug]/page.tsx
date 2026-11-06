import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { carregarSite } from "@/lib/site";
import { MolduraTexto } from "@/components/site/documentos";

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
  return r ? { title: `${r.p.titulo} — ${r.site.orgao.sigla}` } : {};
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
  return (
    <MolduraTexto orgaoSlug={orgao} titulo={r.p.titulo} voltar={{ href: `/${orgao}/processos`, texto: "Processos Digitais" }}>
      {itens.length === 0
        ? <p className="news-empty">A lista de documentos deste processo ainda não está disponível.</p>
        : (
          <div className="news-body">
            <h2>Documentos necessários</h2>
            <div className="tabela-rolagem">
              <table>
                <thead><tr><th>Documento</th><th>Obrigatório</th></tr></thead>
                <tbody>
                  {itens.map((e, i) => (
                    <tr key={i}>
                      <td>{e.documento}</td>
                      <td><span className={`obrig ${e.obrigatorio ? "obrig--sim" : "obrig--nao"}`}>{e.obrigatorio ? "Sim" : "Não"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </MolduraTexto>
  );
}
