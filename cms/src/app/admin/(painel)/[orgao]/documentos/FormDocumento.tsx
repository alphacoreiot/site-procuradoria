"use client";
import { useState, useTransition } from "react";
import { excluirDocumento, salvarDocumento } from "../../../acoes/documentos";
import { LIMITES_DOC as L, TIPOS_DOC, TAMANHO_MAX_DOC, type TipoDoc } from "@/lib/documentos-shared";

type Dados = { tipo: TipoDoc; titulo: string; descricao: string; categoria: string; linkExterno: string; data: string; publicado: boolean; nomeArquivo: string };

export function FormDocumento({ orgao, id, inicial, categorias }: { orgao: string; id: string | null; inicial: Dados; categorias: string[] }) {
  const [d, setD] = useState(inicial);
  const [idAtual, setIdAtual] = useState(id);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = <K extends keyof Dados>(k: K, v: Dados[K]) => { setD((x) => ({ ...x, [k]: v })); setMsg(null); };

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const arq = form.get("arquivo");
    if (arq instanceof File && arq.size > TAMANHO_MAX_DOC) return setMsg({ ok: false, t: "O arquivo pode ter no máximo 40 MB." });
    form.set("publicado", d.publicado ? "1" : "0");
    iniciar(async () => {
      const r = await salvarDocumento(orgao, idAtual, form);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      setMsg({ ok: true, t: r.msg || "Salvo." });
      if (r.dados) setD((x) => ({ ...x, nomeArquivo: r.dados!.nomeArquivo }));
      if (!idAtual && r.dados) {
        setIdAtual(r.dados.id);
        window.history.replaceState(null, "", `/admin/${orgao}/documentos/${r.dados.id}`);
      }
    });
  }
  function excluir() {
    if (!idAtual || !confirm("Excluir este documento e o arquivo dele? Esta ação não pode ser desfeita.")) return;
    iniciar(async () => {
      const r = await excluirDocumento(orgao, idAtual);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      window.location.href = `/admin/${orgao}/documentos`;
    });
  }

  return (
    <form className="card" onSubmit={enviar}>
      <div className="campo">
        <label htmlFor="d-tipo">Área</label>
        <select id="d-tipo" name="tipo" value={d.tipo} onChange={(e) => set("tipo", e.target.value as TipoDoc)}>
          {Object.entries(TIPOS_DOC).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="d-titulo">Título *</label>
        <input id="d-titulo" name="titulo" required maxLength={L.titulo} value={d.titulo} onChange={(e) => set("titulo", e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="d-cat">Categoria</label>
        <input id="d-cat" name="categoria" list="d-cats" maxLength={L.categoria} value={d.categoria} onChange={(e) => set("categoria", e.target.value)} />
        <datalist id="d-cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div className="campo">
        <label htmlFor="d-desc">Descrição</label>
        <textarea id="d-desc" name="descricao" rows={3} maxLength={L.descricao} value={d.descricao} onChange={(e) => set("descricao", e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="d-data">Data *</label>
        <input id="d-data" name="data" type="date" required value={d.data} onChange={(e) => set("data", e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="d-arq">{d.nomeArquivo ? "Substituir arquivo" : "Arquivo"}</label>
        <input id="d-arq" name="arquivo" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" />
        <p className="campo__ajuda">{d.nomeArquivo ? `Atual: ${d.nomeArquivo}. ` : ""}PDF, Word, PowerPoint, Excel ou TXT, até 40 MB.</p>
      </div>
      <div className="campo">
        <label htmlFor="d-link">Link externo (se não houver arquivo)</label>
        <input id="d-link" name="linkExterno" type="url" maxLength={L.link} value={d.linkExterno} onChange={(e) => set("linkExterno", e.target.value)} />
      </div>
      <div className="campo">
        <label><input type="checkbox" checked={d.publicado} onChange={(e) => set("publicado", e.target.checked)} /> Publicado no site</label>
      </div>
      {msg && <p className={msg.ok ? "aviso aviso--ok" : "aviso aviso--erro"} role="status">{msg.t}</p>}
      <div className="acoes">
        <button className="bt bt--pri" type="submit" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
        {idAtual && <button className="bt bt--perigo" type="button" onClick={excluir} disabled={pendente}>Excluir</button>}
      </div>
    </form>
  );
}
