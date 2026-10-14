// Definição de TODOS os componentes editáveis do site: campos, limites e
// proporções de imagem. Usado pelo painel (formulários) e pelo servidor
// (validação). Para criar um componente novo: defina aqui e crie o render em
// src/blocks/render.tsx.
import { CORES, ICONES, type Campo } from "./campos";

export type Area = "cabecalho" | "principal" | "rodape";

export type DefBloco = {
  tipo: string;
  nome: string;
  descricao: string;
  area: Area;
  unico?: boolean; // só pode existir um por página
  campos: Campo[];
};

const secao = (padraoTitulo: string): Campo[] => [
  { tipo: "texto", nome: "sobretitulo", rotulo: "Sobretítulo", max: 30, ajuda: "Texto pequeno acima do título." },
  { tipo: "texto", nome: "titulo", rotulo: "Título", max: 50, obrigatorio: true, ajuda: `Ex.: ${padraoTitulo}` },
  { tipo: "texto", nome: "texto", rotulo: "Texto de apoio", max: 200, multilinha: true, linhas: 2 },
];

export const BLOCOS: DefBloco[] = [
  {
    tipo: "cabecalho",
    nome: "Cabeçalho",
    descricao: "Logomarca/assinatura, menu e botão de atendimento.",
    area: "cabecalho",
    unico: true,
    campos: [
      { tipo: "imagem", nome: "logo", rotulo: "Logomarca / assinatura", proporcao: "livre", obrigatorio: true, ajuda: "Não é recortada: só reduzida. Use PNG com fundo transparente." },
      { tipo: "booleano", nome: "mostrarFonte", rotulo: "Mostrar botões A+ / A− (tamanho da fonte)" },
      {
        tipo: "lista", nome: "menu", rotulo: "Menu", itemRotulo: "Item do menu", max: 6, resumo: "rotulo",
        campos: [
          { tipo: "texto", nome: "rotulo", rotulo: "Texto", max: 24, obrigatorio: true },
          { tipo: "url", nome: "destino", rotulo: "Destino", obrigatorio: true, ajuda: "Âncora da página (#sobre), caminho (/procuradoria/noticias) ou https://" },
        ],
      },
      { tipo: "texto", nome: "botaoAtendimento", rotulo: "Botão de atendimento (WhatsApp)", max: 20, ajuda: "Deixe vazio para esconder." },
    ],
  },
  {
    tipo: "carrossel",
    nome: "Carrossel de abertura",
    descricao: "Abertura em tela cheia com slides animados e atalhos.",
    area: "principal",
    unico: true,
    campos: [
      { tipo: "texto", nome: "tituloAcessivel", rotulo: "Título principal da página (para leitores de tela e buscadores)", max: 120, obrigatorio: true },
      { tipo: "imagem", nome: "fundo", rotulo: "Foto de fundo", proporcao: "16x9", obrigatorio: true, ajuda: "Recortada em 16:9. Ideal: 1920 px de largura ou mais." },
      {
        tipo: "lista", nome: "slides", rotulo: "Slides", itemRotulo: "Slide", min: 1, max: 6, resumo: "titulo",
        campos: [
          { tipo: "texto", nome: "titulo", rotulo: "Título", max: 40, obrigatorio: true },
          { tipo: "texto", nome: "texto", rotulo: "Texto (quebra de linha permitida)", max: 120, multilinha: true, linhas: 2 },
          { tipo: "imagem", nome: "arte", rotulo: "Ilustração", proporcao: "6x5", ajuda: "Recortada em 6:5. PNG com fundo transparente fica melhor." },
          { tipo: "selecao", nome: "cor", rotulo: "Cor do véu", opcoes: CORES },
        ],
      },
      {
        tipo: "lista", nome: "atalhos", rotulo: "Atalhos abaixo do carrossel", itemRotulo: "Atalho", max: 6, resumo: "titulo",
        campos: [
          { tipo: "texto", nome: "titulo", rotulo: "Nome", max: 16, obrigatorio: true },
          { tipo: "texto", nome: "descricao", rotulo: "Descrição", max: 50 },
          { tipo: "url", nome: "url", rotulo: "Link" },
          { tipo: "selecao", nome: "icone", rotulo: "Ícone", opcoes: ICONES },
          { tipo: "imagem", nome: "iconeImagem", rotulo: "Ícone em imagem (substitui o ícone acima)", proporcao: "livre" },
          { tipo: "selecao", nome: "cor", rotulo: "Cor", opcoes: CORES },
        ],
      },
    ],
  },
  {
    tipo: "institucional",
    nome: "Institucional (Quem somos)",
    descricao: "Missão, visão, valores e os quatro destaques com janelas animadas.",
    area: "principal",
    unico: true,
    campos: [
      { tipo: "texto", nome: "sobretitulo", rotulo: "Sobretítulo", max: 30 },
      { tipo: "texto", nome: "titulo", rotulo: "Título", max: 50, obrigatorio: true },
      { tipo: "texto", nome: "missao", rotulo: "Missão", max: 400, multilinha: true, linhas: 4 },
      { tipo: "texto", nome: "visao", rotulo: "Visão", max: 300, multilinha: true, linhas: 3 },
      { tipo: "lista", nome: "valores", rotulo: "Valores", itemRotulo: "Valor", max: 12, resumo: "texto", campos: [{ tipo: "texto", nome: "texto", rotulo: "Valor", max: 40, obrigatorio: true }] },
      {
        tipo: "grupo", nome: "perfil", rotulo: "Destaque 01 — Perfil",
        campos: [
          { tipo: "booleano", nome: "ativo", rotulo: "Mostrar" },
          { tipo: "texto", nome: "titulo", rotulo: "Título do cartão", max: 40, obrigatorio: true },
          { tipo: "texto", nome: "nome", rotulo: "Nome", max: 80 },
          { tipo: "imagem", nome: "foto", rotulo: "Foto", proporcao: "1x1", ajuda: "Recortada em 1:1 a partir do ponto focal." },
          { tipo: "texto", nome: "biografia", rotulo: "Biografia", max: 900, multilinha: true, linhas: 6 },
        ],
      },
      {
        tipo: "grupo", nome: "organograma", rotulo: "Destaque 02 — Organograma animado",
        campos: [
          { tipo: "booleano", nome: "ativo", rotulo: "Mostrar" },
          { tipo: "texto", nome: "titulo", rotulo: "Título do cartão", max: 40, obrigatorio: true },
          { tipo: "texto", nome: "chefe", rotulo: "Cargo principal (topo)", max: 40, obrigatorio: true },
          {
            tipo: "lista", nome: "assessorias", rotulo: "Órgãos de apoio (ligados à linha central, em pares esquerda/direita)", itemRotulo: "Órgão", max: 10, resumo: "nome",
            campos: [
              { tipo: "texto", nome: "nome", rotulo: "Nome", max: 60, obrigatorio: true },
              { tipo: "selecao", nome: "cor", rotulo: "Cor", opcoes: CORES },
              { tipo: "lista", nome: "subitens", rotulo: "Subunidades", itemRotulo: "Subunidade", max: 4, resumo: "nome", campos: [{ tipo: "texto", nome: "nome", rotulo: "Nome", max: 80, obrigatorio: true }] },
            ],
          },
          { tipo: "texto", nome: "sub", rotulo: "Segundo nível", max: 40, obrigatorio: true },
          { tipo: "texto", nome: "grupo", rotulo: "Agrupamento das unidades", max: 40, obrigatorio: true },
          {
            tipo: "lista", nome: "unidades", rotulo: "Unidades do agrupamento", itemRotulo: "Unidade", max: 6, resumo: "sigla",
            campos: [
              { tipo: "texto", nome: "sigla", rotulo: "Sigla", max: 10, obrigatorio: true },
              { tipo: "texto", nome: "nome", rotulo: "Nome", max: 80, obrigatorio: true },
              { tipo: "selecao", nome: "cor", rotulo: "Cor", opcoes: [...CORES, { valor: "grafite", rotulo: "Grafite" }] },
            ],
          },
          {
            tipo: "grupo", nome: "avulsa", rotulo: "Unidade ligada direto ao segundo nível",
            campos: [
              { tipo: "texto", nome: "sigla", rotulo: "Sigla", max: 10, obrigatorio: true },
              { tipo: "texto", nome: "nome", rotulo: "Nome", max: 80, obrigatorio: true },
              { tipo: "selecao", nome: "cor", rotulo: "Cor", opcoes: CORES },
            ],
          },
          { tipo: "imagem", nome: "imagem", rotulo: "Organograma em imagem (link opcional)", proporcao: "livre" },
        ],
      },
      {
        tipo: "grupo", nome: "estrutura", rotulo: "Destaque 03 — Estrutura organizacional",
        campos: [
          { tipo: "booleano", nome: "ativo", rotulo: "Mostrar" },
          { tipo: "texto", nome: "titulo", rotulo: "Título do cartão", max: 40, obrigatorio: true },
          {
            tipo: "lista", nome: "setores", rotulo: "Setores", itemRotulo: "Setor", max: 12, resumo: "titulo",
            campos: [
              { tipo: "texto", nome: "titulo", rotulo: "Nome do setor", max: 80, obrigatorio: true },
              {
                tipo: "lista", nome: "cartoes", rotulo: "Contatos", itemRotulo: "Contato", max: 12, resumo: "cargo",
                campos: [
                  { tipo: "texto", nome: "cargo", rotulo: "Cargo / função", max: 80, obrigatorio: true },
                  { tipo: "lista", nome: "nomes", rotulo: "Pessoas", itemRotulo: "Pessoa", max: 4, resumo: "nome", campos: [{ tipo: "texto", nome: "nome", rotulo: "Nome", max: 80, obrigatorio: true }] },
                  { tipo: "telefone", nome: "telefone", rotulo: "Telefone" },
                ],
              },
            ],
          },
        ],
      },
      {
        tipo: "grupo", nome: "tecnologia", rotulo: "Destaque 04 — Texto com atribuições (ex.: Diretoria de Tecnologia)",
        campos: [
          { tipo: "booleano", nome: "ativo", rotulo: "Mostrar" },
          { tipo: "texto", nome: "titulo", rotulo: "Título do cartão", max: 40, obrigatorio: true },
          { tipo: "texto", nome: "abertura", rotulo: "Texto de abertura", max: 400, multilinha: true, linhas: 3 },
          {
            tipo: "lista", nome: "itens", rotulo: "Atribuições", itemRotulo: "Atribuição", max: 6, resumo: "rotulo",
            campos: [
              { tipo: "texto", nome: "rotulo", rotulo: "Título", max: 40, obrigatorio: true },
              { tipo: "texto", nome: "texto", rotulo: "Texto", max: 400, multilinha: true, linhas: 3, obrigatorio: true },
              { tipo: "selecao", nome: "icone", rotulo: "Ícone", opcoes: [{ valor: "codigo", rotulo: "Código" }, { valor: "escudo", rotulo: "Escudo" }, { valor: "integracao", rotulo: "Integração" }] },
            ],
          },
        ],
      },
    ],
  },
  {
    tipo: "sistemas",
    nome: "Sistemas",
    descricao: "Cartões de sistemas sobre fundo roxo.",
    area: "principal",
    campos: [
      ...secao("Nossos sistemas"),
      {
        tipo: "lista", nome: "itens", rotulo: "Sistemas", itemRotulo: "Sistema", max: 8, resumo: "titulo",
        campos: [
          { tipo: "texto", nome: "etiqueta", rotulo: "Etiqueta", max: 16 },
          { tipo: "selecao", nome: "corEtiqueta", rotulo: "Cor da etiqueta", opcoes: [{ valor: "verde", rotulo: "Verde" }, { valor: "laranja", rotulo: "Laranja" }, { valor: "branco", rotulo: "Branco" }] },
          { tipo: "texto", nome: "titulo", rotulo: "Nome", max: 20, obrigatorio: true },
          { tipo: "texto", nome: "descricao", rotulo: "Descrição", max: 140, multilinha: true, linhas: 2 },
          { tipo: "url", nome: "url", rotulo: "Link" },
          { tipo: "texto", nome: "botao", rotulo: "Texto do botão", max: 20 },
        ],
      },
    ],
  },
  {
    tipo: "servicos",
    nome: "Serviços",
    descricao: "Cartões de serviços ao cidadão.",
    area: "principal",
    campos: [
      ...secao("Serviços"),
      {
        tipo: "lista", nome: "itens", rotulo: "Serviços", itemRotulo: "Serviço", max: 8, resumo: "titulo",
        campos: [
          { tipo: "selecao", nome: "icone", rotulo: "Ícone", opcoes: ICONES },
          { tipo: "selecao", nome: "cor", rotulo: "Cor", opcoes: CORES },
          { tipo: "texto", nome: "titulo", rotulo: "Título", max: 50, obrigatorio: true },
          { tipo: "texto", nome: "descricao", rotulo: "Descrição", max: 160, multilinha: true, linhas: 2 },
          { tipo: "texto", nome: "botao", rotulo: "Texto do botão", max: 24 },
          { tipo: "selecao", nome: "acao", rotulo: "Ao clicar", opcoes: [{ valor: "whatsapp", rotulo: "Abrir WhatsApp com mensagem" }, { valor: "link", rotulo: "Abrir link" }] },
          { tipo: "texto", nome: "mensagem", rotulo: "Mensagem do WhatsApp", max: 200 },
          { tipo: "url", nome: "url", rotulo: "Link" },
        ],
      },
    ],
  },
  {
    tipo: "noticias",
    nome: "Notícias",
    descricao: "Últimas notícias publicadas do órgão.",
    area: "principal",
    unico: true,
    campos: [
      ...secao("Notícias"),
      { tipo: "numero", nome: "quantidade", rotulo: "Quantidade exibida", min: 3, max: 6 },
      { tipo: "texto", nome: "botaoTodas", rotulo: "Texto do botão \"ver todas\"", max: 30 },
    ],
  },
  {
    tipo: "contato",
    nome: "Contato e localização",
    descricao: "Formulário, dados de contato e mapa.",
    area: "principal",
    unico: true,
    campos: [
      ...secao("Contato"),
      {
        tipo: "grupo", nome: "formulario", rotulo: "Formulário",
        campos: [
          { tipo: "booleano", nome: "ativo", rotulo: "Mostrar formulário" },
          { tipo: "lista", nome: "assuntos", rotulo: "Assuntos", itemRotulo: "Assunto", max: 10, resumo: "texto", campos: [{ tipo: "texto", nome: "texto", rotulo: "Assunto", max: 50, obrigatorio: true }] },
          {
            tipo: "lista", nome: "privacidade", rotulo: "Aviso de privacidade", itemRotulo: "Tópico", max: 10, resumo: "titulo",
            campos: [
              { tipo: "texto", nome: "titulo", rotulo: "Tópico", max: 40, obrigatorio: true },
              { tipo: "texto", nome: "texto", rotulo: "Texto", max: 400, multilinha: true, linhas: 3, obrigatorio: true },
            ],
          },
        ],
      },
      { tipo: "texto", nome: "endereco", rotulo: "Endereço", max: 160, multilinha: true, linhas: 2 },
      { tipo: "telefone", nome: "telefone", rotulo: "Telefone" },
      { tipo: "email", nome: "email", rotulo: "E-mail (recebe as mensagens do formulário)" },
      { tipo: "texto", nome: "horario", rotulo: "Horário de atendimento", max: 80 },
      {
        tipo: "grupo", nome: "local", rotulo: "Localização (mapa)",
        campos: [
          { tipo: "booleano", nome: "ativo", rotulo: "Mostrar mapa" },
          { tipo: "texto", nome: "sobretitulo", rotulo: "Sobretítulo", max: 30 },
          { tipo: "texto", nome: "nome", rotulo: "Nome do local", max: 80 },
          { tipo: "texto", nome: "descricao", rotulo: "Descrição", max: 200, multilinha: true, linhas: 2 },
          { tipo: "numero", nome: "latitude", rotulo: "Latitude", min: -90, max: 90, passo: 0.0000001 },
          { tipo: "numero", nome: "longitude", rotulo: "Longitude", min: -180, max: 180, passo: 0.0000001 },
          { tipo: "numero", nome: "zoom", rotulo: "Zoom", min: 10, max: 19 },
          { tipo: "url", nome: "link", rotulo: "Link do Google Maps (computador)" },
        ],
      },
    ],
  },
  {
    tipo: "chamada",
    nome: "Chamada (WhatsApp)",
    descricao: "Faixa verde convidando para o atendimento.",
    area: "principal",
    campos: [
      { tipo: "texto", nome: "titulo", rotulo: "Título", max: 60, obrigatorio: true },
      { tipo: "texto", nome: "texto", rotulo: "Texto", max: 160, multilinha: true, linhas: 2 },
      { tipo: "texto", nome: "botao", rotulo: "Texto do botão", max: 24, obrigatorio: true },
    ],
  },
  {
    tipo: "rodape",
    nome: "Rodapé",
    descricao: "Logomarca, redes sociais, links, direitos e crédito.",
    area: "rodape",
    unico: true,
    campos: [
      { tipo: "imagem", nome: "logo", rotulo: "Logomarca / assinatura", proporcao: "livre", obrigatorio: true },
      { tipo: "texto", nome: "tituloRedes", rotulo: "Título das redes sociais", max: 30 },
      {
        tipo: "lista", nome: "redes", rotulo: "Redes sociais", itemRotulo: "Rede", max: 6, resumo: "rede",
        campos: [
          { tipo: "selecao", nome: "rede", rotulo: "Rede", opcoes: [{ valor: "facebook", rotulo: "Facebook" }, { valor: "instagram", rotulo: "Instagram" }, { valor: "youtube", rotulo: "YouTube" }] },
          { tipo: "url", nome: "url", rotulo: "Link", obrigatorio: true },
        ],
      },
      { tipo: "texto", nome: "tituloLinks", rotulo: "Título dos links", max: 30 },
      {
        tipo: "lista", nome: "links", rotulo: "Links", itemRotulo: "Link", max: 8, resumo: "rotulo",
        campos: [
          { tipo: "texto", nome: "rotulo", rotulo: "Texto", max: 40, obrigatorio: true },
          { tipo: "url", nome: "url", rotulo: "Link", obrigatorio: true },
        ],
      },
      { tipo: "texto", nome: "direitos", rotulo: "Direitos (o ano é inserido automaticamente)", max: 120 },
      { tipo: "texto", nome: "creditoTexto", rotulo: "Texto do crédito", max: 30 },
      { tipo: "imagem", nome: "creditoLogo", rotulo: "Logomarca do crédito (versão clara)", proporcao: "livre" },
      { tipo: "texto", nome: "creditoAlt", rotulo: "Descrição da logomarca do crédito", max: 120 },
    ],
  },
];

export const BLOCOS_POR_TIPO = Object.fromEntries(BLOCOS.map((b) => [b.tipo, b])) as Record<string, DefBloco>;

/** Configurações globais do site do órgão. */
export const CAMPOS_CONFIG: Campo[] = [
  { tipo: "texto", nome: "tituloSite", rotulo: "Título do site (aba do navegador)", max: 70, obrigatorio: true },
  { tipo: "texto", nome: "descricaoSeo", rotulo: "Descrição para buscadores", max: 160, multilinha: true, linhas: 2 },
  { tipo: "imagem", nome: "favicon", rotulo: "Ícone da aba (favicon)", proporcao: "1x1" },
  { tipo: "texto", nome: "whatsappNumero", rotulo: "WhatsApp (só números, com 55 e DDD)", max: 13, ajuda: "Ex.: 5571999999999. Vazio = botões mostram \"em breve\"." },
  { tipo: "texto", nome: "whatsappMensagem", rotulo: "Mensagem inicial do WhatsApp", max: 200 },
  { tipo: "booleano", nome: "whatsappFlutuante", rotulo: "Mostrar botão flutuante do WhatsApp" },
  { tipo: "booleano", nome: "voltarTopo", rotulo: "Mostrar seta \"voltar ao topo\"" },
];
