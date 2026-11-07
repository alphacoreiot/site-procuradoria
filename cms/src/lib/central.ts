// Organiza a Central de Conteúdo: categorias em ordem de utilidade e documentos
// repetitivos reunidos em séries (TFF por ano, audiências por quadrimestre...).

export const CATEGORIAS_CENTRAL = [
  { nome: "Formulários e declarações", desc: "Modelos para preencher e entregar à Secretaria." },
  { nome: "Manuais e guias", desc: "Passo a passo para usar os sistemas e serviços." },
  { nome: "Tabelas e valores", desc: "Enquadramentos, taxas e códigos de referência." },
  { nome: "Audiências públicas", desc: "Prestação de contas por quadrimestre." },
  { nome: "Normas e comunicados", desc: "Atos, notas técnicas e avisos recentes." },
  { nome: "Integração de sistemas", desc: "Material técnico para integrar sistemas à NFS-e." },
];

export type DocCentral = { id: string; titulo: string; categoria: string; ano: number | null; mime: string; bytes: number; arquivo: string | null; linkExterno: string };
export type ItemSerie = { id: string; rotulo: string };
export type Serie = { titulo: string; itens: ItemSerie[] };
export type AnoAudiencia = { ano: string; itens: ItemSerie[] };
export type SecaoCentral = { nome: string; desc: string; total: number; series: Serie[]; audiencias: AnoAudiencia[]; soltos: DocCentral[] };

const SERIES: { re: RegExp; titulo: string; rotulo: (m: RegExpMatchArray) => string; ordem: "desc" | "asc" }[] = [
  { re: /tabela de enquadramento.*tff\s*(\d{4})/i, titulo: "Tabela de enquadramento da TFF", rotulo: (m) => m[1], ordem: "desc" },
  { re: /modelo de envio de arquivo.*webservice\s*(\d)/i, titulo: "Modelos de envio de arquivo do webservice", rotulo: (m) => `Modelo ${m[1]}`, ordem: "asc" },
  { re: /schema xml.*abrasf\s*(i+)\b/i, titulo: "Schema XML NFS-e 2.01 (ABRASF)", rotulo: (m) => `Parte ${m[1].toUpperCase()}`, ordem: "asc" },
  { re: /exemplo de arquivo para exporta.*-\s*(prestador|tomador)/i, titulo: "Exemplo de arquivo para exportação em lote", rotulo: (m) => m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), ordem: "asc" },
  { re: /modelo de procura.*-\s*pessoa\s+(f|j)/i, titulo: "Modelo de procuração", rotulo: (m) => (m[1].toLowerCase() === "f" ? "Pessoa Física" : "Pessoa Jurídica"), ordem: "asc" },
];

export function organizarCentral(docs: DocCentral[], categoria = ""): SecaoCentral[] {
  const nomes = [...CATEGORIAS_CENTRAL.map((c) => c.nome), ...new Set(docs.map((d) => d.categoria).filter((c) => !CATEGORIAS_CENTRAL.some((x) => x.nome === c)))];
  return nomes.filter((n) => !categoria || n === categoria).map((nome) => {
    const daqui = docs.filter((d) => d.categoria === nome);
    const series = new Map<string, Serie & { ordem: "desc" | "asc" }>();
    const anos = new Map<string, ItemSerie[]>();
    const soltos: DocCentral[] = [];
    for (const d of daqui) {
      const aud = d.titulo.match(/^audi[eê]ncia.*?([123])º.*?(20\d{2})/i);
      if (aud) {
        if (!anos.has(aud[2])) anos.set(aud[2], []);
        anos.get(aud[2])!.push({ id: d.id, rotulo: `${aud[1]}º quadrimestre` });
        continue;
      }
      const def = SERIES.map((s) => ({ s, m: d.titulo.match(s.re) })).find((x) => x.m);
      if (def?.m) {
        if (!series.has(def.s.titulo)) series.set(def.s.titulo, { titulo: def.s.titulo, itens: [], ordem: def.s.ordem });
        series.get(def.s.titulo)!.itens.push({ id: d.id, rotulo: def.s.rotulo(def.m) });
        continue;
      }
      soltos.push(d);
    }
    const lista = [...series.values()].map(({ titulo, itens, ordem }) => ({
      titulo,
      itens: itens.sort((a, b) => (ordem === "desc" ? b.rotulo.localeCompare(a.rotulo) : a.rotulo.localeCompare(b.rotulo))),
    }));
    return {
      nome,
      desc: CATEGORIAS_CENTRAL.find((c) => c.nome === nome)?.desc ?? "",
      total: daqui.length,
      series: lista,
      audiencias: [...anos.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([ano, itens]) => ({ ano, itens: itens.sort((x, y) => x.rotulo.localeCompare(y.rotulo)) })),
      soltos: soltos.sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || a.titulo.localeCompare(b.titulo, "pt-BR")),
    };
  }).filter((s) => s.total > 0);
}
