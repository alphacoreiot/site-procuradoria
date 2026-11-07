// Limites das notícias (usados no formulário e na validação do servidor).
export const LIMITES_NOTICIA = { titulo: 120, resumo: 280, conteudo: 60_000, categoria: 40, capaAlt: 160, slug: 120, tipo: 40, autorNome: 80, chamada: 40 } as const;
export const TIPOS_NOTICIA = ["Alerta", "Institucional", "Legislação", "Modernização", "Orientação", "Prazos e pagamentos", "Prestação de contas"] as const;
/** Minutos de leitura, a 200 palavras por minuto. */
export const tempoLeitura = (texto: string) => Math.max(1, Math.round(texto.split(/\s+/).length / 200));

/** Endereço amigável a partir do título ("Ação & Cia" -> "acao-cia"). */
export function gerarSlug(texto: string) {
  return (
    texto
      .normalize("NFD").replace(/\p{M}/gu, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 80).replace(/-+$/, "") || "noticia"
  );
}
