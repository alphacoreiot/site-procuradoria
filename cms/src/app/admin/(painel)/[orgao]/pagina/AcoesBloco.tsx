"use client";
import { useState, useTransition } from "react";
import { adicionarBloco, alternarBloco, excluirBloco, moverBloco } from "../../../acoes/conteudo";

export function AcoesBloco({ orgao, id, visivel, primeiro, ultimo, podeExcluir }: { orgao: string; id: string; visivel: boolean; primeiro: boolean; ultimo: boolean; podeExcluir: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      setErro(r.ok ? "" : r.erro || "Erro.");
    });
  return (
    <div className="acoes">
      <a className="bt bt--pri bt--peq" href={`/admin/${orgao}/bloco/${id}`}>Editar</a>
      <button className="bt bt--peq" disabled={pendente} onClick={() => rodar(() => alternarBloco(orgao, id))}>{visivel ? "Ocultar" : "Mostrar"}</button>
      <button className="bt bt--peq" disabled={pendente || primeiro} aria-label="Mover para cima" onClick={() => rodar(() => moverBloco(orgao, id, "acima"))}>↑</button>
      <button className="bt bt--peq" disabled={pendente || ultimo} aria-label="Mover para baixo" onClick={() => rodar(() => moverBloco(orgao, id, "abaixo"))}>↓</button>
      {podeExcluir && (
        <button className="bt bt--peq bt--perigo" disabled={pendente}
          onClick={() => confirm("Excluir este componente? O conteúdo fica registrado na auditoria.") && rodar(() => excluirBloco(orgao, id))}>Excluir</button>
      )}
      {erro && <span className="aviso aviso--erro">{erro}</span>}
    </div>
  );
}

export function AdicionarBloco({ orgao, tipos }: { orgao: string; tipos: { tipo: string; nome: string }[] }) {
  const [tipo, setTipo] = useState(tipos[0]?.tipo ?? "");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  return (
    <div className="acoes">
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="bt" aria-label="Tipo de componente">
        {tipos.map((t) => <option key={t.tipo} value={t.tipo}>{t.nome}</option>)}
      </select>
      <button className="bt bt--pri" disabled={pendente}
        onClick={() => iniciar(async () => {
          const r = await adicionarBloco(orgao, tipo);
          if (!r.ok) return setErro(r.erro);
          window.location.href = `/admin/${orgao}/bloco/${r.dados}`;
        })}>Adicionar</button>
      {erro && <span className="aviso aviso--erro">{erro}</span>}
    </div>
  );
}
