import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { DIR_DOCS } from "@/lib/documentos-core";

export const runtime = "nodejs";

const nao = () => new Response("Não encontrado", { status: 404 });

/**
 * Entrega um documento público. Só o PDF abre no navegador; o resto é sempre
 * download. Aceita Range, porque há PDFs muito grandes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return nao();
  const d = await db.documento.findUnique({ where: { id }, include: { orgao: { select: { ativo: true } } } });
  if (!d || !d.publicado || !d.arquivo || !d.orgao.ativo) return nao();

  const caminho = path.join(DIR_DOCS, path.basename(d.arquivo));
  let tamanho: number;
  try {
    tamanho = (await stat(caminho)).size;
  } catch {
    return nao();
  }

  const nomeAscii = d.nomeArquivo.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "documento";
  const cab: Record<string, string> = {
    "Content-Type": d.mime || "application/octet-stream",
    "Content-Disposition": `${d.mime === "application/pdf" ? "inline" : "attachment"}; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(d.nomeArquivo)}`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; object-src 'self'",
  };

  const faixa = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (faixa && (faixa[1] || faixa[2])) {
    const ini = faixa[1] ? Number(faixa[1]) : Math.max(0, tamanho - Number(faixa[2]));
    const fim = faixa[1] && faixa[2] ? Math.min(Number(faixa[2]), tamanho - 1) : tamanho - 1;
    if (ini > fim || ini >= tamanho) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${tamanho}` } });
    const corpo = Readable.toWeb(createReadStream(caminho, { start: ini, end: fim })) as ReadableStream;
    return new Response(corpo, { status: 206, headers: { ...cab, "Content-Length": String(fim - ini + 1), "Content-Range": `bytes ${ini}-${fim}/${tamanho}` } });
  }
  const corpo = Readable.toWeb(createReadStream(caminho)) as ReadableStream;
  return new Response(corpo, { headers: { ...cab, "Content-Length": String(tamanho) } });
}
