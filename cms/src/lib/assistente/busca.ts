// Busca textual (BM25) em português, sem dependências: encontra os trechos certos
// antes de chamar o modelo, para que ele responda só com base neles.

const VAZIAS = new Set("a o e as os um uma uns umas de da do das dos em no na nos nas por para pra com sem sob sobre que qual quais quem como quando onde porque se ou ao aos à às é ser são foi era tem ter há me meu minha eu você voce nós nos ele ela isso esse essa este esta aquele mais menos muito pode posso devo deve preciso quero saber gostaria favor oi ola olá bom dia boa tarde noite obrigado".split(" ").map((p) => p.normalize("NFD").replace(/\p{M}/gu, "")));

/** Termos equivalentes para quem pergunta com outras palavras. */
const SINONIMOS: string[][] = [
  ["itiv", "itbi", "transmissao", "intervivos"],
  ["iptu", "predial", "territorial"],
  ["trsd", "lixo", "residuo", "coleta"],
  ["cosip", "iluminacao"],
  ["tff", "alvara", "funcionamento", "fiscalizacao"],
  ["iss", "issqn", "servico"],
  ["nfs", "nfse", "nota", "fiscal"],
  ["isencao", "isento", "isenta", "imunidade"],
  ["parcelamento", "parcelar", "parcela"],
  ["debito", "divida", "atraso"],
  ["multa", "penalidade", "infracao"],
  ["procuracao", "procurador"],
  ["certidao", "negativa", "regularidade"],
  ["formulario", "modelo", "requerimento", "declaracao"],
  ["boleto", "guia", "dam", "dua", "via"],
  ["autonomo", "profissional", "liberal"],
  ["mei", "microempreendedor", "simples"],
];
const MAPA_SIN = new Map<string, string[]>();
for (const g of SINONIMOS) for (const t of g) MAPA_SIN.set(t, g.filter((x) => x !== t));

export function radical(p: string) {
  if (p.length <= 3) return p;
  return p.replace(/coes$/, "cao").replace(/oes$/, "ao").replace(/aes$/, "ao").replace(/ais$/, "al").replace(/eis$/, "el").replace(/ns$/, "m").replace(/res$/, "r").replace(/s$/, "");
}

export function tokens(texto: string) {
  return texto.replace(/ª/g, "a").replace(/[º°]/g, "o").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !VAZIAS.has(t)).map(radical);
}

export type ItemBase = {
  tipo: "lei" | "documento" | "pagina" | "processo" | "noticia";
  titulo: string; // nome da fonte
  rotulo: string; // "Art. 45", "p. 3"...
  texto: string; // o que o modelo lê
  url: string;
  chave?: string; // localiza artigos do Código
  peso: number;
};

export class Indice {
  private docs: { len: number; tf: Map<string, number>; cabeca: Set<string> }[] = [];
  private df = new Map<string, number>();
  private media = 1;
  private artigos = new Map<string, number[]>();

  constructor(public itens: ItemBase[]) {
    let soma = 0;
    itens.forEach((it, i) => {
      const toks = tokens(`${it.titulo} ${it.titulo} ${it.rotulo} ${it.texto}`);
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      // título, rótulo e início do texto dizem do que o trecho trata
      const cabeca = new Set(tokens(`${it.titulo} ${it.rotulo} ${it.texto.replace(/^\([^)]*\)\s*/, "").slice(0, 170)}`));
      this.docs.push({ len: toks.length, tf, cabeca });
      soma += toks.length;
      if (it.chave) this.artigos.set(it.chave, [...(this.artigos.get(it.chave) ?? []), i]);
    });
    this.media = soma / Math.max(1, itens.length);
  }

  private pontuar(termos: Map<string, number>) {
    const N = this.docs.length, k1 = 1.4, b = 0.72;
    const notas = new Float64Array(N);
    for (const [t, peso] of termos) {
      const df = this.df.get(t);
      if (!df) continue;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (let i = 0; i < N; i++) {
        const f = this.docs[i].tf.get(t);
        if (!f) continue;
        notas[i] += peso * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * this.docs[i].len) / this.media)));
      }
    }
    return notas;
  }

  buscar(consulta: string) {
    const base = tokens(consulta);
    const termos = new Map<string, number>();
    for (const t of base) {
      termos.set(t, 1);
      for (const s of MAPA_SIN.get(t) ?? []) if (!termos.has(s)) termos.set(radical(s), 0.55);
    }
    const notas = this.pontuar(termos);
    const ordem = [...notas.keys()].filter((i) => notas[i] > 0).map((i) => {
      const cab = this.docs[i].cabeca;
      const acertos = base.filter((t) => cab.has(t) || (MAPA_SIN.get(t) ?? []).some((s) => cab.has(radical(s)))).length;
      return { i, n: notas[i] * this.itens[i].peso * (1 + (1.6 * acertos) / Math.max(1, base.length)) };
    }).sort((a, b) => b.n - a.n);

    const cotas: Record<ItemBase["tipo"], number> = { lei: 4, pagina: 2, processo: 2, documento: 2, noticia: 1 };
    const usados: Record<string, number> = {};
    const escolhidos: ItemBase[] = [];
    const vistos = new Set<ItemBase>();
    const incluir = (it: ItemBase) => { if (!vistos.has(it)) { vistos.add(it); escolhidos.push(it); } };

    // artigo citado na pergunta vem primeiro
    for (const m of consulta.matchAll(/art(?:igo)?s?\.?\s*(\d{1,3})/gi)) for (const i of this.artigos.get(`Art. ${Number(m[1])}`) ?? []) incluir(this.itens[i]);

    for (const { i } of ordem) {
      const it = this.itens[i];
      if (vistos.has(it)) continue;
      if ((usados[it.tipo] ?? 0) >= cotas[it.tipo]) continue;
      usados[it.tipo] = (usados[it.tipo] ?? 0) + 1;
      incluir(it);
      if (escolhidos.length >= 8) break;
    }
    return escolhidos;
  }
}
