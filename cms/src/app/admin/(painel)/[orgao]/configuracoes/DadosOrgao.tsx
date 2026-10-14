"use client";
import { useState, useTransition } from "react";
import { salvarOrgao } from "../../../acoes/conteudo";

export function DadosOrgao({ orgao, inicial, podeAtivar }: { orgao: string; inicial: { nome: string; sigla: string; ativo: boolean }; podeAtivar: boolean }) {
  const [d, setD] = useState(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); iniciar(async () => { const r = await salvarOrgao(orgao, d); setMsg(r.ok ? { ok: true, t: r.msg || "Salvo." } : { ok: false, t: r.erro }); }); }}>
      <div className="grade">
        <div className="campo"><div className="campo__linha"><label htmlFor="o-nome">Nome</label><span className="contador">{d.nome.length} / 100</span></div>
          <input id="o-nome" type="text" maxLength={100} required value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} /></div>
        <div className="campo"><div className="campo__linha"><label htmlFor="o-sigla">Sigla</label><span className="contador">{d.sigla.length} / 20</span></div>
          <input id="o-sigla" type="text" maxLength={20} required value={d.sigla} onChange={(e) => setD({ ...d, sigla: e.target.value })} /></div>
      </div>
      <div className="campo">
        <label className="check"><input type="checkbox" checked={d.ativo} disabled={!podeAtivar} onChange={(e) => setD({ ...d, ativo: e.target.checked })} />Site no ar (público)</label>
        {!podeAtivar && <p className="campo__ajuda">Somente a administração da Prefeitura ativa ou desativa sites.</p>}
      </div>
      {msg && <p className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`}>{msg.t}</p>}
      <button className="bt bt--pri" disabled={pendente}>{pendente ? "Salvando…" : "Salvar órgão"}</button>
    </form>
  );
}
