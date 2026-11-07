// Dados das notícias da SEFAZ. Autor, data e chamada estão no corpo de cada notícia
// (caixa de autor do Elementor). Tipo e assunto não existem no site antigo: vêm de
// regras sobre título e chamada, com o resumo só para desempatar. Tudo é editável no painel.
import * as cheerio from "cheerio";
import { normalizarBusca } from "../src/lib/documentos-shared";

const TEMAS: [string, RegExp][] = [
  ["Simples Nacional", /simples nacional|\bmei\b|microempreendedor/],
  ["NFS-e", /nfs-?e|nota fiscal/],
  ["ITIV", /\bitiv\b/],
  ["IPTU", /\biptu\b|cadastro imobiliario|imobiliario/],
  ["TFF", /\btff\b/],
  ["ISS", /\biss(qn)?\b/],
  ["REFIS", /\brefis\b/],
  ["Reforma Tributária", /reforma tributaria|\bibs\b|\bcbs\b/],
  ["COSIP", /\bcosip\b/],
  ["TRSD", /\btrsd\b/],
  ["Dívida ativa", /debitos?\b|dividas?\b|execucao fiscal|pendencias tributarias|regularizacao fiscal/],
  ["Gestão fiscal", /quadrimestre|audiencia publica|presta contas|qualidade contabil|planejamento estrategico|arrecadacao|administracao/],
  ["Tecnologia", /digital|chatbot|serpro|tecnologia|sistema tributario|\bstm\b/],
];

const TIPOS: [string, RegExp][] = [
  ["Alerta", /alerta|fraude|golpe|risco|cuidado|atencao/],
  ["Legislação", /regulament|decreto|portaria|\blei\b|define regras|resolucao|instrucao normativa/],
  ["Prestação de contas", /presta contas|audiencia publica|quadrimestre|qualidade contabil/],
  ["Prazos e pagamentos", /prazo|vencimento|desconto|disponivel para pagamento|2a via|cota unica|parcelamento|carne|pagamento/],
  ["Modernização", /moderniza|digitaliza|automatiza|novo modulo|modulo digital|chatbot|transformacao digital|tecnologia|inova/],
  ["Orientação", /orienta|procedimento|notificad|campanha|como |novo periodo|continua sendo/],
];

export function classificar(titulo: string, chamada: string, resumo: string) {
  const t = normalizarBusca(`${titulo} ${chamada}`), r = normalizarBusca(resumo);
  const achar = (lista: [string, RegExp][], texto: string) => lista.find(([, re]) => re.test(texto))?.[0];
  return {
    tema: achar(TEMAS, t) ?? achar(TEMAS, r) ?? "Geral",
    tipo: achar(TIPOS, t) ?? "Institucional",
  };
}

/** Unifica as grafias do setor ("ASTEC - SEFAZ", "SEFAZ / ASTEC", "ASOCM"...). */
function nomeAutor(bruto: string) {
  if (/astec/i.test(bruto)) return "ASTEC";
  if (/^as(co|oc)m\b/i.test(bruto.trim())) return "ASCOM";
  return bruto.replace(/\s+-\s+\S+\.\S+$/, "").trim();
}

export type DadosPost = { autor: string; data: string; chamada: string; manchete: string; nomesCaixa: string[] };

/** Lê do HTML original a primeira caixa de autor (a segunda é resto de modelo) e a chamada. */
export function dadosDoPost(html: string): DadosPost {
  const $ = cheerio.load(`<div id="r">${html}</div>`);
  $("style, script, svg").remove();
  const esp = (s: string) => s.replace(/\s+/g, " ").trim();
  const caixas = $("#r .elementor-author-box").map((_, e) => {
    const b = $(e);
    return { nome: esp(b.find(".elementor-author-box__name").text()), bio: esp(b.find(".elementor-author-box__bio").text()) };
  }).get();
  const primeira = caixas[0];
  const pessoa = caixas.find((c) => c !== primeira && !/astec|ascom|asocm/i.test(c.nome))?.nome;
  let autor = nomeAutor(primeira?.nome ?? "");
  if (pessoa) autor = `${pessoa} (${autor})`;
  const d = primeira?.bio.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const h2 = esp($("#r h2").first().text());
  return {
    autor,
    data: d ? `${d[3]}-${d[2]}-${d[1]}` : "",
    chamada: h2.length > 0 && h2.length <= 40 ? h2 : "",
    manchete: h2.length > 40 ? h2 : "",
    nomesCaixa: [...new Set(caixas.map((c) => c.nome))],
  };
}

const semMarcas = (b: string) => b.replace(/^#+\s*/, "").replace(/[*_\\]/g, "").replace(/\s+/g, " ").trim();
const RE_FIM = /^(not[ií]cias recentes\s*>?|\+\s*not[ií]cias|mais not[ií]cias)$/i;

/** Tira do corpo o que era moldura do site antigo; o texto da notícia fica como está. */
export function limparCorpo(md: string, titulo: string, d: DadosPost) {
  const nomes = new Set(d.nomesCaixa.map((n) => normalizarBusca(n)));
  const iguais = new Set([titulo, d.chamada, d.manchete].filter(Boolean).map((x) => normalizarBusca(x)));
  const saida: string[] = [];
  for (const b of md.replace(/\r\n/g, "\n").split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)) {
    const t = semMarcas(b);
    const n = normalizarBusca(t);
    const avatar = b.match(/^!\[([^\]]*)\]\(\/media\/[^)]+\)$/);
    if (avatar && nomes.has(normalizarBusca(avatar[1]))) continue;
    if (nomes.has(n)) continue;
    if (/^(publicado em\s*)?\d{2}\/\d{2}\/\d{4}$/i.test(t)) continue;
    if (RE_FIM.test(t)) continue;
    if (iguais.has(n)) continue;
    saida.push(b);
  }
  return saida.join("\n\n");
}

/** Resumo: o primeiro parágrafo de verdade, sem marcações. */
export function resumoDe(md: string, limite: number) {
  const texto = (b: string) => b.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_\\#>]/g, "").replace(/\s+/g, " ").trim();
  const p = md.split(/\n{2,}/).map(texto).find((b) => b.length >= 60) ?? texto(md);
  return p.length > limite ? `${p.slice(0, limite - 1).replace(/\s+\S*$/, "")}…` : p;
}

/** Em notícias antigas a chamada é uma linha em maiúsculas no início do texto. */
export function chamadaDoCorpo(md: string) {
  const blocos = md.split(/\n{2,}/);
  let chamada = "";
  while (blocos.length > 1) {
    const t = semMarcas(blocos[0]);
    const letras = t.replace(/[^\p{L}]/gu, "");
    const curta = t.length >= 3 && t.length <= 45 && !/[.:;!?]$/.test(t);
    if (!curta || !letras || letras !== letras.toLocaleUpperCase("pt-BR")) break;
    chamada ||= t;
    blocos.shift();
  }
  return { chamada, md: blocos.join("\n\n") };
}

/** O primeiro grupo da página Serviços não tinha título no site antigo. */
export function ajustarServicos(md: string) {
  const marca = "[2ª VIA DE TRIBUTOS]";
  if (md.includes("## Serviços ao contribuinte") || !md.includes(marca)) return md;
  return md.replace(marca, `## Serviços ao contribuinte\n\n${marca}`);
}
