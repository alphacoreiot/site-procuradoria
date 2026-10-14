import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { CAMPOS_CONFIG } from "@/blocks/specs";
import { completar } from "@/blocks/campos";
import { FormCampos } from "@/components/admin/FormCampos";
import { salvarConfig } from "../../../acoes/conteudo";
import { DadosOrgao } from "./DadosOrgao";

type Props = { params: Promise<{ orgao: string }> };

export default async function Configuracoes({ params }: Props) {
  const { usuario, orgao } = await orgaoDaPagina((await params).orgao, "ADMIN");
  const cfg = await db.configuracao.findUnique({ where: { orgaoId: orgao.id } });
  let dados: unknown = {};
  try { dados = JSON.parse(cfg?.dados ?? "{}"); } catch { /* vazio */ }
  return (
    <>
      <h1>Configurações</h1>
      <p className="sub">Dados gerais do site de {orgao.sigla}.</p>
      <section className="card">
        <h2>Órgão</h2>
        <DadosOrgao orgao={orgao.slug} inicial={{ nome: orgao.nome, sigla: orgao.sigla, ativo: orgao.ativo }} podeAtivar={usuario.papel === "SUPERADMIN"} />
      </section>
      <h2 style={{ margin: "26px 0 12px" }}>Site</h2>
      <FormCampos campos={CAMPOS_CONFIG} inicial={completar(CAMPOS_CONFIG, dados)} orgao={orgao.slug} salvar={salvarConfig.bind(null, orgao.slug)} textoBotao="Salvar configurações" />
    </>
  );
}
