"use client";
import { useState, useTransition } from "react";
import { excluirNoticia, salvarNoticia } from "../../../acoes/noticias";
import { LIMITES_NOTICIA as L, gerarSlug } from "@/lib/noticias-shared";
import { SeletorImagem } from "@/components/admin/SeletorImagem";
import { CorpoNoticia } from "@/components/site/noticias";

type Dados = {
  titulo: string; slug: string; resumo: string; conteudo: string; categoria: string;
  capaId: string; capaAlt: string; destaque: boolean; status: "RASCUNHO" | "PUBLICADA"; publicadaEm: string;
};

function Cont({ n, max }: { n: number; max: number }) {
  return <span className={n >= max ? "contador contador--limite" : n >= max * 0.9 ? "contador contador--perto" : "contador"}>{n} / {max}</span>;
}

export function FormNoticia({ orgao, id, inicial }: { orgao: string; id: string | null; inicial: Dados }) {
  const [d, setD] = useState<Dados>(inicial);
  const [idAtual, setIdAtual] = useState(id);
  const [previa, setPrevia] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = <K extends keyof Dados>(k: K, v: Dados[K]) => { setD((x) => ({ ...x, [k]: v })); setMsg(null); };

  function salvar(status: Dados["status"]) {
    iniciar(async () => {
      const r = await salvarNoticia(orgao, idAtual, { ...d, status });
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      setD((x) => ({ ...x, status, slug: r.dados?.slug ?? x.slug }));
      setMsg({ ok: true, t: r.msg || "Salvo." });
      if (!idAtual && r.dados) {
        setIdAtual(r.dados.id);
        window.history.replaceState(null, "", `/admin/${orgao}/noticias/${r.dados.id}`);
      }
    });
  }

  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); salvar(d.status); }}>
      <div className="campo">
        <div className="campo__linha"><label htmlFor="n-titulo">Título *</label><Cont n={d.titulo.length} max={L.titulo} /></div>
        <input id="n-titulo" type="text" required maxLength={L.titulo} value={d.titulo} onChange={(e) => set("titulo", e.target.value)} />
      </div>
      <div className="campo">
        <div className="campo__linha"><label htmlFor="n-slug">Endereço da notícia</label><Cont n={d.slug.length} max={L.slug} /></div>
        <input id="n-slug" type="text" maxLength={L.slug} value={d.slug} placeholder={gerarSlug(d.titulo || "titulo-da-noticia")}
          onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
        <p className="campo__ajuda">Deixe vazio para gerar a partir do título. Só letras minúsculas, números e hífen.</p>
      </div>
      <div className="campo">
        <div className="campo__linha"><label htmlFor="n-resumo">Resumo (aparece nos cartões e no Google) *</label><Cont n={d.resumo.length} max={L.resumo} /></div>
        <textarea id="n-resumo" rows={3} required maxLength={L.resumo} value={d.resumo} onChange={(e) => set("resumo", e.target.value)} />
      </div>
      <div className="grade">
        <div className="campo">
          <div className="campo__linha"><label htmlFor="n-cat">Categoria</label><Cont n={d.categoria.length} max={L.categoria} /></div>
          <input id="n-cat" type="text" maxLength={L.categoria} value={d.categoria} placeholder="Institucional, Dívida Ativa…" onChange={(e) => set("categoria", e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="n-data">Data de publicação</label>
          <input id="n-data" type="datetime-local" value={d.publicadaEm} onChange={(e) => set("publicadaEm", e.target.value)} />
          <p className="campo__ajuda">Vazio = agora. Data futura = publicação agendada.</p>
        </div>
      </div>
      <div className="campo">
        <span className="campo__rotulo">Imagem de capa</span>
        <SeletorImagem orgao={orgao} proporcao="16x9" valor={{ id: d.capaId, alt: d.capaAlt }} onChange={(v) => { set("capaId", v.id); set("capaAlt", v.alt); }} />
      </div>
      <div className="campo">
        <div className="campo__linha">
          <label htmlFor="n-corpo">Conteúdo</label>
          <span className="acoes"><Cont n={d.conteudo.length} max={L.conteudo} />
            <button type="button" className="bt bt--peq" onClick={() => setPrevia(!previa)}>{previa ? "Editar" : "Pré-visualizar"}</button></span>
        </div>
        {previa
          ? <div className="item" style={{ padding: "6px 18px" }}><CorpoNoticia markdown={d.conteudo} /></div>
          : <textarea id="n-corpo" rows={16} maxLength={L.conteudo} value={d.conteudo} onChange={(e) => set("conteudo", e.target.value)} />}
        <p className="campo__ajuda">Formatação: **negrito**, *itálico*, ## Subtítulo, - lista, [texto do link](https://…), &gt; citação. HTML não é aceito.</p>
      </div>
      <div className="campo">
        <label className="check"><input type="checkbox" checked={d.destaque} onChange={(e) => set("destaque", e.target.checked)} />Destaque (aparece primeiro na página inicial)</label>
      </div>
      <div className="barra-salvar">
        <button type="button" className="bt bt--pri" disabled={pendente} onClick={() => salvar("PUBLICADA")}>{d.status === "PUBLICADA" ? "Salvar publicada" : "Publicar"}</button>
        <button type="button" className="bt" disabled={pendente} onClick={() => salvar("RASCUNHO")}>{d.status === "PUBLICADA" ? "Despublicar (rascunho)" : "Salvar rascunho"}</button>
        {idAtual && (
          <button type="button" className="bt bt--perigo" disabled={pendente}
            onClick={() => confirm("Excluir esta notícia definitivamente?") && iniciar(async () => {
              const r = await excluirNoticia(orgao, idAtual);
              if (r.ok) window.location.href = `/admin/${orgao}/noticias`; else setMsg({ ok: false, t: r.erro });
            })}>Excluir</button>
        )}
        {msg && <span role="status" className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`}>{msg.t}</span>}
      </div>
    </form>
  );
}
