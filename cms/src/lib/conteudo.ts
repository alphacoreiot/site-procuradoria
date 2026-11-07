// Lê o Markdown de uma página e separa o que merece apresentação própria:
// imagem de abertura, listas de links (viram cartões) e perguntas (viram acordeão).
// O conteúdo salvo continua sendo Markdown puro, editável no painel.

export type ItemLink = { texto: string; url: string };
export type ItemFaq = { id: string; titulo: string; md: string };
export type Segmento =
  | { t: "md"; md: string }
  | { t: "h2"; id: string; titulo: string }
  | { t: "links"; itens: ItemLink[] }
  | { t: "faq"; itens: ItemFaq[] }
  | { t: "grupos"; grupos: { id: string; titulo: string; itens: ItemLink[] }[] };
export type EntradaIndice = { id: string; titulo: string; nivel: 2 | 3 };

const RE_IMG = /^!\[(.*?)\]\((\/media\/[^)\s]+)\)$/;
const RE_LINK = /^\*{0,2}\[([^\]]+)\]\(([^)\s]+)\)\*{0,2}$/;
const RE_H2 = /^##\s+(.+)$/;
const RE_H3 = /^###\s+(.+)$/;
const limpar = (s: string) => s.replace(/\*\*/g, "").replace(/\\([.\-()!#*_])/g, "$1").replace(/\s+/g, " ").trim();

export function analisarConteudo(markdown: string, prefixo = "s", extrairCapa = true) {
  const blocos = markdown.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let capa: { src: string; alt: string } | null = null;
  if (extrairCapa) {
    const m = blocos[0]?.match(RE_IMG);
    if (m) {
      capa = { alt: m[1], src: m[2].replace(/w=\d+/, "w=800") };
      blocos.shift();
    }
  }

  // link isolado logo no início vira o botão principal da página
  let cta: ItemLink | null = null;
  if (extrairCapa) {
    const pos = blocos.slice(0, 4).findIndex((b, i, l) => RE_LINK.test(b) && !RE_LINK.test(l[i + 1] ?? "") && !RE_LINK.test(l[i - 1] ?? "") && /acess|emit|clique|solicit|consult|portal/i.test(b));
    if (pos >= 0) {
      const m = blocos[pos].match(RE_LINK)!;
      cta = { texto: limpar(m[1]), url: m[2] };
      blocos.splice(pos, 1);
    }
  }

  const segs: Segmento[] = [];
  const indice: EntradaIndice[] = [];
  let buffer: string[] = [];
  let seq = 0;
  const descarregar = () => {
    if (buffer.length) segs.push({ t: "md", md: buffer.join("\n\n") });
    buffer = [];
  };
  const eTitulo = (b: string) => RE_H2.test(b) || RE_H3.test(b);

  for (let i = 0; i < blocos.length;) {
    const b = blocos[i];
    const h2 = b.match(RE_H2);
    if (h2 && !b.includes("\n")) {
      descarregar();
      const id = `${prefixo}-${++seq}`;
      const titulo = limpar(h2[1]);
      if (titulo) {
        segs.push({ t: "h2", id, titulo });
        indice.push({ id, titulo, nivel: 2 });
      }
      i++;
      continue;
    }
    if (RE_H3.test(b)) {
      const itens: { titulo: string; corpo: string[] }[] = [];
      let j = i;
      while (j < blocos.length && RE_H3.test(blocos[j])) {
        const corpo: string[] = [];
        let k = j + 1;
        while (k < blocos.length && !eTitulo(blocos[k])) corpo.push(blocos[k++]);
        itens.push({ titulo: limpar(blocos[j].match(RE_H3)![1]), corpo });
        j = k;
      }
      if (itens.length >= 3 && itens.every((x) => x.corpo.length > 0)) {
        descarregar();
        const faq = itens.map((x) => ({ id: `${prefixo}-${++seq}`, titulo: x.titulo, md: x.corpo.join("\n\n") }));
        segs.push({ t: "faq", itens: faq });
        for (const f of faq) indice.push({ id: f.id, titulo: f.titulo, nivel: 3 });
      } else {
        buffer.push(...blocos.slice(i, j));
      }
      i = j;
      continue;
    }
    if (RE_LINK.test(b)) {
      let j = i;
      const itens: ItemLink[] = [];
      while (j < blocos.length) {
        const m = blocos[j].match(RE_LINK);
        if (!m) break;
        itens.push({ texto: limpar(m[1]), url: m[2] });
        j++;
      }
      if (itens.length >= 2) {
        descarregar();
        segs.push({ t: "links", itens });
        i = j;
        continue;
      }
    }
    buffer.push(b);
    i++;
  }
  descarregar();

  // três ou mais blocos "título + lista de links" seguidos viram abas
  const final: Segmento[] = [];
  let usadas = indice;
  for (let i = 0; i < segs.length;) {
    const grupos: { id: string; titulo: string; itens: ItemLink[] }[] = [];
    let j = i;
    for (; ;) {
      const h = segs[j], l = segs[j + 1];
      if (h?.t !== "h2" || l?.t !== "links") break;
      grupos.push({ id: h.id, titulo: h.titulo, itens: l.itens });
      j += 2;
    }
    if (grupos.length >= 3) {
      final.push({ t: "grupos", grupos });
      const ids = new Set(grupos.map((g) => g.id));
      usadas = usadas.filter((e) => !ids.has(e.id));
      i = j;
    } else {
      final.push(segs[i]);
      i++;
    }
  }
  return { capa, cta, segs: final, indice: usadas };
}
