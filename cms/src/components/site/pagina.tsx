/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { fraseAmigavel } from "@/lib/texto";
import type { EntradaIndice, Segmento } from "@/lib/conteudo";
import { Icone, propsLink } from "./ui";
import { CorpoNoticia } from "./noticias";
import { GruposServicos } from "./abas";

export type Trilha = { href?: string; texto: string }[];

/** Abertura das páginas internas: trilha de navegação, título e imagem. */
export function CabecalhoPagina({ trilha, titulo, chamada, texto, capa, cta, children }: {
  trilha: Trilha;
  titulo: string;
  chamada?: string;
  texto?: string;
  capa?: { src: string; alt: string } | null;
  cta?: { texto: string; url: string } | null;
  children?: ReactNode;
}) {
  return (
    <header className={`pag-topo${capa ? " pag-topo--capa" : ""}`}>
      <div className="container pag-topo__grade">
        <div className="pag-topo__texto">
          <nav aria-label="Você está em">
            <ol className="pag-trilha">
              {trilha.map((t, i) => <li key={i}>{t.href ? <a href={t.href}>{t.texto}</a> : <span aria-current="page">{fraseAmigavel(t.texto)}</span>}</li>)}
            </ol>
          </nav>
          {chamada && <p className="pag-chamada">{chamada}</p>}
          <h1>{fraseAmigavel(titulo)}</h1>
          {texto && <p>{texto}</p>}
          {cta && <div className="pag-acoes"><a className="pag-bt pag-bt--pri" {...propsLink(cta.url)}>{fraseAmigavel(cta.texto)}<Icone id="arrow" /></a></div>}
          {children}
        </div>
        {capa && (
          <figure className="pag-topo__capa">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capa.src} alt={capa.alt} decoding="async" fetchPriority="high" />
          </figure>
        )}
      </div>
    </header>
  );
}

/** Conteúdo da página, com cada segmento na apresentação adequada. */
export function Segmentos({ segs }: { segs: Segmento[] }) {
  return (
    <>
      {segs.map((s, i) => {
        if (s.t === "md") return <CorpoNoticia key={i} markdown={s.md} />;
        if (s.t === "grupos") return <GruposServicos key={i} grupos={s.grupos} />;
        if (s.t === "h2") return <h2 key={i} id={s.id} className="pag-h2">{fraseAmigavel(s.titulo)}</h2>;
        if (s.t === "links") {
          return (
            <ul key={i} className="pag-links">
              {s.itens.map((l, j) => (
                <li key={j}><a {...propsLink(l.url)}><span>{fraseAmigavel(l.texto)}</span><Icone id="arrow" /></a></li>
              ))}
            </ul>
          );
        }
        return (
          <div key={i} className="pag-faq" data-faq>
            {s.itens.length > 4 && <button type="button" className="pag-faq__todos" data-faq-todos>Abrir todas</button>}
            {s.itens.map((f, j) => (
              <details key={f.id} id={f.id} className="pag-faq__item" open={j === 0}>
                <summary>{fraseAmigavel(f.titulo)}</summary>
                <div className="pag-faq__corpo"><CorpoNoticia markdown={f.md} /></div>
              </details>
            ))}
          </div>
        );
      })}
    </>
  );
}

/** Coluna lateral: índice da página e canais de ajuda. */
export function LateralPagina({ indice, contato, whatsapp, atendimento }: {
  indice?: EntradaIndice[];
  contato?: any;
  whatsapp?: boolean;
  atendimento?: string;
}) {
  const tel = String(contato?.telefone ?? "").replace(/\D/g, "");
  return (
    <aside className="pag-lado">
      {indice && indice.length >= 4 && (
        <nav className="pag-indice" aria-label="Nesta página">
          <h2>Nesta página</h2>
          <ol>{indice.map((e) => <li key={e.id} className={`nivel-${e.nivel}`}><a href={`#${e.id}`} data-indice>{fraseAmigavel(e.titulo)}</a></li>)}</ol>
        </nav>
      )}
      {(tel || whatsapp || atendimento) && (
        <div className="pag-ajuda">
          <h2>Precisa de ajuda?</h2>
          <p>Nossa equipe orienta você.</p>
          {whatsapp && <a className="pag-ajuda__bt" data-whatsapp href="#" target="_blank" rel="noopener noreferrer"><Icone id="whatsapp" />Falar pelo WhatsApp</a>}
          {tel && <a className="pag-ajuda__link" href={`tel:+55${tel}`}><Icone id="phone" />{contato.telefone}</a>}
          {atendimento && <a className="pag-ajuda__link" href={atendimento}><Icone id="chat" />Central de atendimento</a>}
        </div>
      )}
    </aside>
  );
}

/** Compartilhar, copiar o link e imprimir (o comportamento fica em interacoes.js). */
export function AcoesCompartilhar({ imprimir = false }: { imprimir?: boolean }) {
  return (
    <div className="pag-acoes" style={{ marginTop: 0 }}>
      <button type="button" className="pag-bt pag-bt--mudo" data-acao="whatsapp"><Icone id="whatsapp" />WhatsApp</button>
      <button type="button" className="pag-bt pag-bt--mudo" data-acao="copiar"><Icone id="send" />Copiar link</button>
      {imprimir && <button type="button" className="pag-bt pag-bt--mudo" data-acao="imprimir"><Icone id="doc" />Imprimir</button>}
    </div>
  );
}

/** Atalhos ao fim da página: vêm dos links do rodapé, editáveis no painel. */
export function ProximosPassos({ links, atual }: { links: { rotulo: string; url: string }[]; atual: string }) {
  const lista = links.filter((l) => l.url !== atual && !/cookies/i.test(l.url)).slice(0, 4);
  if (lista.length === 0) return null;
  return (
    <section className="pag-proximos" aria-labelledby="pag-proximos">
      <div className="container">
        <h2 id="pag-proximos">Continue navegando</h2>
        <ul>{lista.map((l) => <li key={l.url}><a {...propsLink(l.url)}>{l.rotulo}<Icone id="arrow" /></a></li>)}</ul>
      </div>
    </section>
  );
}
