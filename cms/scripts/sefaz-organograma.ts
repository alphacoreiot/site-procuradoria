// Estrutura oficial da SEFAZ (organograma enviado pela equipe).
const u = (nome: string, sigla: string) => ({ nome, sigla });

export const ORGANOGRAMA_SEFAZ = {
  sobretitulo: "Secretaria da Fazenda",
  titulo: "Estrutura organizacional",
  texto: "Passe o mouse ou navegue pelo teclado para ver a qual área cada unidade responde.",
  titular: "Secretário",
  colegiados: [u("Conselho Municipal de Contribuinte", "CMC"), u("Junta de Julgamento", "JJ")],
  assessoriaEsquerda: [u("Assessoria Técnica", "ASTEC"), u("Núcleo de Tecnologia da Informação Fazendária", "NTIF")],
  assessoriaDireita: [u("Gabinete do Secretário", "GABIS")],
  ramos: [
    { ...u("Coordenadoria de Planejamento, Gestão e Finanças", "CPLAN"), cor: "laranja", unidades: [] },
    {
      ...u("Diretoria do Tesouro Municipal", "DTM"), cor: "vermelho",
      unidades: [u("Coordenadoria de Programação Financeira", "CPROF"), u("Coordenadoria de Captação de Recursos e Operações Financeiras", "CCROF")],
    },
    {
      ...u("Diretoria da Receita Municipal", "DRM"), cor: "roxo",
      unidades: [u("Coordenadoria de Tributação", "CTRIB"), u("Coordenadoria de Fiscalização", "CFIS"), u("Coordenadoria de Informações Fiscais", "CINF")],
    },
  ],
  legenda: { subordinacao: "Subordinação administrativa", assessoria: "Assessoria", colegiados: "Órgãos colegiados" },
};

/** Textos da abertura da página inicial. */
export const ABERTURA_SEFAZ = {
  sobretitulo: "Prefeitura de Camaçari",
  titulo: "Secretaria da Fazenda",
  texto: "Tributos, legislação, processos digitais e atendimento ao contribuinte em um só lugar.",
  botao1Texto: "Emitir 2ª via",
  botao1Url: "/sefaz/sefaz-introducao",
  botao2Texto: "Processos digitais",
  botao2Url: "/sefaz/processos",
};
