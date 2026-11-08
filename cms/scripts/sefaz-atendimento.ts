// Troca o texto corrido da página Sefaz Atende pelo bloco de atendimento.
// Pode rodar mais de uma vez: só altera o que ainda não foi alterado.
import { db } from "../src/lib/db";
import { BLOCOS_POR_TIPO } from "../src/blocks/specs";
import { schemaObjeto } from "../src/blocks/campos";

const MARCADOR = "{{atendimento}}";

const ATENDIMENTO = {
  sobretitulo: "",
  titulo: "Escolha como falar com a SEFAZ",
  texto: "Atendimento de segunda a sexta-feira, das 8h às 17h.",
  telefone: "(71) 2886-1345",
  telefoneTexto: "Para tirar dúvidas, solicitar orientações ou resolver pendências.",
  whatsapp: "(71) 98796-9856",
  whatsappTexto: "Para demandas do sistema tributário que não exigem a presença do contribuinte na secretaria. Atendimento somente por mensagem.",
  chatTexto: "Tire dúvidas a qualquer hora, com respostas baseadas no Código Tributário e nos documentos oficiais da SEFAZ.",
  chatSugestoes: ["Como emitir a 2ª via?", "Quem é isento do IPTU?", "O que é o ITIV?", "Onde acho os formulários?"].map((texto) => ({ texto })),
  horaAbre: 8,
  horaFecha: 17,
  demandasTitulo: "Em que a equipe pode ajudar",
  demandas: [
    { icone: "user", texto: "Solicitação de **inscrição municipal**", tema: "Inscrição municipal", perguntas: [{ texto: "Como solicitar a inscrição municipal?" }, { texto: "O que é a Central do Empreendedor?" }, { texto: "Como faço a inscrição de autônomo?" }] },
    { icone: "ticket", texto: "Emissão de **segunda via de boletos** de tributos municipais", tema: "Segunda via de boletos", perguntas: [{ texto: "Como emitir a 2ª via de boletos?" }, { texto: "Como emitir a 2ª via do IPTU?" }, { texto: "Posso parcelar a 2ª via do IPTU?" }] },
    { icone: "doc", texto: "Suporte na emissão de **Nota Fiscal Eletrônica (NFS-e)** e **Nota Fiscal Avulsa**", tema: "Notas fiscais", perguntas: [{ texto: "Como emitir a NFS-e?" }, { texto: "Tem algum manual de NFS-e?" }, { texto: "Como emitir a Nota Fiscal Avulsa?" }] },
    { icone: "pin", texto: "Informações sobre o registro do **ITBI (Imposto sobre Transmissão de Bens Imóveis)**", tema: "ITBI (ITIV)", perguntas: [{ texto: "O que é o ITIV?" }, { texto: "Qual a alíquota do ITIV?" }, { texto: "Quais documentos preciso para reavaliação do ITIV?" }] },
    { icone: "handshake", texto: "Orientações sobre a emissão de **parcelamentos via Web**", tema: "Parcelamentos", perguntas: [{ texto: "Como parcelar meus débitos?" }, { texto: "Em quantas parcelas posso dividir meu débito?" }, { texto: "O que é o REFIS?" }] },
    { icone: "layers", texto: "Auxílio na obtenção de **certidões de tributos** municipais", tema: "Certidões de tributos", perguntas: [{ texto: "Como obter a certidão de regularidade fiscal?" }, { texto: "Como verificar a autenticidade de uma certidão?" }, { texto: "Como obter a certidão de isenção?" }] },
    { icone: "id", texto: "Auxílio no **desbloqueio de senhas** do sistema tributário", tema: "Desbloqueio de senhas", perguntas: [{ texto: "Como desbloquear minha senha do sistema tributário?" }, { texto: "Quem pode me ajudar com o desbloqueio de senha?" }] },
    { icone: "search", texto: "Esclarecimentos sobre a **abertura e andamento de processos administrativos**", tema: "Processos administrativos", perguntas: [{ texto: "Como abrir um processo digital?" }, { texto: "Quais processos posso abrir on-line?" }, { texto: "Como consultar processos pelo protocolo geral?" }] },
  ],
  sobreTitulo: "Sobre o Call Center",
  sobreTexto: `O Call Center da Secretaria da Fazenda está estruturado para prestar um melhor atendimento ao contribuinte. Localizado no prédio da SEFAZ, ele conta com sala exclusiva, além de computadores e equipamentos adequados para que os profissionais possam esclarecer dúvidas e auxiliar na realização de procedimentos online.

Por meio do sistema, além de atender às demandas internas do Poder Executivo Municipal, o serviço também permite que a população consulte dados e informações diretamente no site da Prefeitura, promovendo mais transparência e comodidade.

O atendimento é realizado por profissionais capacitados e prontos para oferecer suporte de forma clara, ágil e eficiente, garantindo um relacionamento mais próximo entre a SEFAZ e o cidadão.`,
  imagem: { id: "cmw58fapw00jmkausa3kl2luq", alt: "Atendente sorrindo com fone de ouvido: nosso Call Center está sempre pronto para o melhor atendimento." },
};

async function main() {
  const dados = JSON.stringify(schemaObjeto(BLOCOS_POR_TIPO.atendimento.campos).parse(ATENDIMENTO));
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const p = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "sefaz-atende" } } });

  const b = await db.bloco.findFirst({ where: { paginaId: p.id, tipo: "atendimento" } });
  if (b) await db.bloco.update({ where: { id: b.id }, data: { dados } });
  else await db.bloco.create({ data: { paginaId: p.id, tipo: "atendimento", area: "principal", ordem: 0, dados } });
  console.log("bloco ok");

  if (p.conteudo.includes(MARCADOR)) { console.log("corpo da página já estava alterado"); return; }
  const capa = p.conteudo.split(/\n{2,}/)[0].trim();
  if (!/^!\[.*\]\(\/media\//.test(capa) || !p.conteudo.includes("98796-9856") || p.conteudo.length > 3000) throw new Error("conteúdo inesperado na página");
  await db.pagina.update({ where: { id: p.id }, data: { conteudo: `${capa}\n\n${MARCADOR}\n` } });
  console.log("corpo da página trocado");
}
main().finally(() => db.$disconnect());
