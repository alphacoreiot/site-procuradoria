// Inclui ou atualiza o organograma na página Secretaria da SEFAZ, sem reimportar nada.
import { db } from "../src/lib/db";
import { BLOCOS_POR_TIPO } from "../src/blocks/specs";
import { schemaObjeto } from "../src/blocks/campos";
import { ORGANOGRAMA_SEFAZ } from "./sefaz-organograma";

async function main() {
  const dados = JSON.stringify(schemaObjeto(BLOCOS_POR_TIPO.organograma.campos).parse(ORGANOGRAMA_SEFAZ));
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const p = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "secretaria" } } });
  const b = await db.bloco.findFirst({ where: { paginaId: p.id, tipo: "organograma" } });
  if (b) await db.bloco.update({ where: { id: b.id }, data: { dados } });
  else await db.bloco.create({ data: { paginaId: p.id, tipo: "organograma", area: "principal", ordem: 0, dados } });
  console.log("organograma ok");
}
main().finally(() => db.$disconnect());
