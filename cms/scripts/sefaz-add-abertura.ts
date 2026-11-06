// Aplica os textos da abertura no bloco de banners da SEFAZ, sem reimportar.
import { db } from "../src/lib/db";
import { BLOCOS_POR_TIPO } from "../src/blocks/specs";
import { schemaObjeto } from "../src/blocks/campos";
import { ABERTURA_SEFAZ } from "./sefaz-organograma";

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const p = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "inicio" } } });
  const b = await db.bloco.findFirstOrThrow({ where: { paginaId: p.id, tipo: "banners" } });
  const dados = schemaObjeto(BLOCOS_POR_TIPO.banners.campos).parse({ ...JSON.parse(b.dados), ...ABERTURA_SEFAZ });
  await db.bloco.update({ where: { id: b.id }, data: { dados: JSON.stringify(dados) } });
  console.log("abertura ok");
}
main().finally(() => db.$disconnect());
