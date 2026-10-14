// Conteúdo inicial de um órgão novo (textos de exemplo para substituir).
const vazia = { id: "", alt: "" };

export function configModelo(nome: string, sigla: string) {
  return {
    tituloSite: `${sigla} — ${nome}`.slice(0, 70),
    descricaoSeo: `Portal de ${nome}.`.slice(0, 160),
    favicon: vazia,
    whatsappNumero: "",
    whatsappMensagem: "Olá! Vim pelo portal e gostaria de atendimento.",
    whatsappFlutuante: false,
    voltarTopo: true,
  };
}

export function blocosModelo(nome: string, sigla: string): { tipo: string; area: string; dados: unknown }[] {
  return [
    {
      tipo: "cabecalho", area: "cabecalho",
      dados: {
        logo: vazia, mostrarFonte: true,
        menu: [
          { rotulo: "Institucional", destino: "#sobre" },
          { rotulo: "Serviços", destino: "#servicos" },
          { rotulo: "Notícias", destino: "#noticias" },
          { rotulo: "Contato", destino: "#fale-conosco" },
        ],
        botaoAtendimento: "",
      },
    },
    {
      tipo: "carrossel", area: "principal",
      dados: {
        tituloAcessivel: nome.slice(0, 120), fundo: vazia,
        slides: [{ titulo: sigla.slice(0, 40), texto: "Texto de apresentação\n(substitua no painel).", arte: vazia, cor: "roxo" }],
        atalhos: [],
      },
    },
    {
      tipo: "institucional", area: "principal",
      dados: {
        sobretitulo: "Quem somos", titulo: sigla.slice(0, 50), missao: "", visao: "", valores: [],
        perfil: { ativo: false, titulo: "Secretário(a)", nome: "", foto: vazia, biografia: "" },
        organograma: {
          ativo: false, titulo: "Organograma", chefe: "Secretário(a)", assessorias: [], sub: "Subsecretário(a)", grupo: "Diretorias",
          unidades: [], avulsa: { sigla: "-", nome: "-", cor: "roxo" }, imagem: vazia,
        },
        estrutura: { ativo: false, titulo: "Estrutura Organizacional", setores: [] },
        tecnologia: { ativo: false, titulo: "Atribuições", abertura: "", itens: [] },
      },
    },
    {
      tipo: "servicos", area: "principal",
      dados: { sobretitulo: "Para o cidadão", titulo: "Serviços", texto: "", itens: [] },
    },
    {
      tipo: "noticias", area: "principal",
      dados: { sobretitulo: "Acontece", titulo: "Notícias", texto: "", quantidade: 3, botaoTodas: "Ver todas as notícias" },
    },
    {
      tipo: "contato", area: "principal",
      dados: {
        sobretitulo: "Fale com a gente", titulo: "Contato", texto: "",
        formulario: { ativo: false, assuntos: [], privacidade: [] },
        endereco: "", telefone: "", email: "", horario: "",
        local: { ativo: false, sobretitulo: "Onde estamos", nome: "", descricao: "", latitude: -12.6996, longitude: -38.3263, zoom: 16, link: "" },
      },
    },
    {
      tipo: "rodape", area: "rodape",
      dados: {
        logo: vazia, tituloRedes: "Siga-nos",
        redes: [
          { rede: "facebook", url: "https://www.facebook.com/prefcamacari" },
          { rede: "instagram", url: "https://www.instagram.com/prefcamacari/" },
        ],
        tituloLinks: "Links",
        links: [{ rotulo: "Prefeitura de Camaçari", url: "https://www.camacari.ba.gov.br/" }],
        direitos: `Prefeitura Municipal de Camaçari · ${nome}`.slice(0, 120),
        creditoTexto: "", creditoLogo: vazia, creditoAlt: "",
      },
    },
  ];
}
