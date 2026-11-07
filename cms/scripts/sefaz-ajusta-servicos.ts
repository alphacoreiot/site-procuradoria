// Dá título ao primeiro grupo da página Serviços, para ela virar abas.
// Só acrescenta a linha de título; não altera mais nada e pode rodar de novo.
import { db } from "../src/lib/db";
import { ajustarServicos } from "./sefaz-classes";

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const p = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "servicos" } } });
  const conteudo = ajustarServicos(p.conteudo);
  if (conteudo === p.conteudo) return console.log("sem mudança");
  await db.pagina.update({ where: { id: p.id }, data: { conteudo } });
  console.log("título incluído");
}
main().finally(() => db.$disconnect());
