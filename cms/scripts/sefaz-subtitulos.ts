// Subtítulo das páginas da SEFAZ (mesmo campo da descrição para buscadores, até 160 caracteres).
// Só preenche o que está vazio: o que for escrito no painel não é sobrescrito.
// Uso: DATABASE_URL=... npx tsx scripts/sefaz-subtitulos.ts
import { db } from "../src/lib/db";

export const SUBTITULOS: Record<string, string> = {
  "codigo-tributario": "Código Tributário e de Rendas do Município de Camaçari, consolidado e pronto para download.",
  "como-chegar": "Endereço, horários e orientações para o atendimento presencial da SEFAZ.",
  cosip: "Contribuição para o custeio da iluminação pública: quem paga, quem é isento e como emitir.",
  dte: "Domicílio Tributário Eletrônico: o que é, como funciona e quais são os benefícios de aderir.",
  empreendedor: "Soluções práticas para abrir, regularizar e manter sua empresa em Camaçari.",
  geomais: "Geoprocessamento do Cadastro Imobiliário, Mobiliário e de Logradouros, com informações técnicas e relatórios.",
  inscricaoautonomo: "Como fazer a inscrição municipal de profissionais autônomos, liberais ou não.",
  iptu: "Tudo sobre o Imposto Predial e Territorial Urbano: cálculo, isenções, descontos e pagamento.",
  iss: "Imposto sobre Serviços: quem deve pagar, como declarar e onde emitir as guias.",
  itiv: "Imposto sobre a transmissão de imóveis: quando incide, como solicitar e como pagar.",
  "nfs-e": "Orientações para emitir a Nota Fiscal de Serviços Eletrônica, incluindo o padrão nacional para MEI.",
  "nfs-e-novo-link": "Novo endereço de acesso ao WebService da NFS-e de Camaçari.",
  parcelamento: "Como funciona o parcelamento de débitos, os benefícios e os requisitos para participar.",
  "pgto-cartao-credito": "Pague débitos municipais no cartão de crédito, com parcelamento, pelo Sistema Tributário.",
  "politica-de-cookies": "Como este site usa cookies e como você pode gerenciá-los.",
  "portal-nfse-sefaz-camacari": "Informações, normas e acessos da NFS-e Padrão Nacional em Camaçari.",
  "refis-2": "Programa de regularização de débitos tributários e não tributários do município.",
  secretaria: "Finalidade, áreas de competência e estrutura organizacional da Secretaria da Fazenda.",
  "sefaz-atende": "Canais de atendimento para tirar dúvidas e fazer procedimentos on-line.",
  "sefaz-introducao": "Emita a 2ª via dos tributos municipais de forma simples, com pagamento por PIX ou cartão.",
  servicos: "Encontre os serviços on-line, consultas e sistemas da Secretaria da Fazenda em um só lugar.",
  "simples-2": "Regime tributário unificado para Microempresas e Empresas de Pequeno Porte.",
  tff: "Taxa de Fiscalização do Funcionamento: enquadramento, prazos e como emitir.",
  trsd: "Taxa de Resíduos Sólidos Domiciliares: fato gerador, valores e como pagar.",
};
export const TITULOS: Record<string, string> = { "sefaz-introducao": "2ª via de tributos" };

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  let n = 0;
  for (const [slug, texto] of Object.entries(SUBTITULOS)) {
    if (texto.length > 160) throw new Error(`Longo demais: ${slug} (${texto.length})`);
    const p = await db.pagina.findUnique({ where: { orgaoId_slug: { orgaoId: o.id, slug } } });
    if (!p) continue;
    const titulo = TITULOS[slug] && p.titulo === "Introdução" ? TITULOS[slug] : p.titulo;
    if (p.descricaoSeo && titulo === p.titulo) continue;
    await db.pagina.update({ where: { id: p.id }, data: { descricaoSeo: p.descricaoSeo || texto, titulo } });
    n++;
  }
  console.log("paginas atualizadas", n);
}
if (require.main === module) main().finally(() => db.$disconnect());
