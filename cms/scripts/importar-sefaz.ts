// Reconstrói o portal da SEFAZ neste CMS a partir da coleta em ../sefaz-dados.
// Uso: npm run importar:sefaz
// Idempotente: apaga e recria SOMENTE o órgão "sefaz". Os demais não são tocados.
// Gera ../sefaz-dados/RELATORIO-IMPORTACAO.md com tudo o que precisa de revisão.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import sharp from "sharp";
import TurndownService from "turndown";
// @ts-expect-error pacote sem tipos
import { gfm } from "turndown-plugin-gfm";
import { db } from "../src/lib/db";
import { DIR_UPLOADS, salvarUpload } from "../src/lib/media-core";
import { DIR_DOCS, copiarArquivoDoc } from "../src/lib/documentos-core";
import { normalizarBusca, SLUGS_RESERVADOS } from "../src/lib/documentos-shared";
import { LIMITES_NOTICIA, gerarSlug } from "../src/lib/noticias-shared";
import { urlMidia } from "../src/lib/media-shared";
import { BLOCOS_POR_TIPO, CAMPOS_CONFIG } from "../src/blocks/specs";
import { schemaObjeto } from "../src/blocks/campos";
import { ABERTURA_SEFAZ, ORGANOGRAMA_SEFAZ } from "./sefaz-organograma";

const ORIGEM = "https://sefaz.camacari.ba.gov.br";
const UPLOADS = `${ORIGEM}/wp-content/uploads/`;
const RAIZ = path.resolve("..", "sefaz-dados");
const DIR_ARQ = path.join(RAIZ, "arquivos");
const DIR_IMG = path.join(RAIZ, "imagens");
const UA = "Mozilla/5.0 (compatible; modernizacao-portal/1.0)";
const SLUG = "sefaz";

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ler = (n: string): Rec[] => JSON.parse(readFileSync(path.join(RAIZ, "json", `${n}.json`), "utf8"));
const dorme = (ms: number) => new Promise((r) => setTimeout(r, ms));
const texto = (html: string) => cheerio.load(`<div>${html ?? ""}</div>`)("div").first().text().replace(/\s+/g, " ").trim();

const rel: { semArquivo: string[]; semImagem: string[]; linksAntigos: Set<string>; limites: string[]; inferidos: string[]; acervo: string[] } = {
  semArquivo: [], semImagem: [], linksAntigos: new Set(), limites: [], inferidos: [], acervo: [],
};

// ---- dados coletados --------------------------------------------------------
const media = ler("media");
const midiaPorUrl = new Map(media.map((m) => [m.source_url as string, m]));
const midiaPorId = new Map(media.map((m) => [m.id as number, m]));
const paginas = ler("pages");
const posts = ler("posts");
const processos = ler("processos-digitais");
const itensLista = ler("_itens-listas");
const atribuicao = ler("_atribuicao");
const semDono = ler("_sem-dono");
const legis = ler("legislacao");
const tiposLeg = ler("tipo-legistacao");
const tiposCont = ler("tipo-conteudo");
const nomeTipoLeg = new Map(tiposLeg.map((t) => [t.slug, String(t.name).replace(/^\d+\s*-\s*/, "")]));
const nomeTipoCont = new Map(tiposCont.map((t) => [t.slug, String(t.name)]));
const idTipoCont = new Map(tiposCont.map((t) => [t.id, String(t.name)]));

const IGNORAR_PAGINAS = new Set(["home", "conteudo", "legislacao-1", "processos"]);
const slugPagina = (s: string) => s.replace(/_/g, "-");
const slugsPaginas = new Set(paginas.filter((p) => !IGNORAR_PAGINAS.has(p.slug)).map((p) => p.slug as string));
const slugsPosts = new Set(posts.map((p) => p.slug as string));
const slugsProc = new Set(processos.map((p) => p.slug as string));

// ---- arquivos ---------------------------------------------------------------
async function baixar(url: string, destino: string) {
  mkdirSync(path.dirname(destino), { recursive: true });
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) });
      if (r.status === 404) return false;
      if (r.ok) {
        writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
        await dorme(350);
        return true;
      }
    } catch { /* tenta de novo */ }
    await dorme(2000 * (t + 1));
  }
  return false;
}

const relativo = (url: string) => decodeURIComponent(url.slice(UPLOADS.length).split("?")[0]);

async function caminhoDoc(url: string) {
  const dest = path.join(DIR_ARQ, relativo(url));
  if (existsSync(dest) || (!process.env.SEM_DOWNLOAD && (await baixar(url, dest)))) return dest;
  return null;
}

/** Tira o sufixo de tamanho do WordPress: foto-1024x683.png -> foto.png */
function urlOriginal(u: string) {
  const limpa = u.split("?")[0];
  if (midiaPorUrl.has(limpa)) return limpa;
  const sem = limpa.replace(/-\d{2,5}x\d{2,5}(\.[a-z0-9]+)$/i, "$1");
  return midiaPorUrl.has(sem) ? sem : limpa;
}

const cacheImg = new Map<string, string | null>();
let orgaoId = "";

/** Baixa, ajusta e registra uma imagem; devolve o id na biblioteca (ou null). */
async function imagem(urlBruta: string, alt = ""): Promise<string | null> {
  const url = urlOriginal(urlBruta);
  if (cacheImg.has(url)) return cacheImg.get(url)!;
  let id: string | null = null;
  try {
    if (!url.startsWith(UPLOADS) || /\.svg$/i.test(url)) throw new Error("ignorada");
    const dest = path.join(DIR_IMG, relativo(url));
    if (!existsSync(dest) && !(await baixar(url, dest))) throw new Error("download");
    let dados: Buffer = await readFile(dest);
    const meta = await sharp(dados, { limitInputPixels: 80_000_000 }).metadata();
    if (dados.length > 4.5 * 1024 * 1024 || (meta.pages ?? 1) > 1 || !["jpeg", "png", "webp", "avif"].includes(meta.format ?? "")) {
      dados = await sharp(dados, { limitInputPixels: 80_000_000, pages: 1 }).resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    }
    const m = await salvarUpload({ dados, nomeOriginal: path.basename(dest), orgaoId, alt });
    id = m.id;
  } catch (e) {
    if ((e as Error).message !== "ignorada") rel.semImagem.push(`${url} (${(e as Error).message})`);
  }
  cacheImg.set(url, id);
  return id;
}

async function logoLocal(arquivo: string, alt: string) {
  const dados = await readFile(path.resolve("..", "public", "assets", "logos", arquivo));
  return (await salvarUpload({ dados, nomeOriginal: arquivo, orgaoId, alt })).id;
}

// ---- links -------------------------------------------------------------------
const docPorUrl = new Map<string, string>(); // url antiga -> id do documento

function novoLink(bruto: string | undefined): string {
  const u = (bruto ?? "").trim();
  if (!u || u.startsWith("#") || /^(mailto|tel):/i.test(u)) return u.replace(/\s+/g, "");
  let url: URL;
  try {
    url = new URL(u, ORIGEM);
  } catch {
    return "";
  }
  if (!/^https?:$/.test(url.protocol)) return "";
  if (url.hostname !== "sefaz.camacari.ba.gov.br") return url.href;
  const caminho = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
  if (caminho.startsWith("/wp-content/uploads/")) {
    const doc = docPorUrl.get(`${ORIGEM}${caminho}`);
    if (doc) return `/doc/${doc}`;
    rel.linksAntigos.add(url.href);
    return url.href;
  }
  const partes = caminho.split("/").filter(Boolean);
  const [a, b] = partes;
  if (!a) return `/${SLUG}`;
  if (a === "home") return `/${SLUG}`;
  if (a === "legislacao-1" || a === "legislacao") return `/${SLUG}/legislacao`;
  if (a === "conteudo" || a === "central-de-conteudo") return `/${SLUG}/central-de-conteudo`;
  if (a === "processos") return `/${SLUG}/processos`;
  if (a === "processos-digitais") return b && slugsProc.has(b) ? `/${SLUG}/processos/${b}` : `/${SLUG}/processos`;
  if (a === "tipo-legistacao") return `/${SLUG}/legislacao${b && nomeTipoLeg.get(b) ? `?categoria=${encodeURIComponent(nomeTipoLeg.get(b)!)}` : ""}`;
  if (a === "tipo-conteudo") return `/${SLUG}/central-de-conteudo${b && nomeTipoCont.get(b) ? `?categoria=${encodeURIComponent(nomeTipoCont.get(b)!)}` : ""}`;
  if (a === "category" || a === "noticias") return `/${SLUG}/noticias`;
  if (slugsPaginas.has(a)) return `/${SLUG}/${slugPagina(a)}`;
  if (slugsPosts.has(a)) return `/${SLUG}/noticias/${a}`;
  rel.linksAntigos.add(url.href);
  return url.href;
}

// ---- HTML -> Markdown ---------------------------------------------------------
const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });
td.use(gfm);
td.remove(["script", "style", "noscript", "iframe", "form", "button", "input", "select", "textarea", "video", "audio", "canvas"]);

async function paraMarkdown(html: string, onde: string) {
  const $ = cheerio.load(`<div id="raiz">${html}</div>`);
  const raiz = $("#raiz");
  raiz.find(".elementor-hidden-desktop, svg, script, style, noscript, .elementor-widget-spacer, .elementor-widget-divider, .elementor-swiper-button, .post-views").remove();

  for (const el of raiz.find("h1, h4, h5, h6").toArray()) {
    const nivel = el.tagName === "h1" ? "h2" : "h3";
    el.tagName = nivel;
  }
  // perguntas em acordeão viram títulos, para a página poder ser percorrida
  raiz.find(".elementor-tab-title").each((_, el) => { $(el).replaceWith($("<h3></h3>").text($(el).text().replace(/s+/g, " ").trim())); });
  raiz.find("h2 br, h3 br").replaceWith(" ");

  // tabelas: a primeira linha vira cabeçalho, células sem blocos internos
  raiz.find("table").each((_, t) => {
    const tb = $(t);
    tb.find("td p, th p, td div, th div").each((_, p) => { $(p).replaceWith(`${$(p).html() ?? ""} `); });
    tb.find("td br, th br").replaceWith(" ");
    if (tb.find("th").length === 0) {
      const primeira = tb.find("tr").first();
      primeira.find("td").each((_, c) => { c.tagName = "th"; });
      const corpo = tb.find("tbody").first();
      if (corpo.length) {
        primeira.remove();
        tb.prepend($("<thead></thead>").append(primeira));
      }
    }
  });

  for (const el of raiz.find("img").toArray()) {
    const img = $(el);
    const src = img.attr("data-src") || img.attr("src") || "";
    if (/Organograma-Atual-SEFAZ/i.test(src)) { img.replaceWith("<p>{{organograma}}</p>"); continue; } // o componente animado entra neste ponto
    const alt = (img.attr("alt") || "").trim().slice(0, 160);
    const id = src.startsWith("data:") ? null : await imagem(src, alt);
    if (id) {
      const m = await db.midia.findUnique({ where: { id }, select: { largura: true } });
      const w = m && m.largura < 800 ? 480 : m && m.largura < 1280 ? 800 : 1280;
      img.replaceWith(`<img src="${urlMidia(id, w, "livre")}" alt="${alt.replace(/["<>]/g, "")}">`);
    } else img.remove();
  }

  raiz.find("a").each((_, el) => {
    const a = $(el);
    const alvo = a.attr("href") ?? "";
    if (/wp-content\/uploads\/.*\.(jpe?g|png|webp|gif)(\?|$)/i.test(alvo)) { a.replaceWith(a.html() ?? ""); return; }
    const destino = novoLink(alvo);
    if (destino) a.attr("href", destino.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29"));
    else a.replaceWith(a.html() ?? "");
  });

  let md = td.turndown(raiz.html() ?? "");
  // o Elementor repete blocos para cada tela: mantém só a primeira ocorrência
  const vistos = new Set<string>();
  md = md.split(/\n{2,}/).filter((b) => {
    const k = b.trim();
    if (!k) return false;
    if (k.length < 30 && !k.startsWith("![")) return true;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).join("\n\n");
  md = md.replace(/\n{3,}/g, "\n\n").replace(/^#{1,6}\s*$/gm, "").trim();
  if (!md) rel.limites.push(`${onde}: conteúdo vazio após a conversão`);
  return md;
}

// ---- limpeza -----------------------------------------------------------------
async function apagarOrgaoAnterior() {
  const o = await db.orgao.findUnique({ where: { slug: SLUG } });
  if (!o) return;
  const [ds, ms] = await Promise.all([
    db.documento.findMany({ where: { orgaoId: o.id }, select: { arquivo: true } }),
    db.midia.findMany({ where: { orgaoId: o.id }, select: { arquivo: true } }),
  ]);
  for (const d of ds) if (d.arquivo) await unlink(path.join(DIR_DOCS, d.arquivo)).catch(() => {});
  for (const m of ms) await unlink(path.join(DIR_UPLOADS, m.arquivo)).catch(() => {});
  await db.orgao.delete({ where: { id: o.id } });
}

function validar(tipo: string, dados: unknown) {
  const r = schemaObjeto(BLOCOS_POR_TIPO[tipo].campos).safeParse(dados);
  if (!r.success) throw new Error(`Bloco ${tipo} inválido: ${JSON.stringify(r.error.issues.slice(0, 3))}`);
  return r.data;
}

const titulo = (r: Rec) => texto(r.title.rendered);

// ---- documentos --------------------------------------------------------------
async function importarDocumentos() {
  // referências em páginas e notícias: documentos sem lista própria, mas em uso
  const referencias = new Set<string>();
  for (const r of [...paginas, ...posts]) {
    for (const m of String(r.content?.rendered ?? "").matchAll(/https?:\/\/sefaz\.camacari\.ba\.gov\.br\/wp-content\/uploads\/[^"'<> )]+/g)) referencias.add(m[0]);
  }
  const criar = async (d: { tipo: string; categoria: string; titulo: string; descricao: string; data: Date; url: string | null; publicado: boolean; observacao: string }) => {
    const c = d.url ? await caminhoDoc(d.url) : null;
    let arq: Awaited<ReturnType<typeof copiarArquivoDoc>> | null = null;
    if (c) {
      try {
        arq = await copiarArquivoDoc(c, path.basename(c));
      } catch (e) {
        rel.limites.push(`Anexo recusado (${(e as Error).message}): ${path.basename(c)}`);
      }
    }
    if (d.url && !arq) rel.semArquivo.push(`${d.titulo} (falha no download: ${d.url})`);
    const doc = await db.documento.create({
      data: {
        orgaoId, tipo: d.tipo, categoria: d.categoria, titulo: d.titulo.slice(0, 300), descricao: d.descricao.slice(0, 1000),
        busca: normalizarBusca(`${d.titulo} ${d.descricao}`), data: d.data,
        publicado: d.publicado && !!arq, observacao: d.observacao, ...(arq ?? {}),
      },
    });
    if (d.url && arq) docPorUrl.set(d.url, doc.id);
    return doc;
  };

  const usados = new Set<string>();
  const legPorId = new Map(legis.map((l) => [l.id, l]));
  let nLeg = 0;
  for (const l of legis) {
    const it = itensLista.find((i) => i.id === l.id);
    const href: string | undefined = it?.hrefs?.[0]?.u;
    let url = href && href.startsWith(UPLOADS) ? href : null;
    let observacao = "";
    if (!url) {
      const norm = normalizarBusca(titulo(l));
      const num = norm.match(/\b(\d{1,4})[/-](20\d{2})\b/);
      const par = num && semDono.find((d) => !usados.has(d.url) && new RegExp(`\\b0*${num[1]}\\D{1,3}${num[2]}\\b`).test(normalizarBusca(d.url.split("/").pop())));
      if (par) {
        url = par.url;
        observacao = "Importação: arquivo associado pelo número do ato. Confira.";
        rel.inferidos.push(`Legislação "${titulo(l)}" → ${par.url.split("/").pop()}`);
      } else rel.semArquivo.push(`Legislação: ${titulo(l)}`);
    }
    if (url) usados.add(url);
    const cat = it?.cats?.[0] ? nomeTipoLeg.get(it.cats[0]) ?? "" : "";
    await criar({
      tipo: "LEGISLACAO", categoria: cat, titulo: it?.hs?.[0] || titulo(l), descricao: it?.ps?.[0] || texto(l.meta?.descricao ?? ""),
      data: new Date(l.date), url, publicado: !!url, observacao: observacao || (url ? "" : "Importação: arquivo não localizado no site de origem."),
    });
    nLeg++;
  }
  void legPorId;

  let nCont = 0;
  for (const a of atribuicao) {
    const cat = (a.tipo as number[] | undefined)?.map((t) => idTipoCont.get(t)).filter(Boolean)[0] ?? "";
    if (a.url) usados.add(a.url);
    else rel.semArquivo.push(`Central de Conteúdo: ${a.titulo}`);
    if (a.conf === "media") rel.inferidos.push(`Central "${a.titulo}" → ${String(a.url).split("/").pop()}`);
    await criar({
      tipo: "CONTEUDO", categoria: cat ?? "", titulo: a.titulo, descricao: "", data: new Date(a.data), url: a.url, publicado: !!a.url,
      observacao: !a.url ? "Importação: arquivo não localizado no site de origem." : a.conf === "media" ? "Importação: arquivo associado por semelhança. Confira." : "",
    });
    nCont++;
  }

  // demais anexos: publicados se alguma página usa; senão ficam guardados, sem publicar
  let nAcervo = 0;
  for (const d of semDono) {
    if (usados.has(d.url) || /\.psd$/i.test(d.url) || /MATERIAIS\.pdf$/.test(d.url)) continue;
    const usado = referencias.has(d.url);
    await criar({
      tipo: "CONTEUDO", categoria: usado ? "Outros documentos" : "Acervo", titulo: d.titulo || path.basename(d.url), descricao: "", data: new Date(d.data), url: d.url,
      publicado: usado, observacao: usado ? "" : "Importação: anexo do site antigo que nenhuma página listava. Publique só se ainda valer.",
    });
    if (!usado) rel.acervo.push(path.basename(d.url));
    nAcervo++;
  }
  return { nLeg, nCont, nAcervo };
}

// ---- processos ---------------------------------------------------------------
async function importarProcessos() {
  let n = 0;
  for (const p of processos) {
    const arq = path.join(RAIZ, "html", "proc", `${p.id}.html`);
    const exigencias: { documento: string; obrigatorio: boolean }[] = [];
    if (existsSync(arq)) {
      const $ = cheerio.load(readFileSync(arq, "utf8"));
      $("table tr").each((_, tr) => {
        const c = $(tr).find("td, th").map((_, e) => $(e).text().replace(/\s+/g, " ").trim()).get();
        if (c.length >= 2 && c[0] && !/^documentos?$/i.test(c[0])) exigencias.push({ documento: c[0].slice(0, 200), obrigatorio: /^sim/i.test(c[1]) });
      });
    }
    const t = titulo(p);
    if (!exigencias.length) rel.limites.push(`Processo sem tabela de documentos: ${t}`);
    await db.processo.create({ data: { orgaoId, slug: p.slug.slice(0, 120).replace(/-+$/, ""), titulo: t, busca: normalizarBusca(t), exigencias: JSON.stringify(exigencias), publicado: true } });
    n++;
  }
  return n;
}

// ---- páginas e notícias ------------------------------------------------------
async function importarPaginas() {
  let n = 0;
  for (const p of paginas) {
    if (IGNORAR_PAGINAS.has(p.slug)) continue;
    const slug = slugPagina(p.slug);
    if (SLUGS_RESERVADOS.has(slug)) throw new Error(`Endereço reservado: ${slug}`);
    const conteudo = await paraMarkdown(p.content.rendered, `Página ${slug}`);
    if (conteudo.length > 60_000) rel.limites.push(`Página ${slug}: ${conteudo.length} caracteres (limite do painel: 60.000)`);
    const criada = await db.pagina.create({ data: { orgaoId, slug, titulo: titulo(p).slice(0, 120), conteudo, publicada: true } });
    if (slug === "secretaria") await db.bloco.create({ data: { paginaId: criada.id, tipo: "organograma", area: "principal", ordem: 0, dados: JSON.stringify(validar("organograma", ORGANOGRAMA_SEFAZ)) } });
    n++;
  }
  return n;
}

async function importarNoticias() {
  let n = 0;
  for (const p of posts) {
    const conteudo = await paraMarkdown(p.content.rendered, `Notícia ${p.slug}`);
    const fonteCapa = midiaPorId.get(p.featured_media)?.source_url || p.featured_image_src || "";
    const capaId = fonteCapa ? await imagem(fonteCapa, titulo(p).slice(0, 160)) : null;
    let resumo = texto(p.excerpt?.rendered ?? "").replace(/\s*(\[…\]|\[\.\.\.\]|…|Leia mais.*)$/i, "");
    if (resumo.length > LIMITES_NOTICIA.resumo) resumo = `${resumo.slice(0, LIMITES_NOTICIA.resumo - 1).replace(/\s+\S*$/, "")}…`;
    const t = titulo(p);
    if (t.length > LIMITES_NOTICIA.titulo) rel.limites.push(`Notícia com título acima de ${LIMITES_NOTICIA.titulo} caracteres (editar exigirá encurtar): ${t}`);
    if (conteudo.length > LIMITES_NOTICIA.conteudo) rel.limites.push(`Notícia ${p.slug}: ${conteudo.length} caracteres`);
    const c = p.categories?.[0];
    await db.noticia.create({
      data: {
        orgaoId, slug: p.slug.slice(0, 120).replace(/-+$/, "") || gerarSlug(t), titulo: t, resumo, conteudo, capaId,
        capaAlt: t.slice(0, 160), categoria: c === 3 ? "Notícia" : "SEFAZ", status: "PUBLICADA", publicadaEm: new Date(p.date),
      },
    });
    n++;
  }
  return n;
}

// ---- página inicial ----------------------------------------------------------
async function montarInicio() {
  const pag = await db.pagina.create({ data: { orgaoId, slug: "inicio", titulo: "Início", descricaoSeo: "Portal da Secretaria da Fazenda de Camaçari." } });
  const logo = (await salvarUpload({ dados: await readFile(path.join("scripts", "assets", "assinatura-sefaz.png")), nomeOriginal: "assinatura-sefaz.png", orgaoId, alt: "Prefeitura de Camaçari, Secretaria da Fazenda" })).id;
  const brasao = await logoLocal("brasao-pmc-circular.png", "Brasão de Camaçari");
  const img = async (rel: string, alt: string) => ({ id: (await imagem(UPLOADS + rel, alt)) ?? "", alt });

  const banners = [
    ["2026/10/banner-iss-const-civil.webp", "2026/10/banner-iss-const-civil-mobile.webp", "Nova automatização do ISS da construção civil", `/${SLUG}/noticias/sefaz-apresenta-nova-automatizacao-do-iss-da-construcao-civil-em-camacari`],
    ["2026/05/banner-nfse-2026.webp", "2026/05/banner-nfse-2026-mobile.webp", "Portal da NFS-e de Camaçari", `/${SLUG}/portal-nfse-sefaz-camacari`],
    ["2026/09/prf-iss26-banner-web-atual.webp", "2026/09/banner-prf-iss-2026-mobile.webp", "ISS 2026: acesse o sistema da SEFAZ", "https://sefazweb.camacari.ba.gov.br/prefeituras/loginb.tela"],
    ["2025/12/proc-digitais2025.webp", "2025/07/proc-digitais_mobile.jpg", "Processos digitais da SEFAZ", `/${SLUG}/processos`],
    ["2025/10/montg_banner-home01.png", "2025/10/2a-via_mobile.png", "Emissão de 2ª via de tributos", `/${SLUG}/sefaz-introducao`],
  ];
  const slides = [];
  for (const [d, m, descricao, url] of banners) slides.push({ descricao, imagem: await img(d, descricao), imagemMobile: await img(m, descricao), url });

  const cart = (imagem: { id: string; alt: string }, titulo: string, texto: string, url = "", botao = "") => ({ imagem, titulo, texto, botao, url });
  const blocos: { tipo: string; area: string; dados: unknown }[] = [
    {
      tipo: "cabecalho", area: "cabecalho",
      dados: {
        logo: { id: logo, alt: "Prefeitura de Camaçari, Secretaria da Fazenda" }, mostrarFonte: true, botaoAtendimento: "Atendimento",
        menu: [
          { rotulo: "Secretaria", destino: `/${SLUG}/secretaria` },
          { rotulo: "Legislação", destino: `/${SLUG}/legislacao` },
          { rotulo: "Serviços", destino: `/${SLUG}/servicos` },
          { rotulo: "Central de Conteúdo", destino: `/${SLUG}/central-de-conteudo` },
          { rotulo: "SEFAZ Atende", destino: `/${SLUG}/sefaz-atende` },
        ],
      },
    },
    { tipo: "banners", area: "principal", dados: { tituloAcessivel: "Secretaria da Fazenda de Camaçari", ...ABERTURA_SEFAZ, intervalo: 6, slides } },
    {
      tipo: "servicos", area: "principal",
      dados: {
        sobretitulo: "Serviços digitais", titulo: "Mais acessados", texto: "",
        itens: [
          ["doc", "roxo", "Emissão de 2ª via de tributos", `/${SLUG}/sefaz-introducao`],
          ["grid", "laranja", "Sistema Tributário", "https://sefazweb.camacari.ba.gov.br/prefeituras/login.tela"],
          ["layers", "verde", "Processos Digitais", `/${SLUG}/processos`],
          ["handshake", "vermelho", "Central do Empreendedor", `/${SLUG}/empreendedor`],
          ["pin", "roxo", "Geolocalização Camaçari", "https://geomais.camacari.ba.gov.br"],
          ["id", "laranja", "GED Empreendedor", "http://empreendedor.camacari.ba.gov.br:8080/requerimento/f/login.xhtml"],
        ].map(([icone, cor, titulo, url]) => ({ icone, cor, titulo, descricao: "", botao: "Acessar", acao: "link", mensagem: "", url })),
      },
    },
    { tipo: "noticias", area: "principal", dados: { sobretitulo: "SEFAZ", titulo: "Notícias", texto: "", quantidade: 6, botaoTodas: "Mais notícias" } },
    {
      tipo: "cartoes", area: "principal",
      dados: {
        sobretitulo: "Links úteis", titulo: "Como podemos ajudar", texto: "",
        itens: [
          cart(await img("2025/03/callcenter_home.png", "Atendimento"), "Atendimento", "Aqui esclarecemos suas dúvidas e auxiliamos sobre procedimentos online.", `/${SLUG}/sefaz-atende`, "Clique para acessar"),
          cart(await img("2025/03/servicos_home.png", "Serviços SEFAZ"), "Serviços SEFAZ", "Acesse nossa carta de serviços online, como informações tributárias e consultas.", `/${SLUG}/servicos`, "Clique para acessar"),
          cart(await img("2025/03/simples1_home.png", "Empresas"), "Empresas", "Descomplique a tributação de sua empresa com o sistema SIMPLES NACIONAL.", `/${SLUG}/simples-2`, "Clique para acessar"),
        ],
      },
    },
    {
      tipo: "cartoes", area: "principal",
      dados: {
        sobretitulo: "Cinf", titulo: "Atendimento presencial", texto: "Coordenadoria de Informações Fiscais: equipe especializada para esclarecer dúvidas e realizar serviços online.",
        itens: [
          cart(await img("2025/03/cinf_sede_mob.png", "Sede da Cinf"), "Sede", "Térreo do prédio azul, Centro Administrativo de Camaçari."),
          cart(await img("2025/06/cinf_abrantes_novo_mob.jpg", "Cinf em Vila de Abrantes"), "Vila de Abrantes", "Atendimento na região litorânea."),
          cart(await img("2025/03/cinf_arembepe_mod.png", "Cinf em Arembepe"), "Arembepe", "Shopping Linha Verde, em Arembepe."),
          cart(await img("2025/03/cinf_guarajuba_mob.png", "Cinf em Guarajuba"), "Guarajuba", "Shopping Guarajuba."),
        ],
      },
    },
    {
      tipo: "contato", area: "principal",
      dados: {
        sobretitulo: "Contato", titulo: "Fale com a SEFAZ", texto: "",
        formulario: { ativo: false, assuntos: [], privacidade: [] },
        endereco: "R. Francisco Drumond, s/n, Centro Administrativo, CEP 42.801-150, Camaçari, Bahia",
        telefone: "(71) 2886-1345", email: "gabip@camacari.ba.gov.br", horario: "Segunda a sexta, 08h às 17h",
        local: {
          ativo: true, sobretitulo: "Localização", nome: "Secretaria da Fazenda de Camaçari", descricao: "Centro Administrativo. Central de Atendimento: segunda a sexta, 08h às 15h.",
          latitude: -12.7068191, longitude: -38.3190499, zoom: 17,
          link: "https://www.google.com/maps?q=R.%20Francisco%20Drumond%2C%20s%2Fn%20-%20Centro%20Administrativo%2C%20Cama%C3%A7ari%20-%20BA",
        },
      },
    },
    {
      tipo: "rodape", area: "rodape",
      dados: {
        logo: { id: logo, alt: "Prefeitura de Camaçari, Secretaria da Fazenda" }, tituloRedes: "Redes sociais",
        redes: [{ rede: "instagram", url: "https://www.instagram.com/sefaz.camacari/" }],
        tituloLinks: "Links",
        links: [
          { rotulo: "Secretaria", url: `/${SLUG}/secretaria` },
          { rotulo: "Legislação", url: `/${SLUG}/legislacao` },
          { rotulo: "Serviços", url: `/${SLUG}/servicos` },
          { rotulo: "Central de Conteúdo", url: `/${SLUG}/central-de-conteudo` },
          { rotulo: "Processos Digitais", url: `/${SLUG}/processos` },
          { rotulo: "Notícias", url: `/${SLUG}/noticias` },
          { rotulo: "SEFAZ Atende", url: `/${SLUG}/sefaz-atende` },
          { rotulo: "Política de cookies", url: `/${SLUG}/politica-de-cookies` },
        ],
        direitos: "Prefeitura Municipal de Camaçari",
        creditoTexto: "", creditoLogo: { id: "", alt: "" }, creditoAlt: "",
      },
    },
  ];
  let ordem = 0;
  for (const b of blocos) await db.bloco.create({ data: { paginaId: pag.id, tipo: b.tipo, area: b.area, ordem: ordem++, dados: JSON.stringify(validar(b.tipo, b.dados)) } });

  const cfg = schemaObjeto(CAMPOS_CONFIG).parse({
    tituloSite: "SEFAZ Camaçari | Secretaria da Fazenda", descricaoSeo: "Portal da Secretaria da Fazenda de Camaçari: tributos, legislação, processos digitais e serviços ao contribuinte.",
    favicon: { id: brasao, alt: "" }, whatsappNumero: "5571987969856", whatsappMensagem: "Olá! Vim pelo portal da SEFAZ e gostaria de atendimento.", whatsappFlutuante: true, voltarTopo: true,
  });
  await db.configuracao.create({ data: { orgaoId, dados: JSON.stringify(cfg) } });
}

function relatorio(resumo: Record<string, number>) {
  const lista = (t: string, a: string[] | Set<string>) => {
    const arr = [...a];
    return `\n## ${t} (${arr.length})\n\n${arr.length ? arr.map((x) => `- ${x}`).join("\n") : "Nenhum."}\n`;
  };
  writeFileSync(path.join(RAIZ, "RELATORIO-IMPORTACAO.md"), [
    `# Relatório da importação da SEFAZ\n\n${Object.entries(resumo).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n`,
    lista("Itens sem arquivo (ficaram sem publicar)", rel.semArquivo),
    lista("Associações por semelhança (conferir)", rel.inferidos),
    lista("Anexos guardados sem publicar (Acervo)", rel.acervo),
    lista("Links que ainda apontam para o site antigo", rel.linksAntigos),
    lista("Imagens não importadas", rel.semImagem),
    lista("Outros avisos", rel.limites),
  ].join(""));
}

async function main() {
  if (!existsSync(DIR_ARQ)) throw new Error("Coleta não encontrada em ../sefaz-dados");
  void readdirSync;
  await apagarOrgaoAnterior();
  const o = await db.orgao.create({ data: { slug: SLUG, nome: "Secretaria da Fazenda de Camaçari", sigla: "SEFAZ", ativo: true } });
  orgaoId = o.id;
  const { nLeg, nCont, nAcervo } = await importarDocumentos();
  console.log("documentos ok", nLeg, nCont, nAcervo);
  const nProc = await importarProcessos();
  console.log("processos ok", nProc);
  const nPag = await importarPaginas();
  console.log("paginas ok", nPag);
  const nNot = await importarNoticias();
  console.log("noticias ok", nNot);
  await montarInicio();
  const resumo = {
    "Legislação": nLeg, "Central de Conteúdo": nCont, "Outros anexos": nAcervo, "Processos digitais": nProc, "Páginas": nPag, "Notícias": nNot,
    "Imagens na biblioteca": await db.midia.count({ where: { orgaoId } }),
    "Documentos publicados": await db.documento.count({ where: { orgaoId, publicado: true } }),
    "Documentos sem publicar": await db.documento.count({ where: { orgaoId, publicado: false } }),
  };
  relatorio(resumo);
  console.log(resumo);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
