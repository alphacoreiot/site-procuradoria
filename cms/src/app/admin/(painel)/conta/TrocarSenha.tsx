"use client";
import { useState, useTransition } from "react";
import { trocarMinhaSenha } from "../../acoes/auth";

export function TrocarSenha() {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const nova = String(f.get("nova")), conf = String(f.get("conf"));
        if (nova !== conf) return setMsg({ ok: false, t: "A confirmação não confere com a nova senha." });
        const form = e.currentTarget;
        iniciar(async () => {
          const r = await trocarMinhaSenha(String(f.get("atual")), nova);
          setMsg(r.ok ? { ok: true, t: r.msg || "Senha alterada." } : { ok: false, t: r.erro });
          if (r.ok) form.reset();
        });
      }}
    >
      <div className="campo"><label htmlFor="atual">Senha atual</label><input id="atual" name="atual" type="password" autoComplete="current-password" required maxLength={128} /></div>
      <div className="campo"><label htmlFor="nova">Nova senha</label><input id="nova" name="nova" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
      <div className="campo"><label htmlFor="conf">Confirmar nova senha</label><input id="conf" name="conf" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
      {msg && <p className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`}>{msg.t}</p>}
      <button className="bt bt--pri" disabled={pendente}>{pendente ? "Salvando…" : "Trocar senha"}</button>
    </form>
  );
}
