// Grava no bloco do organograma da SEFAZ o texto usado se a animação não carregar
// e tira do corpo da página a mesma lista, que ficava repetida acima da animação.
import { PrismaClient } from "@prisma/client";
import { TEXTO_RESERVA_SEFAZ } from "./sefaz-organograma";

const INICIO = "**I. Orgãos Colegiados**";
const MARCADOR = "{{organograma}}";
const db = new PrismaClient();
(async () => {
  const blocos = await db.bloco.findMany({ where: { tipo: "organograma", pagina: { orgao: { slug: "sefaz" } } }, include: { pagina: true } });
  if (blocos.length !== 1) throw new Error(`esperava 1 bloco, achei ${blocos.length}`);
  const bloco = blocos[0];
  const dados = JSON.parse(bloco.dados);
  dados.textoReserva = TEXTO_RESERVA_SEFAZ;
  await db.bloco.update({ where: { id: bloco.id }, data: { dados: JSON.stringify(dados) } });
  console.log("texto gravado no bloco", bloco.id);

  const c = bloco.pagina.conteudo;
  const ini = c.indexOf(INICIO), fim = c.indexOf(MARCADOR);
  if (ini < 0) { console.log("corpo da página já estava limpo"); }
  else {
    if (fim < ini) throw new Error("marcador do organograma fora do lugar");
    const removido = c.slice(ini, fim);
    if (!removido.includes("CINF") || removido.length > 900) throw new Error(`trecho inesperado (${removido.length} caracteres)`);
    await db.pagina.update({ where: { id: bloco.paginaId }, data: { conteudo: c.slice(0, ini) + c.slice(fim) } });
    console.log("lista repetida removida do corpo:", removido.length, "caracteres");
  }
  await db.$disconnect();
})();
