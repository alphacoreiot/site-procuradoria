import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { FormNoticia } from "../FormNoticia";

type Props = { params: Promise<{ orgao: string; id: string }> };

/** Data no fuso de Camaçari, no formato do campo datetime-local. */
function paraCampo(d: Date | null) {
  if (!d) return "";
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
  return p.replace(" ", "T");
}

export default async function EditarNoticia({ params }: Props) {
  const p = await params;
  const { orgao } = await orgaoDaPagina(p.orgao);
  if (!/^[a-z0-9]{10,40}$/.test(p.id)) notFound();
  const n = await db.noticia.findFirst({ where: { id: p.id, orgaoId: orgao.id } });
  if (!n) notFound();
  return (
    <>
      <p className="sub" style={{ marginBottom: 6 }}><a href={`/admin/${orgao.slug}/noticias`}>← Notícias</a></p>
      <h1>Editar notícia</h1>
      <p className="sub">Endereço: /{orgao.slug}/noticias/{n.slug}</p>
      <FormNoticia
        orgao={orgao.slug}
        id={n.id}
        inicial={{
          titulo: n.titulo, slug: n.slug, resumo: n.resumo, conteudo: n.conteudo, categoria: n.categoria,
          capaId: n.capaId ?? "", capaAlt: n.capaAlt, destaque: n.destaque, status: n.status as "RASCUNHO" | "PUBLICADA",
          publicadaEm: paraCampo(n.publicadaEm),
        }}
      />
    </>
  );
}
