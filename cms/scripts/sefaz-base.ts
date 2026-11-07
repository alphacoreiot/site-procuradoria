// Monta a base do assistente a partir do texto extraído dos documentos.
// Leis são cortadas por artigo; os demais documentos, por blocos de texto.
// Uso: DATABASE_URL=... npx tsx scripts/sefaz-base.ts ../sefaz-dados/base/paginas.jsonl
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

type Pagina = { id: string; p: number; t: string };
type Corte = { pagina: number; rotulo: string; secao: string; texto: string };

const FORA = /^tabela de enquadramento|^tabela dos cnaes|rel_cnae|^faixa_valores|^cnae-faixa|^tabela de valores/i;
const MAX = 1700, JANELA = 1100;

function limparPagina(t: string) {
  return t.replace(/\r/g, "").replace(/^\s*\d{1,4}\s*\n/, "").replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
const unirLinhas = (s: string) => s.replace(/([^\n.:;])\n(?=\p{Ll})/gu, "$1 ").trim();

function dividir(texto: string): string[] {
  if (texto.length <= MAX) return [texto];
  const partes: string[] = [];
  let atual = "";
  for (const l of texto.split("\n")) {
    if (atual.length + l.length > MAX && atual) { partes.push(atual.trim()); atual = ""; }
    atual += `${l}\n`;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes;
}

/** Corta por artigo, guardando em que parte da lei ele está. */
function porArtigo(paginas: Pagina[]) {
  const cortes: Corte[] = [];
  const nivel: Record<string, string> = {};
  let abertos: { pagina: number; rotulo: string; secao: string; linhas: string[] } | null = null;
  let esperaNome = "";
  const fechar = () => {
    if (!abertos) return;
    const t = unirLinhas(abertos.linhas.join("\n"));
    dividir(t).forEach((parte, i) => cortes.push({ pagina: abertos!.pagina, rotulo: i ? `${abertos!.rotulo} (cont.)` : abertos!.rotulo, secao: abertos!.secao, texto: parte }));
    abertos = null;
  };
  for (const p of paginas) {
    for (const bruta of limparPagina(p.t).split("\n")) {
      const l = bruta.trim();
      if (!l) continue;
      const cab = l.match(/^(LIVRO|T[IÍ]TULO|CAP[IÍ]TULO|SE[CÇ][AÃ]O)\s+[IVXLCDM]+\b/);
      if (cab && !/^Art/i.test(l)) {
        const n = cab[1].normalize("NFD").replace(/\p{M}/gu, "");
        const ord = ["LIVRO", "TITULO", "CAPITULO", "SECAO"];
        for (const k of ord.slice(ord.indexOf(n) + 1)) delete nivel[k];
        nivel[n] = l;
        esperaNome = n;
        continue;
      }
      if (esperaNome && /^[\p{Lu}\s,;()º°ª-]+$/u.test(l) && l.length > 3) {
        nivel[esperaNome] = `${nivel[esperaNome]} ${l}`.slice(0, 120);
        esperaNome = "";
        continue;
      }
      esperaNome = "";
      const art = l.match(/^Art?\.?\s*(\d+)\s*[º°o]?(?:-\s*([A-Z]))?/); // o PDF traz "Ar. 101"
      if (art) {
        fechar();
        abertos = { pagina: p.p, rotulo: `Art. ${art[1]}${art[2] ? `-${art[2]}` : ""}`, secao: Object.values(nivel).join(" > ").slice(0, 200), linhas: [l] };
      } else if (abertos) abertos.linhas.push(l);
    }
  }
  fechar();
  return cortes;
}

/** Corta em blocos, sem separar parágrafos quando possível. */
function porJanela(paginas: Pagina[]) {
  const cortes: Corte[] = [];
  for (const p of paginas) {
    const blocos = unirLinhas(limparPagina(p.t)).split(/\n{2,}|\n(?=\p{Lu})/u);
    let atual = "";
    const soltar = () => {
      const t = atual.trim();
      if (t.length >= 60) cortes.push({ pagina: p.p, rotulo: `p. ${p.p}`, secao: "", texto: t });
      atual = "";
    };
    for (const b of blocos) {
      if (atual.length + b.length > JANELA) soltar();
      atual += `${b}\n`;
    }
    soltar();
  }
  return cortes;
}

async function main() {
  const arq = process.argv[2];
  const linhas: Pagina[] = readFileSync(arq, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const docs = await db.documento.findMany({ where: { orgaoId: o.id, publicado: true }, select: { id: true, titulo: true, tipo: true, categoria: true } });
  const dados: (Corte & { documentoId: string })[] = [];
  let lidos = 0, leis = 0;
  for (const d of docs) {
    if (FORA.test(d.titulo)) continue;
    const paginas = linhas.filter((l) => l.id === d.id);
    if (paginas.length === 0) continue;
    lidos++;
    const juris = d.tipo === "LEGISLACAO" || d.categoria === "Normas e comunicados";
    const eCodigo = d.categoria === "Código Tributário";
    const uteis = eCodigo ? paginas.filter((p) => p.p > 5) : paginas;
    const art = juris ? porArtigo(uteis) : [];
    if (art.length >= 2) leis++;
    const cortes = art.length >= 2 ? art : porJanela(uteis);
    for (const c of cortes) dados.push({ ...c, documentoId: d.id });
  }
  // os anexos do Código são imagens: o assistente precisa saber onde estão
  const codigo = docs.find((d) => d.categoria === "Código Tributário");
  if (codigo) {
    dados.push({
      documentoId: codigo.id, pagina: 127, rotulo: "Anexos", secao: "ANEXOS DO CÓDIGO TRIBUTÁRIO",
      texto: "Os anexos do Código Tributário e de Rendas (tabelas de valores, alíquotas, taxas e planta de valores, entre outros) estão no PDF, a partir da página 127. São tabelas em imagem: os valores devem ser consultados diretamente no documento.",
    });
  }
  await db.trecho.deleteMany({ where: { documento: { orgaoId: o.id } } });
  for (let i = 0; i < dados.length; i += 400) await db.trecho.createMany({ data: dados.slice(i, i + 400) });
  const cod = codigo ? await db.trecho.findMany({ where: { documentoId: codigo.id }, select: { rotulo: true } }) : [];
  const nums = new Set(cod.map((c) => Number(c.rotulo.match(/Art\. (\d+)/)?.[1] ?? 0)));
  const falta: number[] = [];
  for (let i = 1; i <= 334; i++) if (!nums.has(i)) falta.push(i);
  console.log(JSON.stringify({ documentos: lidos, porArtigo: leis, trechos: dados.length, caracteres: dados.reduce((s, d) => s + d.texto.length, 0), codigo: cod.length, artigosAusentes: falta }));
}
main().finally(() => db.$disconnect());
