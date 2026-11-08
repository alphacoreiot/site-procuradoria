// Troca a lista de competências da página Secretaria da SEFAZ pelo bloco animado.
// Pode rodar mais de uma vez: só altera o que ainda não foi alterado.
import { db } from "../src/lib/db";
import { BLOCOS_POR_TIPO } from "../src/blocks/specs";
import { schemaObjeto } from "../src/blocks/campos";

const INICIO = "**Áreas de competência**";
const FIM = "## Estrutura Organizacional";
const MARCADOR = "{{competencias}}";

const COMPETENCIAS = {
  sobretitulo: "Secretaria da Fazenda",
  titulo: "Áreas de competência",
  texto: "",
  itens: [
    "gestão da política tributária;",
    "gestão da disponibilidade de recursos financeiros;",
    "gestão do atendimento fiscal ao contribuinte;",
    "gestão da dívida ativa;",
    "gestão da dívida fundada;",
    "administração e fiscalização da arrecadação de tributos e preços públicos;",
    "captação de recursos financeiros para projetos e iniciativas governamentais;",
    "fiscalização da aplicação do código tributário municipal;",
    "julgamento administrativo de processos fiscais.",
    "manutenção do cadastro tributário municipal.",
  ].map((texto) => ({ texto })),
};

async function main() {
  const dados = JSON.stringify(schemaObjeto(BLOCOS_POR_TIPO.competencias.campos).parse(COMPETENCIAS));
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const p = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "secretaria" } } });

  const b = await db.bloco.findFirst({ where: { paginaId: p.id, tipo: "competencias" } });
  if (b) await db.bloco.update({ where: { id: b.id }, data: { dados } });
  else {
    const ultimo = await db.bloco.findFirst({ where: { paginaId: p.id, area: "principal" }, orderBy: { ordem: "desc" } });
    await db.bloco.create({ data: { paginaId: p.id, tipo: "competencias", area: "principal", ordem: (ultimo?.ordem ?? -1) + 1, dados } });
  }
  console.log("bloco ok");

  if (p.conteudo.includes(MARCADOR)) { console.log("corpo da página já estava alterado"); return; }
  const ini = p.conteudo.indexOf(INICIO), fim = p.conteudo.indexOf(FIM);
  if (ini < 0 || fim < ini) throw new Error("trecho das competências não encontrado");
  const removido = p.conteudo.slice(ini, fim);
  if (!removido.includes("cadastro tributário municipal") || removido.length > 900) throw new Error(`trecho inesperado (${removido.length} caracteres)`);
  await db.pagina.update({ where: { id: p.id }, data: { conteudo: `${p.conteudo.slice(0, ini)}## Áreas de competência\n\n${MARCADOR}\n\n${p.conteudo.slice(fim)}` } });
  console.log("lista removida do corpo:", removido.length, "caracteres");
}
main().finally(() => db.$disconnect());
