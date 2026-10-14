"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useId, useState, useTransition } from "react";
import { valorVazio, type Campo } from "@/blocks/campos";
import type { Resultado } from "@/lib/acao";
import { SeletorImagem } from "./SeletorImagem";

type V = Record<string, any>;

/** Formulário gerado a partir da definição dos campos do componente. */
export function FormCampos({
  campos, inicial, orgao, salvar, textoBotao = "Salvar e publicar",
}: {
  campos: Campo[];
  inicial: V;
  orgao: string;
  salvar: (json: string) => Promise<Resultado<unknown>>;
  textoBotao?: string;
}) {
  const [valor, setValor] = useState<V>(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [sujo, setSujo] = useState(false);

  function alterar(v: V) {
    setValor(v);
    setSujo(true);
    setMsg(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvar(JSON.stringify(valor));
      setMsg(r.ok ? { ok: true, texto: r.msg || "Salvo." } : { ok: false, texto: r.erro });
      if (r.ok) setSujo(false);
    });
  }

  return (
    <form onSubmit={enviar} className="card">
      <Campos campos={campos} valor={valor} onChange={alterar} orgao={orgao} />
      <div className="barra-salvar">
        <button className="bt bt--pri" type="submit" disabled={pendente}>{pendente ? "Salvando…" : textoBotao}</button>
        {sujo && !pendente && <span className="contador">Há alterações não salvas</span>}
        {msg && <span role="status" className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`}>{msg.texto}</span>}
      </div>
    </form>
  );
}

function Campos({ campos, valor, onChange, orgao }: { campos: Campo[]; valor: V; onChange: (v: V) => void; orgao: string }) {
  return (
    <>
      {campos.map((c) => (
        <UmCampo key={c.nome} c={c} v={valor[c.nome]} orgao={orgao} onChange={(nv) => onChange({ ...valor, [c.nome]: nv })} />
      ))}
    </>
  );
}

function Contador({ n, max }: { n: number; max: number }) {
  const cls = n >= max ? "contador contador--limite" : n >= max * 0.9 ? "contador contador--perto" : "contador";
  return <span className={cls} aria-live="polite">{n} / {max}</span>;
}

function UmCampo({ c, v, onChange, orgao }: { c: Campo; v: any; onChange: (v: any) => void; orgao: string }) {
  const id = useId();
  const ajuda = c.ajuda ? <p className="campo__ajuda" id={`${id}-a`}>{c.ajuda}</p> : null;
  const descr = c.ajuda ? `${id}-a` : undefined;

  switch (c.tipo) {
    case "texto": {
      const txt = String(v ?? "");
      const props = {
        id, value: txt, maxLength: c.max, required: c.obrigatorio, "aria-describedby": descr,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value.slice(0, c.max)),
      };
      return (
        <div className="campo">
          <div className="campo__linha"><label htmlFor={id}>{c.rotulo}{c.obrigatorio && " *"}</label><Contador n={txt.length} max={c.max} /></div>
          {c.multilinha ? <textarea rows={c.linhas ?? 3} {...props} /> : <input type="text" {...props} />}
          {ajuda}
        </div>
      );
    }
    case "url":
    case "email":
    case "telefone": {
      const tipo = c.tipo === "url" ? "text" : c.tipo === "email" ? "email" : "tel";
      return (
        <div className="campo">
          <label htmlFor={id}>{c.rotulo}{"obrigatorio" in c && c.obrigatorio && " *"}</label>
          <input id={id} type={tipo} value={String(v ?? "")} maxLength={c.tipo === "telefone" ? 20 : 500} aria-describedby={descr}
            placeholder={c.tipo === "url" ? "https://…  ou  #ancora" : c.tipo === "telefone" ? "(71) 0000-0000" : ""}
            onChange={(e) => onChange(e.target.value)} />
          {ajuda}
        </div>
      );
    }
    case "numero":
      return (
        <div className="campo">
          <label htmlFor={id}>{c.rotulo} <span className="contador">({c.min} a {c.max})</span></label>
          <input id={id} type="number" min={c.min} max={c.max} step={c.passo ?? 1} value={v ?? c.min} aria-describedby={descr}
            onChange={(e) => onChange(e.target.value === "" ? c.min : Number(e.target.value))} />
          {ajuda}
        </div>
      );
    case "booleano":
      return (
        <div className="campo">
          <label className="check"><input type="checkbox" checked={!!v} onChange={(e) => onChange(e.target.checked)} />{c.rotulo}</label>
          {ajuda}
        </div>
      );
    case "selecao":
      return (
        <div className="campo">
          <label htmlFor={id}>{c.rotulo}</label>
          <select id={id} value={v ?? c.opcoes[0].valor} onChange={(e) => onChange(e.target.value)}>
            {c.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </div>
      );
    case "imagem":
      return (
        <div className="campo">
          <span className="campo__rotulo">{c.rotulo}{c.obrigatorio && " *"}</span>
          <SeletorImagem orgao={orgao} proporcao={c.proporcao} valor={v ?? { id: "", alt: "" }} onChange={onChange} />
          {ajuda}
        </div>
      );
    case "grupo":
      return (
        <fieldset className="grupo">
          <legend>{c.rotulo}</legend>
          {ajuda}
          <Campos campos={c.campos} valor={v ?? valorVazio(c.campos)} onChange={onChange} orgao={orgao} />
        </fieldset>
      );
    case "lista": {
      const itens: V[] = Array.isArray(v) ? v : [];
      const set = (novo: V[]) => onChange(novo);
      const mover = (i: number, d: number) => {
        const j = i + d;
        if (j < 0 || j >= itens.length) return;
        const n = [...itens];
        [n[i], n[j]] = [n[j], n[i]];
        set(n);
      };
      return (
        <div className="campo">
          <div className="campo__linha"><span className="campo__rotulo">{c.rotulo}</span><span className="contador">{itens.length} / {c.max} itens</span></div>
          {ajuda}
          <div className="lista-campos">
            {itens.map((item, i) => (
              <details className="item" key={i}>
                <summary>
                  <span className="num">{i + 1}</span>
                  <span className="resumo">{(c.resumo && String(item[c.resumo] ?? "")) || c.itemRotulo}</span>
                  <span className="acoes" onClick={(e) => e.preventDefault()}>
                    <button type="button" className="bt bt--peq" aria-label="Subir" onClick={() => mover(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" className="bt bt--peq" aria-label="Descer" onClick={() => mover(i, 1)} disabled={i === itens.length - 1}>↓</button>
                    <button type="button" className="bt bt--peq bt--perigo" aria-label="Remover"
                      onClick={() => { if (confirm(`Remover "${(c.resumo && item[c.resumo]) || c.itemRotulo}"?`)) set(itens.filter((_, k) => k !== i)); }}>Remover</button>
                  </span>
                </summary>
                <div className="item__corpo">
                  <Campos campos={c.campos} valor={item} onChange={(nv) => set(itens.map((x, k) => (k === i ? nv : x)))} orgao={orgao} />
                </div>
              </details>
            ))}
          </div>
          <div>
            <button type="button" className="bt" disabled={itens.length >= c.max} onClick={() => set([...itens, valorVazio(c.campos)])}>
              + Adicionar {c.itemRotulo.toLowerCase()}
            </button>
          </div>
        </div>
      );
    }
  }
}
