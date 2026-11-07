// Reúne o que o assistente conhece: Código e leis (por artigo), documentos,
// páginas do site, processos digitais e notícias recentes.
import { db } from "../db";
import { fraseAmigavel } from "../texto";
import { Indice, type ItemBase } from "./busca";

const VALIDADE = 15 * 60 * 1000;
const cache = new Map<string, { em: number; indice: Indice }>();

const semMarcas = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_\\>]/g, "").replace(/\s+/g, " ").trim();

function trechosDaPagina(titulo: string, url: string, md: string): ItemBase[] {
  const itens: ItemBase[] = [];
  let atual = titulo, buffer: string[] = [];
  const soltar = () => {
    const texto = semMarcas(buffer.join(" "));
    if (texto.length >= 40) itens.push({ tipo: "pagina", titulo, rotulo: atual === titulo ? "" : semMarcas(atual).slice(0, 90), texto: texto.slice(0, 1500), url, peso: 1.25 });
    buffer = [];
  };
  for (const b of md.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const h = b.match(/^#{2,3}\s+(.+)$/);
    if (h) { soltar(); atual = h[1]; } else if (!b.includes("{{")) buffer.push(b);
  }
  soltar();
  return itens;
}

export async function indiceDoOrgao(orgaoId: string, slug: string) {
  const c = cache.get(orgaoId);
  if (c && Date.now() - c.em < VALIDADE) return c.indice;

  const [docs, trechos, paginas, processos, noticias] = await Promise.all([
    db.documento.findMany({ where: { orgaoId, publicado: true }, select: { id: true, titulo: true, categoria: true, ano: true, descricao: true, tipo: true, arquivo: true, linkExterno: true } }),
    db.trecho.findMany({ where: { documento: { orgaoId, publicado: true } }, select: { documentoId: true, pagina: true, rotulo: true, secao: true, texto: true } }),
    db.pagina.findMany({ where: { orgaoId, publicada: true, slug: { not: "inicio" } }, select: { slug: true, titulo: true, conteudo: true } }),
    db.processo.findMany({ where: { orgaoId, publicado: true }, select: { slug: true, titulo: true, exigencias: true } }),
    db.noticia.findMany({ where: { orgaoId, status: "PUBLICADA", publicadaEm: { lte: new Date() } }, orderBy: { publicadaEm: "desc" }, take: 40, select: { slug: true, titulo: true, resumo: true, categoria: true, publicadaEm: true } }),
  ]);

  const porId = new Map(docs.map((d) => [d.id, d]));
  const comTexto = new Set(trechos.map((t) => t.documentoId));
  const itens: ItemBase[] = [];

  for (const t of trechos) {
    const d = porId.get(t.documentoId);
    if (!d) continue;
    const codigo = d.categoria === "Código Tributário";
    itens.push({
      tipo: d.tipo === "LEGISLACAO" || d.categoria === "Normas e comunicados" ? "lei" : "documento",
      titulo: codigo ? "Código Tributário do Município" : fraseAmigavel(d.titulo),
      rotulo: t.rotulo,
      texto: `${t.secao ? `(${t.secao}) ` : ""}${t.texto}`,
      url: `/doc/${d.id}#page=${t.pagina}`,
      chave: codigo && /^Art\. \d+/.test(t.rotulo) ? t.rotulo.replace(/ \(cont\.\)$/, "") : undefined,
      peso: codigo ? 1.6 : 1,
    });
  }
  // documentos sem texto legível entram pelo título, para o assistente saber indicar
  for (const d of docs) {
    if (comTexto.has(d.id)) continue;
    const href = d.arquivo ? `/doc/${d.id}` : d.linkExterno;
    if (!href) continue;
    itens.push({ tipo: "documento", titulo: fraseAmigavel(d.titulo), rotulo: d.ano ? String(d.ano) : "", texto: `Documento da categoria ${d.categoria || "geral"}. ${d.descricao}`.trim(), url: href, peso: 1.1 });
  }
  for (const p of paginas) itens.push(...trechosDaPagina(p.titulo, `/${slug}/${p.slug}`, p.conteudo));
  for (const p of processos) {
    let lista = "";
    try {
      const ex: { documento: string; obrigatorio: boolean }[] = JSON.parse(p.exigencias);
      lista = ex.map((e) => `${fraseAmigavel(e.documento)} (${e.obrigatorio ? "obrigatório" : "quando se aplica"})`).join("; ");
    } catch { /* sem lista */ }
    itens.push({ tipo: "processo", titulo: `Processo digital: ${fraseAmigavel(p.titulo)}`, rotulo: "", texto: `Documentos necessários: ${lista}`, url: `/${slug}/processos/${p.slug}`, peso: 1.3 });
  }
  for (const n of noticias) {
    itens.push({ tipo: "noticia", titulo: n.titulo, rotulo: n.publicadaEm ? n.publicadaEm.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" }) : "", texto: n.resumo, url: `/${slug}/noticias/${n.slug}`, peso: 0.7 });
  }
  itens.push(
    { tipo: "pagina", titulo: "Central de Conteúdo", rotulo: "", texto: "Reúne formulários e declarações, manuais e guias, tabelas e valores, audiências públicas, normas e comunicados e material de integração de sistemas.", url: `/${slug}/central-de-conteudo`, peso: 1.2 },
    { tipo: "pagina", titulo: "Legislação", rotulo: "", texto: "Código Tributário, leis, decretos, portarias, instruções normativas, deliberações e calendário fiscal.", url: `/${slug}/legislacao`, peso: 1.2 },
    { tipo: "pagina", titulo: "Processos Digitais", rotulo: "", texto: "Lista dos processos digitais e dos documentos exigidos em cada um.", url: `/${slug}/processos`, peso: 1.2 },
  );

  const indice = new Indice(itens);
  cache.set(orgaoId, { em: Date.now(), indice });
  return indice;
}
