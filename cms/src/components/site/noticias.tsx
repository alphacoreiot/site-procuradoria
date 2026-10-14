import ReactMarkdown from "react-markdown";
import { Img, type MapaMidias } from "./ui";

export type NoticiaResumo = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  categoria: string;
  capaId: string | null;
  capaAlt: string;
  publicadaEm: Date | null;
};

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Bahia" });
export const dataNoticia = (d: Date | null) => (d ? fmtData.format(d) : "");

export function CardNoticia({ n, orgaoSlug, midias }: { n: NoticiaResumo; orgaoSlug: string; midias: MapaMidias }) {
  const href = `/${orgaoSlug}/noticias/${n.slug}`;
  return (
    <article className="news-card reveal">
      <a className="news-card__media" href={href} tabIndex={-1} aria-hidden="true">
        {n.capaId
          ? <Img valor={{ id: n.capaId, alt: "" }} midias={midias} proporcao="16x9" larguras={[480, 800]} sizes="(max-width: 700px) 100vw, 400px" decorativa />
          : <span className="news-card__placeholder" />}
      </a>
      <div className="news-card__body">
        <p className="news-card__meta">
          {n.categoria && <span className="news-card__cat">{n.categoria}</span>}
          {n.publicadaEm && <time dateTime={n.publicadaEm.toISOString()}>{dataNoticia(n.publicadaEm)}</time>}
        </p>
        <h3><a href={href}>{n.titulo}</a></h3>
        <p>{n.resumo}</p>
      </div>
    </article>
  );
}

/**
 * Conteúdo da notícia em Markdown SEM HTML: react-markdown não interpreta
 * HTML bruto (skipHtml) e só deixa passar os elementos da lista abaixo.
 * Links externos abrem em nova aba sem acesso à página de origem.
 */
const PERMITIDOS = ["p", "strong", "em", "a", "ul", "ol", "li", "h2", "h3", "blockquote", "br", "hr"];

export function CorpoNoticia({ markdown }: { markdown: string }) {
  return (
    <div className="news-body">
      <ReactMarkdown
        skipHtml
        allowedElements={PERMITIDOS}
        unwrapDisallowed
        urlTransform={(url) => (/^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : "")}
        components={{
          a: ({ href, children }) => {
            const externo = /^https?:/i.test(href || "");
            return <a href={href} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
