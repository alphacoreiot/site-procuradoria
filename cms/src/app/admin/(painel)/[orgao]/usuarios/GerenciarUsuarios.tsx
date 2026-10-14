"use client";
import { useState, useTransition } from "react";
import { alternarUsuario, criarUsuario, redefinirSenha } from "../../../acoes/usuarios";

type U = { id: string; nome: string; email: string; papel: string; ativo: boolean; bloqueado: boolean; ultimo: string };

export function GerenciarUsuarios({ orgao, meuId, usuarios }: { orgao: string; meuId: string; usuarios: U[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [novo, setNovo] = useState({ nome: "", email: "", papel: "EDITOR", senha: "" });
  const resp = (r: { ok: boolean; erro?: string; msg?: string }) => setMsg(r.ok ? { ok: true, t: r.msg || "Feito." } : { ok: false, t: r.erro || "Erro." });

  return (
    <>
      {msg && <p className={`aviso ${msg.ok ? "aviso--ok" : "aviso--erro"}`} role="status">{msg.t}</p>}
      <section className="card">
        <ul className="lista">
          {usuarios.map((u) => (
            <li key={u.id}>
              <div className="lista__info">
                <strong>{u.nome}</strong>{" "}
                <span className="tag tag--roxo">{u.papel === "ADMIN" ? "Administrador(a)" : "Editor(a)"}</span>{" "}
                {!u.ativo && <span className="tag tag--off">Desativado</span>}{" "}
                {u.bloqueado && <span className="tag tag--off">Bloqueado</span>}
                <small>{u.email} · último acesso: {u.ultimo}</small>
              </div>
              {u.id !== meuId && (
                <div className="acoes">
                  <button className="bt bt--peq" disabled={pendente} onClick={() => iniciar(async () => resp(await alternarUsuario(orgao, u.id)))}>{u.ativo ? "Desativar" : "Reativar"}</button>
                  <button className="bt bt--peq" disabled={pendente} onClick={() => {
                    const s = prompt(`Nova senha para ${u.email} (12+ caracteres):`);
                    if (s) iniciar(async () => resp(await redefinirSenha(orgao, u.id, s)));
                  }}>Redefinir senha</button>
                </div>
              )}
            </li>
          ))}
          {usuarios.length === 0 && <li className="sub">Nenhum usuário do órgão ainda.</li>}
        </ul>
      </section>
      <section className="card">
        <h2>Novo usuário</h2>
        <form onSubmit={(e) => { e.preventDefault(); iniciar(async () => { const r = await criarUsuario(orgao, novo); resp(r); if (r.ok) setNovo({ nome: "", email: "", papel: "EDITOR", senha: "" }); }); }}>
          <div className="grade">
            <div className="campo"><label htmlFor="u-nome">Nome</label><input id="u-nome" type="text" required maxLength={80} value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
            <div className="campo"><label htmlFor="u-email">E-mail institucional</label><input id="u-email" type="email" required maxLength={120} value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
            <div className="campo"><label htmlFor="u-papel">Papel</label>
              <select id="u-papel" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })}><option value="EDITOR">Editor(a)</option><option value="ADMIN">Administrador(a)</option></select></div>
            <div className="campo"><label htmlFor="u-senha">Senha inicial</label><input id="u-senha" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} /></div>
          </div>
          <button className="bt bt--pri" disabled={pendente}>Criar usuário</button>
        </form>
      </section>
    </>
  );
}
