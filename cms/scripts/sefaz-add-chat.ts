// Liga o assistente na configuração da SEFAZ, sem mexer em mais nada.
import { db } from "../src/lib/db";
import { CAMPOS_CONFIG } from "../src/blocks/specs";
import { completar, schemaObjeto } from "../src/blocks/campos";

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" }, include: { configuracao: true } });
  const atual = completar(CAMPOS_CONFIG, JSON.parse(o.configuracao!.dados));
  const dados = schemaObjeto(CAMPOS_CONFIG).parse({ ...atual, chatAtivo: true });
  await db.configuracao.update({ where: { orgaoId: o.id }, data: { dados: JSON.stringify(dados) } });
  console.log("assistente ligado");
}
main().finally(() => db.$disconnect());
