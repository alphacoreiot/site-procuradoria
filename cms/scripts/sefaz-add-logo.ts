// Troca a logomarca da SEFAZ (cabeçalho e rodapé) sem reimportar o órgão.
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { DIR_UPLOADS, salvarUpload } from "../src/lib/media-core";

const ALT = "Prefeitura de Camaçari, Secretaria da Fazenda";

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const p = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "inicio" } } });
  const dados = await readFile(path.join("scripts", "assets", "assinatura-sefaz.png"));
  const nova = await salvarUpload({ dados, nomeOriginal: "assinatura-sefaz.png", orgaoId: o.id, alt: ALT });
  const antigas = new Set<string>();
  for (const b of await db.bloco.findMany({ where: { paginaId: p.id, tipo: { in: ["cabecalho", "rodape"] } } })) {
    const d = JSON.parse(b.dados);
    if (d.logo?.id) antigas.add(d.logo.id);
    d.logo = { id: nova.id, alt: ALT };
    await db.bloco.update({ where: { id: b.id }, data: { dados: JSON.stringify(d) } });
  }
  for (const id of antigas) {
    const m = await db.midia.findUnique({ where: { id } });
    if (!m || m.id === nova.id) continue;
    await db.midia.delete({ where: { id } });
    await unlink(path.join(DIR_UPLOADS, m.arquivo)).catch(() => {});
    console.log("removida", m.nomeOriginal);
  }
  console.log("logo nova", nova.id, nova.largura, nova.altura);
}
main().finally(() => db.$disconnect());
