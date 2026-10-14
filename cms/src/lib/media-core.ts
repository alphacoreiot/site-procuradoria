// Lógica de mídia (também usada pelo seed, fora do Next).
import { randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "./db";
import { PROPORCOES, LARGURAS, type Proporcao } from "./media-shared";

export const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB
const FORMATOS_ACEITOS = new Set(["jpeg", "png", "webp", "avif"]);
const LADO_MAX = 2400; // a imagem guardada nunca passa disso
const PIXELS_MAX = 40_000_000; // protege contra "bombas" de descompressão

const BASE = path.resolve(process.env.STORAGE_DIR || "./storage");
export const DIR_UPLOADS = path.join(BASE, "uploads");
const DIR_CACHE = path.join(BASE, "cache");

export class ErroMidia extends Error {}

/**
 * Valida e reprocessa uma imagem enviada:
 *  - o sharp abre o arquivo de verdade (a extensão/MIME informados não valem nada);
 *  - só JPEG, PNG, WebP e AVIF (SVG é recusado: pode conter scripts);
 *  - corrige rotação (EXIF), reduz para no máx. 2400 px e regrava em WebP,
 *    o que descarta metadados (GPS, câmera...) e qualquer conteúdo embutido;
 *  - nome de arquivo aleatório, fora da pasta pública.
 */
export async function salvarUpload(opts: {
  dados: Buffer;
  nomeOriginal: string;
  orgaoId: string;
  usuarioId?: string;
  alt?: string;
  permitirSvg?: boolean; // só para o seed (arquivos confiáveis do próprio projeto)
}) {
  if (opts.dados.length === 0) throw new ErroMidia("Arquivo vazio.");
  if (opts.dados.length > TAMANHO_MAX) throw new ErroMidia("A imagem pode ter no máximo 5 MB.");

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(opts.dados, { limitInputPixels: PIXELS_MAX }).metadata();
  } catch {
    throw new ErroMidia("O arquivo não é uma imagem válida.");
  }
  const formato = meta.format ?? "";
  const svgPermitido = opts.permitirSvg && formato === "svg";
  if (!FORMATOS_ACEITOS.has(formato) && !svgPermitido) {
    throw new ErroMidia("Formato não aceito. Envie JPG, PNG, WebP ou AVIF.");
  }
  if ((meta.pages ?? 1) > 1) throw new ErroMidia("Imagens animadas não são aceitas.");

  const entrada = sharp(opts.dados, { limitInputPixels: PIXELS_MAX, density: svgPermitido ? 300 : undefined });
  const { data, info } = await entrada
    .rotate()
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: "inside", withoutEnlargement: !svgPermitido })
    .webp({ quality: 85, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });

  await mkdir(DIR_UPLOADS, { recursive: true });
  const arquivo = `${randomBytes(16).toString("hex")}.webp`;
  await writeFile(path.join(DIR_UPLOADS, arquivo), data, { flag: "wx" });

  return db.midia.create({
    data: {
      orgaoId: opts.orgaoId,
      arquivo,
      nomeOriginal: opts.nomeOriginal.slice(0, 120).replace(/[^\p{L}\p{N} ._()-]/gu, "_"),
      largura: info.width,
      altura: info.height,
      bytes: data.length,
      alt: (opts.alt ?? "").slice(0, 160),
      enviadaPor: opts.usuarioId ?? null,
    },
  });
}

/**
 * Gera (ou lê do cache) uma variação da imagem: largura de uma lista fechada e
 * proporção fixa. Para proporções fixas recorta em volta do ponto focal; em
 * "livre" só reduz, sem recortar (logomarcas).
 */
export async function variacao(midiaId: string, largura: number, proporcao: Proporcao) {
  if (!/^[a-z0-9]{10,40}$/.test(midiaId)) return null;
  if (!LARGURAS.includes(largura) || !(proporcao in PROPORCOES)) return null;
  const m = await db.midia.findUnique({ where: { id: midiaId } });
  if (!m) return null;

  const foco = `${Math.round(m.focoX * 100)}-${Math.round(m.focoY * 100)}`;
  const nomeCache = `${m.id}-${proporcao}-${largura}-${foco}.webp`;
  const caminhoCache = path.join(DIR_CACHE, nomeCache);
  try {
    await stat(caminhoCache);
    return readFile(caminhoCache);
  } catch {
    /* ainda não existe */
  }

  const original = path.join(DIR_UPLOADS, m.arquivo);
  let img = sharp(original);
  const razao = PROPORCOES[proporcao];
  if (razao) {
    const W = m.largura, H = m.altura;
    let cw = W, ch = H;
    if (W / H > razao) cw = Math.max(1, Math.round(H * razao));
    else ch = Math.max(1, Math.round(W / razao));
    const left = Math.min(Math.max(0, Math.round(m.focoX * W - cw / 2)), W - cw);
    const top = Math.min(Math.max(0, Math.round(m.focoY * H - ch / 2)), H - ch);
    img = img.extract({ left, top, width: cw, height: ch }).resize({ width: largura, height: Math.round(largura / razao) });
  } else {
    img = img.resize({ width: largura, withoutEnlargement: true });
  }
  const buf = await img.webp({ quality: 82, alphaQuality: 100 }).toBuffer();
  await mkdir(DIR_CACHE, { recursive: true });
  await writeFile(caminhoCache, buf).catch(() => {});
  return buf;
}
