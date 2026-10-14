"use client";
import { useState, useTransition } from "react";
import { criarOrgao } from "../acoes/conteudo";

export function NovoOrgao() {
  const [d, setD] = useState({ nome: "", sigla: "", slug: "" });
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const slugAuto = (nome: string) =>
    nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await criarOrgao(d);
          if (!r.ok) return setErro(r.erro);
          window.location.href = `/admin/${r.dados}`;
        });
      }}
    >
      <div className="grade">
        <div className="campo"><label htmlFor="no-nome">Nome completo</label>
          <input id="no-nome" type="text" maxLength={100} required value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value, slug: d.slug || slugAuto(e.target.value) })} placeholder="Secretaria da Fazenda" /></div>
        <div className="campo"><label htmlFor="no-sigla">Sigla</label>
          <input id="no-sigla" type="text" maxLength={20} required value={d.sigla} onChange={(e) => setD({ ...d, sigla: e.target.value })} placeholder="SEFAZ" /></div>
        <div className="campo"><label htmlFor="no-slug">Endereço (/…)</label>
          <input id="no-slug" type="text" maxLength={40} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value.toLowerCase() })} placeholder="sefaz" /></div>
      </div>
      {erro && <p className="aviso aviso--erro">{erro}</p>}
      <button className="bt bt--pri" disabled={pendente}>{pendente ? "Criando…" : "Criar órgão"}</button>
    </form>
  );
}
