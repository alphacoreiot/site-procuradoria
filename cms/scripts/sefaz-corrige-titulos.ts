// Corrige os títulos de perguntas que perderam a letra "s" na importação.
// Só troca a linha de título exata; o resto do conteúdo e as edições ficam como estão.
// Uso: DATABASE_URL=... npx tsx scripts/sefaz-corrige-titulos.ts [--aplicar]
import { readFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { db } from "../src/lib/db";

const aplicar = process.argv.includes("--aplicar");
const fontes: { slug: string; content: { rendered: string } }[] = JSON.parse(readFileSync(path.resolve("..", "sefaz-dados", "json", "pages.json"), "utf8"));
const espaco = (s: string) => s.replace(/\s+/g, " ").trim();
const corrompido = (s: string) => s.replace(/s+/g, " ").replace(/ +/g, " ").trim();

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  let linhas = 0, paginas = 0;
  const faltando: string[] = [];
  for (const f of fontes) {
    const slug = f.slug.replace(/_/g, "-");
    const p = await db.pagina.findUnique({ where: { orgaoId_slug: { orgaoId: o.id, slug } } });
    if (!p) continue;
    const $ = cheerio.load(`<div>${f.content.rendered}</div>`);
    const titulos = [...new Set($(".elementor-tab-title").map((_, e) => espaco($(e).text())).get())];
    let t = p.conteudo.replace(/\r\n/g, "\n");
    let n = 0;
    for (const certo of titulos) {
      if (!certo.includes("s")) continue;
      const errado = corrompido(certo);
      const antes = `\n### ${errado}\n`, depois = `\n### ${certo}\n`;
      if (t.includes(antes)) { t = t.split(antes).join(depois); n++; }
      else if (!t.includes(depois)) faltando.push(`${slug}: ${certo}`);
    }
    if (n) {
      linhas += n; paginas++;
      if (aplicar) await db.pagina.update({ where: { id: p.id }, data: { conteudo: t } });
    }
  }
  const restam = (await db.pagina.findMany({ where: { orgaoId: o.id }, select: { conteudo: true } })).flatMap((p) => p.conteudo.match(/^### .*$/gm) ?? []);
  console.log(JSON.stringify({ aplicar, paginas, linhas, naoEncontrados: faltando.length, exemplos: faltando.slice(0, 4), h3: restam.length }));
}
main().finally(() => db.$disconnect());
