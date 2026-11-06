import { orgaoDaPagina } from "@/lib/auth";
import { FormProcesso } from "../FormProcesso";

export default async function NovoProcesso({ params }: { params: Promise<{ orgao: string }> }) {
  const { orgao } = await orgaoDaPagina((await params).orgao);
  return (
    <>
      <div className="adm-topo"><h1>Novo processo</h1></div>
      <FormProcesso orgao={orgao.slug} id={null} inicial={{ titulo: "", publicado: true, exigencias: [] }} />
    </>
  );
}
