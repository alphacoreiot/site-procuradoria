"use client";
import { useActionState } from "react";
import { entrar, type EstadoLogin } from "../acoes/auth";

export function FormLogin() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, undefined);
  return (
    <form action={acao}>
      <div className="campo">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={120} autoFocus />
      </div>
      <div className="campo">
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required maxLength={128} />
      </div>
      {estado?.erro && <p className="aviso aviso--erro" role="alert">{estado.erro}</p>}
      <button className="bt bt--pri" type="submit" disabled={pendente} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
