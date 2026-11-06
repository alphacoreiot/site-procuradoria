// Armazenamento de documentos (também usado pelo importador, fora do Next).
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, open, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ErroMidia } from "./media-core";

const BASE = path.resolve(process.env.STORAGE_DIR || "./storage");
export const DIR_DOCS = path.join(BASE, "documentos");

type Formato = { mime: string; assinatura: "pdf" | "zip" | "ole" | "texto" };
const FORMATOS: Record<string, Formato> = {
  pdf: { mime: "application/pdf", assinatura: "pdf" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", assinatura: "zip" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", assinatura: "zip" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", assinatura: "zip" },
  doc: { mime: "application/msword", assinatura: "ole" },
  ppt: { mime: "application/vnd.ms-powerpoint", assinatura: "ole" },
  pps: { mime: "application/vnd.ms-powerpoint", assinatura: "ole" },
  xls: { mime: "application/vnd.ms-excel", assinatura: "ole" },
  txt: { mime: "text/plain", assinatura: "texto" },
};

/** A extensão escolhe o formato; os primeiros bytes confirmam (a extensão sozinha não vale nada). */
function validar(nome: string, inicio: Buffer): Formato & { ext: string } {
  const ext = path.extname(nome).slice(1).toLowerCase();
  const f = FORMATOS[ext];
  if (!f) throw new ErroMidia("Formato não aceito. Envie PDF, DOC(X), PPT(X), XLS(X) ou TXT.");
  const ok =
    f.assinatura === "pdf" ? inicio.subarray(0, 1024).includes("%PDF-")
    : f.assinatura === "zip" ? inicio[0] === 0x50 && inicio[1] === 0x4b
    : f.assinatura === "ole" ? inicio.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))
    : !inicio.includes(0);
  if (!ok) throw new ErroMidia("O conteúdo do arquivo não corresponde ao formato informado.");
  return { ...f, ext };
}

const limparNome = (s: string) => s.slice(-160).replace(/[^\p{L}\p{N} ._()-]/gu, "_");
const nomeAleatorio = (ext: string) => `${randomBytes(16).toString("hex")}.${ext}`;

export async function salvarArquivoDoc(dados: Buffer, nomeOriginal: string) {
  if (dados.length === 0) throw new ErroMidia("Arquivo vazio.");
  const f = validar(nomeOriginal, dados.subarray(0, 4096));
  await mkdir(DIR_DOCS, { recursive: true });
  const arquivo = nomeAleatorio(f.ext);
  await writeFile(path.join(DIR_DOCS, arquivo), dados, { flag: "wx" });
  return { arquivo, nomeArquivo: limparNome(nomeOriginal), mime: f.mime, bytes: dados.length };
}

/** Para o importador: copia sem carregar na memória (há PDFs de centenas de MB). */
export async function copiarArquivoDoc(origem: string, nomeOriginal: string) {
  const fh = await open(origem, "r");
  const inicio = Buffer.alloc(4096);
  const { bytesRead } = await fh.read(inicio, 0, 4096, 0);
  const { size } = await fh.stat();
  await fh.close();
  if (size === 0) throw new ErroMidia("Arquivo vazio.");
  const f = validar(nomeOriginal, inicio.subarray(0, bytesRead));
  await mkdir(DIR_DOCS, { recursive: true });
  const arquivo = nomeAleatorio(f.ext);
  await copyFile(origem, path.join(DIR_DOCS, arquivo));
  return { arquivo, nomeArquivo: limparNome(nomeOriginal), mime: f.mime, bytes: size };
}

export async function apagarArquivoDoc(arquivo: string | null) {
  if (arquivo && /^[a-f0-9]{32}\.[a-z]{3,4}$/.test(arquivo)) await unlink(path.join(DIR_DOCS, arquivo)).catch(() => {});
}
