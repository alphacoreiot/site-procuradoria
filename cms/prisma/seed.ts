/**
 * Seed: cria a Procuradoria-Geral do Município com TODO o conteúdo do site
 * atual (textos, contatos, organograma, estrutura, imagens) e o usuário
 * inicial da Prefeitura (SUPERADMIN).
 *
 *   npm run seed            (idempotente: não duplica se já existir)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "@node-rs/argon2";
import { db } from "../src/lib/db";
import { salvarUpload } from "../src/lib/media-core";
import { BLOCOS_POR_TIPO, CAMPOS_CONFIG } from "../src/blocks/specs";
import { schemaObjeto } from "../src/blocks/campos";

const ESTATICO = path.resolve(__dirname, "../../public/assets"); // site estático (fonte das imagens)

async function importar(orgaoId: string, rel: string, alt = "") {
  const dados = await readFile(path.join(ESTATICO, rel));
  const m = await salvarUpload({ dados, nomeOriginal: path.basename(rel), orgaoId, alt, permitirSvg: rel.endsWith(".svg") });
  return { id: m.id, alt };
}

function validar(tipo: string, dados: unknown) {
  const campos = tipo === "__config" ? CAMPOS_CONFIG : BLOCOS_POR_TIPO[tipo].campos;
  const r = schemaObjeto(campos).safeParse(dados);
  if (!r.success) {
    console.error(`Dados inválidos no bloco "${tipo}":`, JSON.stringify(r.error.issues.slice(0, 5), null, 2));
    process.exit(1);
  }
  return JSON.stringify(r.data);
}

const n = (nome: string) => ({ nome });

async function main() {
  // ---------------------------------------------------------------- SUPERADMIN
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const senha = process.env.SEED_ADMIN_PASSWORD || "";
  if (!email || senha.length < 12) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (12+ caracteres) no .env");
  if (!(await db.usuario.findUnique({ where: { email } }))) {
    await db.usuario.create({
      data: {
        email, nome: "Administração da Prefeitura", papel: "SUPERADMIN", orgaoId: null,
        senhaHash: await hash(senha, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 }),
      },
    });
    console.log(`✔ SUPERADMIN criado: ${email}`);
  }

  // ---------------------------------------------------------------- Procuradoria
  if (await db.orgao.findUnique({ where: { slug: "procuradoria" } })) {
    console.log("• Procuradoria já existe — nada a fazer.");
    return;
  }
  const orgao = await db.orgao.create({
    data: { slug: "procuradoria", nome: "Procuradoria-Geral do Município de Camaçari", sigla: "PROGER" },
  });
  const id = orgao.id;

  console.log("… importando imagens do site estático");
  const assinatura = await importar(id, "logos/assinatura-proger.png", "Prefeitura de Camaçari — Procuradoria Geral do Município");
  const favicon = await importar(id, "logos/favicon-192.png");
  const fundo = await importar(id, "img/carrossel/download.jpg", "Sede da Procuradoria-Geral do Município");
  const arte1 = await importar(id, "img/carrossel/01-defesa.svg");
  const arte2 = await importar(id, "img/carrossel/02-divida-ativa.svg");
  const arte3 = await importar(id, "img/carrossel/03-consultoria.svg");
  const arte4 = await importar(id, "img/carrossel/04-atendimento.svg");
  const sei = await importar(id, "logos/sei-branco.png");
  const foto = await importar(id, "img/carrossel/foto_procurador_geral.png", "Pedro Jorge Vilas Boas Alfredo Guimarães, Procurador-Geral");
  const orgImg = await importar(id, "img/organograma-pgm.png", "Organograma institucional da Procuradoria Geral do Município");
  const ditec = await importar(id, "logos/pgm-ditec-branco.png", "PGM-DITEC — Procuradoria-Geral, Diretoria de Tecnologia");
  // ponto focal da foto do Procurador um pouco acima do centro (rosto)
  await db.midia.update({ where: { id: foto.id }, data: { focoY: 0.4 } });

  await db.configuracao.create({
    data: {
      orgaoId: id,
      dados: validar("__config", {
        tituloSite: "PROGER — Procuradoria-Geral do Município de Camaçari",
        descricaoSeo: "Portal da Procuradoria-Geral do Município de Camaçari (PROGER): serviços ao contribuinte, sistemas e atendimento.",
        favicon,
        whatsappNumero: "",
        whatsappMensagem: "Olá! Vim pelo portal da Procuradoria e gostaria de atendimento.",
        whatsappFlutuante: true,
        voltarTopo: true,
      }),
    },
  });

  const blocos: { tipo: string; area: string; dados: unknown }[] = [
    {
      tipo: "cabecalho", area: "cabecalho",
      dados: {
        logo: assinatura, mostrarFonte: true,
        menu: [
          { rotulo: "Institucional", destino: "#sobre" },
          { rotulo: "Sistemas", destino: "#sistemas" },
          { rotulo: "Serviços", destino: "#servicos" },
          { rotulo: "Notícias", destino: "#noticias" },
          { rotulo: "Contato", destino: "#fale-conosco" },
        ],
        botaoAtendimento: "Atendimento",
      },
    },
    {
      tipo: "carrossel", area: "principal",
      dados: {
        tituloAcessivel: "PROGER — Procuradoria-Geral do Município de Camaçari",
        fundo,
        slides: [
          { titulo: "Defesa do Município", texto: "Representação judicial e extrajudicial\nem defesa do interesse público.", arte: arte1, cor: "roxo" },
          { titulo: "Dívida Ativa", texto: "Cobrança e negociação\ndos créditos do Município.", arte: arte2, cor: "laranja" },
          { titulo: "Consultoria Jurídica", texto: "Assessoramento jurídico\naos órgãos da Administração.", arte: arte3, cor: "verde" },
          { titulo: "Atendimento ao Cidadão", texto: "Canais diretos para dúvidas\ne solicitações do contribuinte.", arte: arte4, cor: "vermelho" },
        ],
        atalhos: [
          { titulo: "SPG-C", descricao: "Sistema de Procuradoria Geral - Camaçari", url: "", icone: "layers", iconeImagem: { id: "", alt: "" }, cor: "vermelho" },
          { titulo: "SGPM-C", descricao: "Sistema de gestão da Procuradoria", url: "https://sgpmc.camacari.ba.gov.br/", icone: "grid", iconeImagem: { id: "", alt: "" }, cor: "verde" },
          { titulo: "SCP-C", descricao: "Sistema de Chamados da Procuradoria", url: "", icone: "ticket", iconeImagem: { id: "", alt: "" }, cor: "laranja" },
          { titulo: "SEI", descricao: "Sistema SEI Camaçari", url: "https://sei.camacari.ba.gov.br/", icone: "doc", iconeImagem: sei, cor: "roxo" },
        ],
      },
    },
    {
      tipo: "institucional", area: "principal",
      dados: {
        sobretitulo: "Quem somos",
        titulo: "A Procuradoria",
        missao: "Representar e defender judicial e extrajudicialmente o Município de Camaçari e orientar juridicamente a Administração Municipal, zelando pela legalidade dos atos e pela proteção do interesse público e do patrimônio municipal.",
        visao: "Ser reconhecida como instituição de excelência na advocacia pública, com atuação técnica, eficiente e inovadora.",
        valores: ["Legalidade", "Ética e probidade", "Impessoalidade", "Transparência", "Eficiência", "Compromisso com o interesse público", "Valorização dos servidores", "Unidade institucional"].map((texto) => ({ texto })),
        perfil: {
          ativo: true, titulo: "Procurador Geral", nome: "Pedro Jorge Vilas Boas Alfredo Guimarães", foto,
          biografia: "Funcionário concursado desde 2014, assumiu o cargo de Procurador-Geral em 03/09/2026. O atual Procurador-Geral tem notório saber nos processos administrativos da Procuradoria Geral do Município de Camaçari. Já atuou como Superintendente do Instituto de Seguridade do Servidor Municipal - ISSM entre 2019 e 2022.",
        },
        organograma: {
          ativo: true, titulo: "Organograma Institucional", chefe: "Procurador-Geral",
          assessorias: [
            { nome: "Conselho de Procuradores", cor: "verde", subitens: [] },
            { nome: "Comissões Permanentes", cor: "verde", subitens: [n("CP de Estudos e Informações Jurídicas"), n("CP de Precatórios e Requisição de Pequenos Valores")] },
            { nome: "Diretoria de Tecnologia da Informação", cor: "laranja", subitens: [] },
            { nome: "Grupo de Apoio ao Executivo Fiscal", cor: "roxo", subitens: [] },
            { nome: "Assessoria Técnica", cor: "laranja", subitens: [] },
            { nome: "Assessoria do Procurador Geral", cor: "roxo", subitens: [] },
          ],
          sub: "Sub-Procurador Geral",
          grupo: "Procuradorias Especiais",
          unidades: [
            { sigla: "PROAD", nome: "Procuradoria Administrativa", cor: "roxo" },
            { sigla: "PCCT", nome: "Procuradoria do Contencioso, Cível e Trabalhista", cor: "vermelho" },
            { sigla: "PROFIS", nome: "Procuradoria Fiscal e Tributária", cor: "verde" },
            { sigla: "PROAES", nome: "Procuradoria de Ações Estratégicas", cor: "grafite" },
          ],
          avulsa: { sigla: "CDA", nome: "Coordenadoria da Dívida Ativa", cor: "laranja" },
          imagem: orgImg,
        },
        estrutura: {
          ativo: true, titulo: "Estrutura Organizacional",
          setores: [
            { titulo: "Gabinete", cartoes: [
              { cargo: "Procurador Geral", nomes: [n("Pedro Jorge Vilas Boas Alfredo Guimarães")], telefone: "(71) 3674-8519" },
              { cargo: "Subprocurador Geral", nomes: [n("Pedro Jorge Vilas Boas Alfredo Guimarães")], telefone: "(71) 3674-8545" },
              { cargo: "ASTEC", nomes: [n("Adrielle Cristine de Santana Ferreira")], telefone: "(71) 3674-8544" },
              { cargo: "ASTEC", nomes: [n("Aline Salustiano Nova Dias")], telefone: "(71) 3674-8528" },
              { cargo: "DITEC - Diretoria de Tecnologia", nomes: [n("Martinho Apóstolo de Jesus Jr.")], telefone: "(71) 3674-8506" },
              { cargo: "Recepção ASTEC", nomes: [n("Ana Ferreira dos Santos")], telefone: "(71) 3674-8536" },
            ] },
            { titulo: "Procuradoria Administrativa", cartoes: [
              { cargo: "Coordenador(a) Procuradoria Administrativa", nomes: [n("Thelma Mendes de Carvalho Melo")], telefone: "(71) 3674-8527" },
              { cargo: "Procuradores ADM", nomes: [], telefone: "(71) 3674-8529" },
            ] },
            { titulo: "Procuradoria do Contencioso, Cível e Trabalhista", cartoes: [
              { cargo: "Coordenador(a) Contencioso", nomes: [n("Renan Machado Lima")], telefone: "(71) 3674-8525" },
              { cargo: "Procuradores Contencioso", nomes: [], telefone: "(71) 3674-8512" },
            ] },
            { titulo: "Procuradoria Fiscal e Tributária", cartoes: [
              { cargo: "Coordenador(a) Procuradoria Fiscal", nomes: [n("Virginia Santana Correa Oliveira")], telefone: "(71) 3674-8526" },
              { cargo: "Procuradores Fiscal", nomes: [], telefone: "(71) 3674-8535" },
              { cargo: "Assessores Fiscal", nomes: [], telefone: "(71) 3674-8508" },
              { cargo: "Atendimento Fiscal", nomes: [n("Isac Silva de Almeida"), n("Marivania Araujo Melo")], telefone: "(71) 3674-8534" },
            ] },
            { titulo: "Procuradoria de Ações Estratégicas", cartoes: [
              { cargo: "Coordenador(a) Procuradoria de Ações Estratégicas", nomes: [n("Daniela Augusta Santos Brandão")], telefone: "(71) 3674-8525" },
            ] },
            { titulo: "Coordenadoria da Dívida Ativa", cartoes: [
              { cargo: "Coordenador(a) da Dívida Ativa", nomes: [n("Carolina Strauch de Souza")], telefone: "(71) 3674-8537" },
              { cargo: "Assessores Dívida Ativa", nomes: [], telefone: "(71) 3674-8531" },
              { cargo: "Atendimento Dívida Ativa", nomes: [], telefone: "(71) 3674-8530" },
            ] },
          ],
        },
        tecnologia: {
          ativo: true, titulo: "Diretoria de Tecnologia",
          abertura: "A Diretoria de Tecnologia da Informação da Procuradoria-Geral do Município de Camaçari é responsável por planejar, coordenar e manter a política de TI do órgão, usando a tecnologia como ferramenta de gestão para ganhar qualidade, integração e modernização nos processos.",
          itens: [
            { rotulo: "Sistemas e equipes", icone: "codigo", texto: "Cabe a ela dirigir as equipes que desenvolvem sistemas e aplicativos, manter os sistemas em produção, sejam eles desenvolvidos, adquiridos ou cedidos, e definir os fluxos de informação conforme as necessidades dos serviços da Procuradoria." },
            { rotulo: "Segurança da informação", icone: "escudo", texto: "Também implanta e mantém a política de privacidade e segurança da informação, além de planejar e acompanhar a aquisição de softwares e equipamentos de informática." },
            { rotulo: "Integração", icone: "integracao", texto: "Outro foco é a integração entre o sistema da PGM, a Secretaria da Fazenda e os Tribunais de Justiça, com o objetivo de aumentar a arrecadação do crédito tributário." },
          ],
        },
      },
    },
    {
      tipo: "sistemas", area: "principal",
      dados: {
        sobretitulo: "Plataformas", titulo: "Nossos sistemas",
        texto: "Ferramentas desenvolvidas para tornar o trabalho da Procuradoria mais ágil e transparente.",
        itens: [
          { etiqueta: "Novo", corEtiqueta: "laranja", titulo: "SPG-C", descricao: "Sistema de Procuradoria Geral - Camaçari.", url: "", botao: "Conhecer" },
          { etiqueta: "Uso interno", corEtiqueta: "verde", titulo: "SGPM-C", descricao: "Sistema de gestão da Procuradoria: processos, prazos e acompanhamento das demandas.", url: "https://sgpmc.camacari.ba.gov.br/", botao: "Acessar sistema" },
          { etiqueta: "Chamados", corEtiqueta: "branco", titulo: "SCP-C", descricao: "Sistema de Chamados da Procuradoria.", url: "", botao: "Acessar sistema" },
          { etiqueta: "Processos", corEtiqueta: "verde", titulo: "SEI", descricao: "Sistema SEI Camaçari — Sistema Eletrônico de Informações.", url: "https://sei.camacari.ba.gov.br/", botao: "Acessar sistema" },
        ],
      },
    },
    {
      tipo: "servicos", area: "principal",
      dados: {
        sobretitulo: "Para o contribuinte", titulo: "Serviços",
        texto: "Os principais atendimentos da Procuradoria. Em caso de dúvida, fale com a gente pelo WhatsApp.",
        itens: [
          { icone: "search", cor: "roxo", titulo: "Consulta de Dívida Ativa", descricao: "Saiba se há débitos inscritos em Dívida Ativa do Município em seu nome ou do seu imóvel.", botao: "Solicitar consulta", acao: "whatsapp", mensagem: "Olá! Gostaria de consultar débitos em Dívida Ativa.", url: "" },
          { icone: "handshake", cor: "laranja", titulo: "Negociação e parcelamento", descricao: "Regularize sua situação com as condições de negociação vigentes para débitos inscritos.", botao: "Quero negociar", acao: "link", mensagem: "", url: "https://sefazweb.camacari.ba.gov.br/prefeituras/loginb.tela" },
          { icone: "doc", cor: "verde", titulo: "Certidões", descricao: "Orientações sobre emissão de certidões relacionadas a débitos inscritos em Dívida Ativa.", botao: "Pedir orientação", acao: "link", mensagem: "", url: "https://sefazweb.camacari.ba.gov.br/prefeituras/loginb.tela" },
          { icone: "inbox", cor: "vermelho", titulo: "Solicitações e requerimentos", descricao: "Envie pedidos, documentos e requerimentos à Procuradoria e acompanhe o andamento.", botao: "Fazer solicitação", acao: "whatsapp", mensagem: "Olá! Gostaria de fazer uma solicitação à Procuradoria.", url: "" },
        ],
      },
    },
    {
      tipo: "noticias", area: "principal",
      dados: { sobretitulo: "Acontece na Procuradoria", titulo: "Notícias", texto: "", quantidade: 3, botaoTodas: "Ver todas as notícias" },
    },
    {
      tipo: "contato", area: "principal",
      dados: {
        sobretitulo: "Fale com a gente", titulo: "Contato",
        texto: "Envie sua dúvida, sugestão ou solicitação à Procuradoria-Geral do Município ou venha até nós.",
        formulario: {
          ativo: true,
          assuntos: ["Consulta de Dívida Ativa", "Negociação e parcelamento", "Certidões", "Solicitações e requerimentos", "Sugestão ou elogio", "Outro assunto"].map((texto) => ({ texto })),
          privacidade: [
            { titulo: "Quem trata os dados", texto: "Procuradoria-Geral do Município de Camaçari (PGM-C)." },
            { titulo: "Quais dados", texto: "nome, CPF, e-mail, telefone e o conteúdo da mensagem." },
            { titulo: "Para quê", texto: "responder à sua solicitação. O nome e o CPF são meramente para sua identificação como contribuinte; o e-mail e o telefone, para entrar em contato sobre o seu atendimento." },
            { titulo: "Como", texto: "este site não armazena os dados digitados. A mensagem é enviada pelo seu próprio aplicativo de e-mail para proger@camacari.ba.gov.br." },
            { titulo: "Compartilhamento", texto: "somente com órgãos da Prefeitura quando necessário ao atendimento ou por obrigação legal." },
            { titulo: "Guarda", texto: "pelo tempo necessário ao atendimento e ao cumprimento de obrigações legais." },
            { titulo: "Seus direitos", texto: "pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir acesso, correção ou eliminação dos seus dados pelo e-mail acima." },
          ],
        },
        endereco: "Rua do Contorno do Centro Administrativo, s/n, Centro, Camaçari - BA, 42800-918",
        telefone: "(71) 3674-8544",
        email: "proger@camacari.ba.gov.br",
        horario: "Segunda a sexta, das 8h às 17h",
        local: {
          ativo: true, sobretitulo: "Onde estamos", nome: "Anexo PMC — Procuradoria Geral do Município",
          descricao: "Atendimento presencial no Anexo da Prefeitura, junto à Controladoria Geral do Município.",
          latitude: -12.7068191, longitude: -38.3190499, zoom: 17, link: "https://maps.app.goo.gl/Hhuh3YWWdZXVPY858",
        },
      },
    },
    {
      tipo: "chamada", area: "principal",
      dados: { titulo: "Ficou com alguma dúvida?", texto: "Nosso atendimento pelo WhatsApp tira dúvidas e recebe solicitações do contribuinte.", botao: "Iniciar conversa" },
    },
    {
      tipo: "rodape", area: "rodape",
      dados: {
        logo: assinatura,
        tituloRedes: "Siga-nos",
        redes: [
          { rede: "facebook", url: "https://www.facebook.com/prefcamacari" },
          { rede: "instagram", url: "https://www.instagram.com/prefcamacari/" },
          { rede: "youtube", url: "https://www.youtube.com/channel/UCM1IhLfOPxAmtDymf5n22QQ" },
        ],
        tituloLinks: "Links",
        links: [
          { rotulo: "Prefeitura de Camaçari", url: "https://www.camacari.ba.gov.br/" },
          { rotulo: "SEFAZ Camaçari", url: "https://sefaz.camacari.ba.gov.br/" },
          { rotulo: "Acesso à informação", url: "https://www.gov.br/acessoainformacao/pt-br" },
          { rotulo: "Portal do Governo Brasileiro", url: "https://www.gov.br/pt-br" },
          { rotulo: "Portal da Transparência", url: "https://portaldatransparencia.gov.br/" },
        ],
        direitos: "Prefeitura Municipal de Camaçari · Procuradoria Geral do Município",
        creditoTexto: "Desenvolvido por",
        creditoLogo: ditec,
        creditoAlt: "PGM-DITEC — Procuradoria-Geral, Diretoria de Tecnologia",
      },
    },
  ];

  const pagina = await db.pagina.create({
    data: { orgaoId: id, slug: "inicio", titulo: "Página inicial", descricaoSeo: "" },
  });
  let ordem = 0;
  for (const b of blocos) {
    await db.bloco.create({ data: { paginaId: pagina.id, tipo: b.tipo, area: b.area, ordem: ordem++, dados: validar(b.tipo, b.dados) } });
  }

  // notícia inicial (o portal é novo)
  await db.noticia.create({
    data: {
      orgaoId: id, slug: "procuradoria-lanca-novo-portal",
      titulo: "Procuradoria-Geral do Município lança novo portal",
      resumo: "O novo site reúne em um só lugar os serviços ao contribuinte, os sistemas da Procuradoria, a estrutura organizacional e os canais de atendimento.",
      conteudo: [
        "A Procuradoria-Geral do Município de Camaçari (PROGER) está com um **novo portal**.",
        "No site, o cidadão encontra:",
        "- os **serviços ao contribuinte**, como consulta de Dívida Ativa, negociação e certidões;",
        "- o acesso aos **sistemas** da Procuradoria;",
        "- a **estrutura organizacional**, com os contatos de cada setor;",
        "- os **canais de atendimento** e a localização da sede.",
        "",
        "O portal foi desenvolvido pela Diretoria de Tecnologia da Informação da Procuradoria (PGM-DITEC).",
      ].join("\n"),
      capaId: fundo.id, capaAlt: "Sede da Procuradoria-Geral do Município",
      categoria: "Institucional", destaque: true, status: "PUBLICADA", publicadaEm: new Date(),
    },
  });

  console.log(`✔ Procuradoria criada com ${blocos.length} componentes, 11 imagens e 1 notícia.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
