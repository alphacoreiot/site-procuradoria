"use client";
import { useRef, useState, useTransition } from "react";
import { atualizarMidia, enviarMidia, excluirMidia, type ItemMidia } from "../../../acoes/midia";
import { urlMidia, type Proporcao } from "@/lib/media-shared";

const RECORTES: Proporcao[] = ["16x9", "3x2", "1x1", "4x5", "6x5"];

export function GerenciarMidia({ orgao, inicial }: { orgao: string; inicial: ItemMidia[] }) {
  const [itens, setItens] = useState(inicial);
  const [sel, setSel] = useState<ItemMidia | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);

  function enviar(lista: FileList) {
    setMsg(null);
    iniciar(async () => {
      for (const f of Array.from(lista).slice(0, 10)) {
        if (f.size > 5 * 1024 * 1024) { setMsg({ ok: false, t: `${f.name}: máximo de 5 MB.` }); continue; }
        const fd = new FormData();
        fd.append("arquivo", f);
        const r = await enviarMidia(orgao, fd);
        if (!r.ok) { setMsg({ ok: false, t: `${f.name}: ${r.erro}` }); continue; }
        if (r.dados) setItens((x) => [r.dados!, ...x]);
      }
    });
  }

  return (
    <>
      <div className="card">
        <div className="acoes">
          <input ref={arquivo} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => e.target.files && enviar(e.target.files)} />
          <button className="bt bt--pri" disabled={pendente} onClick={() => arquivo.current?.click()}>{pendente ? "Enviando…" : "Enviar imagens"}</button>
          <span className="contador">JPG, PNG, WebP ou AVIF · até 5 MB cada · até 10 por vez</span>
          {msg && <span className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`}>{msg.t}</span>}
        </div>
      </div>
      <div className="card">
        {itens.length === 0 ? <p className="sub">Nenhuma imagem ainda.</p> : (
          <div className="galeria">
            {itens.map((m) => (
              <button key={m.id} type="button" onClick={() => setSel(m)} title={m.nome}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlMidia(m.id, 320, "livre")} alt={m.alt} loading="lazy" />
                <small>{m.nome} · {m.largura}×{m.altura}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {sel && (
        <EditarMidia
          orgao={orgao} m={sel} fechar={() => setSel(null)}
          salvo={(nova) => { setItens((x) => x.map((i) => (i.id === nova.id ? nova : i))); setSel(nova); }}
          excluido={() => { setItens((x) => x.filter((i) => i.id !== sel.id)); setSel(null); }}
        />
      )}
    </>
  );
}

function EditarMidia({ orgao, m, fechar, salvo, excluido }: { orgao: string; m: ItemMidia; fechar: () => void; salvo: (m: ItemMidia) => void; excluido: () => void }) {
  const [alt, setAlt] = useState(m.alt);
  const [foco, setFoco] = useState({ x: m.focoX, y: m.focoY });
  const [versao, setVersao] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Editar imagem" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal__caixa">
        <div className="modal__topo"><h2 style={{ margin: 0 }}>{m.nome}</h2><button className="bt" onClick={fechar}>Fechar</button></div>
        <p className="sub">{m.largura}×{m.altura} px. Clique na imagem para marcar o ponto mais importante (ex.: o rosto): os recortes ficam centrados nele.</p>
        <div className="foco"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setFoco({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
          }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlMidia(m.id, 1024, "livre")} alt="" />
          <span className="foco__ponto" style={{ left: `${foco.x * 100}%`, top: `${foco.y * 100}%` }} />
        </div>
        <h3 style={{ margin: "16px 0 8px" }}>Como fica em cada proporção</h3>
        <div className="recortes">
          {RECORTES.map((p) => (
            <figure key={p}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${urlMidia(m.id, 320, p)}&v=${versao}`} alt="" />
              <figcaption>{p.replace("x", ":")}</figcaption>
            </figure>
          ))}
        </div>
        <div className="campo" style={{ marginTop: 16 }}>
          <div className="campo__linha"><label htmlFor="m-alt">Descrição padrão (texto alternativo)</label><span className="contador">{alt.length} / 160</span></div>
          <input id="m-alt" type="text" maxLength={160} value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div className="acoes">
          <button className="bt bt--pri" disabled={pendente} onClick={() => iniciar(async () => {
            const r = await atualizarMidia(orgao, m.id, { alt, focoX: foco.x, focoY: foco.y });
            setMsg(r.ok ? { ok: true, t: r.msg || "Salvo." } : { ok: false, t: r.erro });
            if (r.ok) { salvo({ ...m, alt, focoX: foco.x, focoY: foco.y }); setVersao((v) => v + 1); }
          })}>Salvar</button>
          <button className="bt bt--perigo" disabled={pendente} onClick={() => confirm("Excluir esta imagem?") && iniciar(async () => {
            const r = await excluirMidia(orgao, m.id);
            if (r.ok) excluido(); else setMsg({ ok: false, t: r.erro });
          })}>Excluir</button>
          {msg && <span className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`}>{msg.t}</span>}
        </div>
      </div>
    </div>
  );
}
