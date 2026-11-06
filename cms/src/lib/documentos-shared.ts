// Constantes de documentos usadas no servidor e no navegador.
export const LIMITES_DOC = { titulo: 300, descricao: 1000, categoria: 60, link: 500 } as const;
export const TIPOS_DOC = { LEGISLACAO: "Legislação", CONTEUDO: "Central de Conteúdo" } as const;
export type TipoDoc = keyof typeof TIPOS_DOC;
export const TAMANHO_MAX_DOC = 40 * 1024 * 1024; // 40 MB pelo painel
export const LIMITES_PAGINA = { titulo: 120, seo: 160, conteudo: 60_000, slug: 60 } as const;
export const LIMITES_PROCESSO = { titulo: 200, documento: 200, itens: 60 } as const;
/** Endereços já usados pelo site do órgão. */
export const SLUGS_RESERVADOS = new Set(["inicio", "noticias", "legislacao", "central-de-conteudo", "processos", "admin"]);

/** Texto para busca: sem acentos e em minúsculas (igual em SQLite e PostgreSQL). */
export function normalizarBusca(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}
export function formatarBytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
const ROTULOS: Record<string, string> = {
  "application/pdf": "PDF", "application/msword": "DOC", "application/vnd.ms-powerpoint": "PPT", "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "text/plain": "TXT",
};
export const rotuloFormato = (mime: string) => ROTULOS[mime] || "ARQUIVO";
