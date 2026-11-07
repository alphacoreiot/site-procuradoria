// Aplica às notícias da SEFAZ o autor, a data e a chamada que estão no texto original
// e limpa corpo e resumo. Só retira blocos de moldura: o restante do texto é preservado.
// Uso: DATABASE_URL=... npx tsx scripts/sefaz-limpa-noticias.ts [--aplicar]
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { normalizarBusca } from "../src/lib/documentos-shared";
import { LIMITES_NOTICIA } from "../src/lib/noticias-shared";
import { chamadaDoCorpo, classificar, dadosDoPost, limparCorpo, resumoDe } from "./sefaz-classes";

const aplicar = process.argv.includes("--aplicar");
const posts: { slug: string; date: string; content: { rendered: string } }[] = JSON.parse(readFileSync(path.resolve("..", "sefaz-dados", "json", "posts.json"), "utf8"));

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const conta = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };
  const autores: Record<string, number> = {}, tipos: Record<string, number> = {}, temas: Record<string, number> = {};
  let n = 0, comChamada = 0, datas = 0, retirado = 0;
  const semPar: string[] = [];
  for (const p of posts) {
    const slug = p.slug.slice(0, 120).replace(/-+$/, "");
    const atual = await db.noticia.findUnique({ where: { orgaoId_slug: { orgaoId: o.id, slug } } });
    if (!atual) { semPar.push(slug); continue; }
    const d = dadosDoPost(p.content.rendered);
    const inicio = chamadaDoCorpo(limparCorpo(atual.conteudo, atual.titulo, d));
    const conteudo = inicio.md;
    d.chamada = d.chamada || inicio.chamada || atual.chamada;
    const resumo = resumoDe(conteudo, LIMITES_NOTICIA.resumo);
    const c = classificar(atual.titulo, d.chamada, resumo);
    const publicadaEm = d.data ? new Date(`${d.data}T12:00:00-03:00`) : atual.publicadaEm;
    if (d.data && d.data !== p.date.slice(0, 10)) datas++;
    if (d.chamada) comChamada++;
    retirado += atual.conteudo.length - conteudo.length;
    conta(autores, d.autor || "(sem)"); conta(tipos, c.tipo); conta(temas, c.tema);
    n++;
    if (aplicar) {
      await db.noticia.update({
        where: { id: atual.id },
        data: { conteudo, resumo, chamada: d.chamada, autorNome: d.autor, tipo: c.tipo, categoria: c.tema, publicadaEm, busca: normalizarBusca(`${atual.titulo} ${d.chamada} ${resumo}`) },
      });
    }
  }
  console.log(JSON.stringify({ aplicar, n, semPar, comChamada, datasAjustadas: datas, caracteresRetirados: retirado, autores, tipos, temas }));
}
main().finally(() => db.$disconnect());
