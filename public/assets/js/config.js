/*
 * Configuração do portal PROGER.
 * Edite os valores abaixo (ou monte outro config.js por cima deste arquivo
 * no container — veja o docker-compose.yml) sem mexer no HTML.
 * Campos vazios mantêm o texto/link padrão da página.
 */
window.PROGER_CONFIG = {
  // Sistemas
  sgpmcUrl: "https://sgpmc.camacari.ba.gov.br/", // SGPM-C — Sistema de gestão da Procuradoria
  spgcUrl: "",               // SPG-C — Sistema de Procuradoria Geral - Camaçari
  scpcUrl: "",               // SCP-C — Sistema de Chamados da Procuradoria
  seiUrl: "https://sei.camacari.ba.gov.br/", // SEI — Sistema SEI Camaçari

  // WhatsApp: só dígitos, com DDI e DDD (ex.: "5571999999999")
  whatsappNumero: "",
  whatsappMensagem: "Olá! Vim pelo portal da Procuradoria e gostaria de atendimento.",

  // Contato
  telefone: "(71) 3674-8544",
  email: "proger@camacari.ba.gov.br",
  endereco: "Rua do Contorno do Centro Administrativo, s/n, Centro, Camaçari - BA, 42800-918",
  horario: "Segunda a sexta, das 8h às 17h",

  // Localização (mapa da seção "Contato")
  localNome: "Anexo PMC — Procuradoria Geral do Município",
  mapa: {
    lat: -12.7068191,
    lng: -38.3190499,
    zoom: 17,
    // link do Google Maps usado no computador (no celular abre o app padrão)
    link: "https://maps.app.goo.gl/Hhuh3YWWdZXVPY858"
  }
};
