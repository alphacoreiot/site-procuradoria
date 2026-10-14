// Limites das notícias (usados no formulário e na validação do servidor).
export const LIMITES_NOTICIA = { titulo: 120, resumo: 280, conteudo: 20_000, categoria: 40, capaAlt: 160, slug: 120 } as const;

/** Endereço amigável a partir do título ("Ação & Cia" -> "acao-cia"). */
export function gerarSlug(texto: string) {
  return (
    texto
      .normalize("NFD").replace(/\p{M}/gu, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 80).replace(/-+$/, "") || "noticia"
  );
}
