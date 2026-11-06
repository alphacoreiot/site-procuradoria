import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { FormProcesso } from "../FormProcesso";

export default async function EditarProcesso({ params }: { params: Promise<{ orgao: string; id: string }> }) {
  const p = await params;
  const { orgao } = await orgaoDaPagina(p.orgao);
  const d = await db.processo.findFirst({ where: { id: p.id, orgaoId: orgao.id } });
  if (!d) notFound();
  let exigencias: { documento: string; obrigatorio: boolean }[] = [];
  try {
    exigencias = JSON.parse(d.exigencias);
  } catch {
    exigencias = [];
  }
  return (
    <>
      <div className="adm-topo"><h1>Editar processo</h1></div>
      <FormProcesso orgao={orgao.slug} id={d.id} inicial={{ titulo: d.titulo, publicado: d.publicado, exigencias }} />
    </>
  );
}
