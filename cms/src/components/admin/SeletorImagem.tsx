"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { enviarMidia, listarMidias, type ItemMidia } from "@/app/admin/acoes/midia";
import { PROPORCOES, ROTULO_PROPORCAO, urlMidia, type Proporcao } from "@/lib/media-shared";

type Valor = { id: string; alt: string };

/**
 * Escolhe uma imagem da biblioteca do órgão (ou envia uma nova) e mostra a
 * prévia JÁ RECORTADA na proporção do campo — exatamente como vai para o site.
 */
export function SeletorImagem({ orgao, proporcao, valor, onChange }: { orgao: string; proporcao: Proporcao; valor: Valor; onChange: (v: Valor) => void }) {
  const [aberto, setAberto] = useState(false);
  const razao = PROPORCOES[proporcao];
  return (
    <div className="img-campo">
      <div className="img-prev" style={{ aspectRatio: razao ? String(razao) : "16 / 9" }}>
        {valor.id
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={urlMidia(valor.id, 480, proporcao)} alt="" />
          : <span>sem imagem</span>}
      </div>
      <div className="img-campo__lado">
        <span className="contador">Proporção: {ROTULO_PROPORCAO[proporcao]}</span>
        <div className="acoes">
          <button type="button" className="bt" onClick={() => setAberto(true)}>{valor.id ? "Trocar imagem" : "Escolher imagem"}</button>
          {valor.id && <button type="button" className="bt bt--perigo" onClick={() => onChange({ id: "", alt: "" })}>Remover</button>}
        </div>
        {valor.id && (
          <div className="campo" style={{ marginBottom: 0 }}>
            <div className="campo__linha"><label>Texto alternativo (descrição para leitores de tela)</label><span className="contador">{valor.alt.length} / 160</span></div>
            <input type="text" maxLength={160} value={valor.alt} placeholder="Ex.: Fachada da sede da Procuradoria" onChange={(e) => onChange({ ...valor, alt: e.target.value })} />
          </div>
        )}
      </div>
      {aberto && <Biblioteca orgao={orgao} proporcao={proporcao} atual={valor.id} fechar={() => setAberto(false)} escolher={(m) => { onChange({ id: m.id, alt: valor.alt || m.alt }); setAberto(false); }} />}
    </div>
  );
}

function Biblioteca({ orgao, proporcao, atual, fechar, escolher }: { orgao: string; proporcao: Proporcao; atual: string; fechar: () => void; escolher: (m: ItemMidia) => void }) {
  const [itens, setItens] = useState<ItemMidia[] | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;

  useEffect(() => {
    listarMidias(orgao).then(setItens).catch(() => setErro("Não foi possível carregar a biblioteca."));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fecharRef.current();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [orgao]);

  function enviar(f: File) {
    setErro("");
    if (f.size > 5 * 1024 * 1024) return setErro("A imagem pode ter no máximo 5 MB.");
    const fd = new FormData();
    fd.append("arquivo", f);
    iniciar(async () => {
      const r = await enviarMidia(orgao, fd);
      if (!r.ok) return setErro(r.erro);
      if (r.dados) escolher(r.dados);
    });
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Biblioteca de imagens" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal__caixa">
        <div className="modal__topo">
          <h2 style={{ margin: 0 }}>Biblioteca de imagens</h2>
          <div className="acoes">
            <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
            <button type="button" className="bt bt--pri" disabled={enviando} onClick={() => arquivo.current?.click()}>{enviando ? "Enviando…" : "Enviar nova imagem"}</button>
            <button type="button" className="bt" onClick={fechar}>Fechar</button>
          </div>
        </div>
        <p className="sub">JPG, PNG, WebP ou AVIF, até 5 MB. A imagem é otimizada e recortada automaticamente em {ROTULO_PROPORCAO[proporcao]}; o enquadramento usa o ponto focal definido em &quot;Mídia&quot;.</p>
        {erro && <p className="aviso aviso--erro">{erro}</p>}
        {!itens ? <p>Carregando…</p> : itens.length === 0 ? <p>Nenhuma imagem ainda.</p> : (
          <div className="galeria">
            {itens.map((m) => (
              <button key={m.id} type="button" aria-pressed={m.id === atual} onClick={() => escolher(m)} title={m.nome}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlMidia(m.id, 320, proporcao)} alt={m.alt} loading="lazy" />
                <small>{m.nome} · {m.largura}×{m.altura}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
