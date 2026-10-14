import { Fragment } from "react";
import { srcSetMidia, urlMidia, PROPORCOES, type Proporcao } from "@/lib/media-shared";
import type { ValorImagem } from "@/blocks/campos";

export type MapaMidias = Record<string, { largura: number; altura: number; alt: string }>;

/** Ícone do sprite (ids de lista fechada). */
export function Icone({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <use href={`#i-${id}`} />
    </svg>
  );
}

/** Texto com quebras de linha (\n vira <br>); o React escapa todo o conteúdo. */
export function Linhas({ texto }: { texto: string }) {
  const partes = (texto || "").split(/\r?\n/);
  return (
    <>
      {partes.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {p}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Imagem do CMS com recorte proporcional no servidor e srcSet responsivo.
 * Largura/altura informadas evitam "pulos" de layout.
 */
export function Img({
  valor, midias, proporcao, larguras = [480, 800, 1280, 1920], sizes = "100vw",
  className, altPadrao = "", prioridade = false, decorativa = false,
}: {
  valor?: ValorImagem | null;
  midias: MapaMidias;
  proporcao: Proporcao;
  larguras?: number[];
  sizes?: string;
  className?: string;
  altPadrao?: string;
  prioridade?: boolean;
  decorativa?: boolean;
}) {
  if (!valor?.id || !midias[valor.id]) return null;
  const m = midias[valor.id];
  const razao = PROPORCOES[proporcao] || m.largura / m.altura;
  const maior = larguras[larguras.length - 1];
  const w = proporcao === "livre" ? Math.min(m.largura, maior) : maior;
  const h = Math.round(w / razao);
  const alt = decorativa ? "" : valor.alt || m.alt || altPadrao;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={urlMidia(valor.id, larguras[Math.min(1, larguras.length - 1)], proporcao)}
      srcSet={srcSetMidia(valor.id, proporcao, larguras)}
      sizes={sizes}
      width={w}
      height={h}
      alt={alt}
      loading={prioridade ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={prioridade ? "high" : undefined}
    />
  );
}

/** Link externo seguro (abre em nova aba sem dar acesso à página de origem). */
export function eExterno(url: string) {
  return /^https?:\/\//.test(url);
}
export function propsLink(url: string) {
  return eExterno(url) ? { href: url, target: "_blank", rel: "noopener noreferrer" } : { href: url || "#" };
}
