"use client";
import { useState, useTransition } from "react";
import { excluirProcesso, salvarProcesso } from "../../../acoes/paginas";
import { LIMITES_PROCESSO as L } from "@/lib/documentos-shared";

type Item = { documento: string; obrigatorio: boolean };
type Dados = { titulo: string; publicado: boolean; exigencias: Item[] };

export function FormProcesso({ orgao, id, inicial }: { orgao: string; id: string | null; inicial: Dados }) {
  const [d, setD] = useState(inicial);
  const [idAtual, setIdAtual] = useState(id);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudar = (f: (x: Dados) => Dados) => { setD(f); setMsg(null); };
  const item = (i: number, v: Partial<Item>) => mudar((x) => ({ ...x, exigencias: x.exigencias.map((e, n) => (n === i ? { ...e, ...v } : e)) }));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvarProcesso(orgao, idAtual, d);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      setMsg({ ok: true, t: r.msg || "Salvo." });
      if (!idAtual && r.dados) {
        setIdAtual(r.dados.id);
        window.history.replaceState(null, "", `/admin/${orgao}/processos/${r.dados.id}`);
      }
    });
  }
  function excluir() {
    if (!idAtual || !confirm("Excluir este processo? Esta ação não pode ser desfeita.")) return;
    iniciar(async () => {
      const r = await excluirProcesso(orgao, idAtual);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      window.location.href = `/admin/${orgao}/processos`;
    });
  }

  return (
    <form className="card" onSubmit={salvar}>
      <div className="campo">
        <label htmlFor="pr-titulo">Título *</label>
        <input id="pr-titulo" required maxLength={L.titulo} value={d.titulo} onChange={(e) => mudar((x) => ({ ...x, titulo: e.target.value }))} />
      </div>
      <h2>Documentos necessários</h2>
      {d.exigencias.map((e, i) => (
        <div className="linha-exigencia" key={i}>
          <input aria-label={`Documento ${i + 1}`} required maxLength={L.documento} value={e.documento} onChange={(ev) => item(i, { documento: ev.target.value })} />
          <label><input type="checkbox" checked={e.obrigatorio} onChange={(ev) => item(i, { obrigatorio: ev.target.checked })} /> Obrigatório</label>
          <button className="bt bt--peq" type="button" aria-label={`Remover documento ${i + 1}`} onClick={() => mudar((x) => ({ ...x, exigencias: x.exigencias.filter((_, n) => n !== i) }))}>Remover</button>
        </div>
      ))}
      {d.exigencias.length < L.itens && (
        <button className="bt bt--peq" type="button" onClick={() => mudar((x) => ({ ...x, exigencias: [...x.exigencias, { documento: "", obrigatorio: true }] }))}>+ Adicionar documento</button>
      )}
      <div className="campo">
        <label><input type="checkbox" checked={d.publicado} onChange={(e) => mudar((x) => ({ ...x, publicado: e.target.checked }))} /> Publicado no site</label>
      </div>
      {msg && <p className={msg.ok ? "aviso aviso--ok" : "aviso aviso--erro"} role="status">{msg.t}</p>}
      <div className="acoes">
        <button className="bt bt--pri" type="submit" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
        {idAtual && <button className="bt bt--perigo" type="button" onClick={excluir} disabled={pendente}>Excluir</button>}
      </div>
    </form>
  );
}
