import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { BLOCOS_POR_TIPO } from "@/blocks/specs";
import { completar } from "@/blocks/campos";
import { FormCampos } from "@/components/admin/FormCampos";
import { salvarBloco } from "../../../../acoes/conteudo";

type Props = { params: Promise<{ orgao: string; id: string }> };

export default async function EditarBloco({ params }: Props) {
  const p = await params;
  const { orgao } = await orgaoDaPagina(p.orgao);
  if (!/^[a-z0-9]{10,40}$/.test(p.id)) notFound();
  const b = await db.bloco.findFirst({ where: { id: p.id, pagina: { orgaoId: orgao.id } } });
  const def = b && BLOCOS_POR_TIPO[b.tipo];
  if (!b || !def) notFound();
  let dados: unknown = {};
  try { dados = JSON.parse(b.dados); } catch { /* usa vazio */ }
  return (
    <>
      <p className="sub" style={{ marginBottom: 6 }}><a href={`/admin/${orgao.slug}/pagina`}>← Página e componentes</a></p>
      <h1>{def.nome}</h1>
      <p className="sub">{def.descricao} Os limites de caracteres e as proporções das imagens garantem que o layout não quebre.</p>
      <FormCampos campos={def.campos} inicial={completar(def.campos, dados)} orgao={orgao.slug} salvar={salvarBloco.bind(null, orgao.slug, b.id)} />
    </>
  );
}
