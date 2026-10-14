// Constantes de mídia usadas no servidor e no navegador.

/** Proporções permitidas (largura / altura). "livre" = sem recorte. */
export const PROPORCOES = {
  "16x9": 16 / 9,
  "3x2": 3 / 2,
  "4x3": 4 / 3,
  "1x1": 1,
  "4x5": 4 / 5,
  "6x5": 6 / 5,
  livre: 0,
} as const;
export type Proporcao = keyof typeof PROPORCOES;

export const ROTULO_PROPORCAO: Record<Proporcao, string> = {
  "16x9": "16:9 (paisagem)",
  "3x2": "3:2",
  "4x3": "4:3",
  "1x1": "1:1 (quadrada)",
  "4x5": "4:5 (retrato)",
  "6x5": "6:5",
  livre: "sem recorte",
};

/** Únicas larguras que o servidor gera (evita abuso de processamento). */
export const LARGURAS = [160, 320, 480, 640, 800, 1024, 1280, 1600, 1920, 2400];

export function urlMidia(id: string | null | undefined, largura = 1280, proporcao: Proporcao = "livre"): string {
  if (!id) return "";
  const w = LARGURAS.find((l) => l >= largura) ?? 2400;
  return `/media/${id}?w=${w}&ar=${proporcao}`;
}

/** srcSet com algumas larguras para o navegador escolher. */
export function srcSetMidia(id: string, proporcao: Proporcao, larguras: number[]): string {
  return larguras.map((w) => `${urlMidia(id, w, proporcao)} ${w}w`).join(", ");
}
