"use client";
import { useState, useTransition } from "react";
import { excluirPagina, salvarPagina } from "../../../acoes/paginas";
import { LIMITES_PAGINA as L } from "@/lib/documentos-shared";
import { CorpoNoticia } from "@/components/site/noticias";

type Dados = { titulo: string; slug: string; descricaoSeo: string; conteudo: string; publicada: boolean };

export function FormPagina({ orgao, id, inicial, podeExcluir }: { orgao: string; id: string | null; inicial: Dados; podeExcluir: boolean }) {
  const [d, setD] = useState(inicial);
  const [idAtual, setIdAtual] = useState(id);
  const [previa, setPrevia] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = <K extends keyof Dados>(k: K, v: Dados[K]) => { setD((x) => ({ ...x, [k]: v })); setMsg(null); };

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvarPagina(orgao, idAtual, d);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      setMsg({ ok: true, t: r.msg || "Salvo." });
      if (r.dados) setD((x) => ({ ...x, slug: r.dados!.slug }));
      if (!idAtual && r.dados) {
        setIdAtual(r.dados.id);
        window.history.replaceState(null, "", `/admin/${orgao}/paginas/${r.dados.id}`);
      }
    });
  }
  function excluir() {
    if (!idAtual || !confirm("Excluir esta página? Esta ação não pode ser desfeita.")) return;
    iniciar(async () => {
      const r = await excluirPagina(orgao, idAtual);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      window.location.href = `/admin/${orgao}/paginas`;
    });
  }

  return (
    <form className="card" onSubmit={salvar}>
      <div className="campo">
        <label htmlFor="p-titulo">Título *</label>
        <input id="p-titulo" required maxLength={L.titulo} value={d.titulo} onChange={(e) => set("titulo", e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="p-slug">Endereço</label>
        <input id="p-slug" maxLength={L.slug} value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
        <p className="campo__ajuda">Deixe vazio para gerar a partir do título.</p>
      </div>
      <div className="campo">
        <label htmlFor="p-seo">Descrição para buscadores</label>
        <textarea id="p-seo" rows={2} maxLength={L.seo} value={d.descricaoSeo} onChange={(e) => set("descricaoSeo", e.target.value)} />
      </div>
      <div className="campo">
        <div className="campo__linha">
          <label htmlFor="p-conteudo">Conteúdo</label>
          <button className="bt bt--peq" type="button" onClick={() => setPrevia(!previa)}>{previa ? "Editar" : "Pré-visualizar"}</button>
        </div>
        {previa
          ? <CorpoNoticia markdown={d.conteudo} />
          : <textarea id="p-conteudo" rows={22} maxLength={L.conteudo} value={d.conteudo} onChange={(e) => set("conteudo", e.target.value)} />}
        <p className="campo__ajuda">{d.conteudo.length} / {L.conteudo}. Use Markdown: ## título, **negrito**, [texto](link), listas e tabelas.</p>
      </div>
      <div className="campo">
        <label><input type="checkbox" checked={d.publicada} onChange={(e) => set("publicada", e.target.checked)} /> Publicada no site</label>
      </div>
      {msg && <p className={msg.ok ? "aviso aviso--ok" : "aviso aviso--erro"} role="status">{msg.t}</p>}
      <div className="acoes">
        <button className="bt bt--pri" type="submit" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
        {idAtual && podeExcluir && <button className="bt bt--perigo" type="button" onClick={excluir} disabled={pendente}>Excluir</button>}
      </div>
    </form>
  );
}
