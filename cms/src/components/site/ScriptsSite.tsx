"use client";
import { useEffect } from "react";

const SCRIPTS = ["/assets/js/organograma.js", "/assets/js/quemsomos.js", "/assets/js/main.js", "/assets/js/motion.js"];
/** Scripts carregados só nas páginas que têm o componente correspondente. */
const OPCIONAIS: [string, string][] = [["[data-banners]", "/assets/js/banners.js"], ["[data-orgr]", "/assets/js/organograma-ramos.js"], ["[data-cmp]", "/assets/js/competencias.js"], ["[data-pagina]", "/assets/js/paginas.js"], [".pag-moderna", "/assets/js/interacoes.js"], ["[data-assistente]", "/assets/js/assistente.js"]];

/**
 * Carrega os scripts de animação DEPOIS da hidratação do React. Eles alteram
 * o DOM (dividem títulos em palavras, criam o organograma...); se rodassem
 * antes, o React veria um HTML diferente do servidor e recriaria a página.
 * A ordem é mantida (async = false). Com 'strict-dynamic' na CSP, scripts
 * inseridos por código confiável são permitidos; o nonce é repassado mesmo assim.
 */
export function ScriptsSite({ nonce }: { nonce?: string }) {
  useEffect(() => {
    if ((window as unknown as { __pgmScripts?: boolean }).__pgmScripts) return;
    (window as unknown as { __pgmScripts?: boolean }).__pgmScripts = true;
    const lista = [...SCRIPTS, ...OPCIONAIS.filter(([sel]) => document.querySelector(sel)).map(([, src]) => src)];
    for (const src of lista) {
      const s = document.createElement("script");
      s.src = process.env.VERSAO_ATIVOS ? `${src}?v=${process.env.VERSAO_ATIVOS}` : src;
      s.async = false;
      if (nonce) s.nonce = nonce;
      document.body.appendChild(s);
    }
  }, [nonce]);
  return null;
}
