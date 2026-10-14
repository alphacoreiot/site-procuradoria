import { exigirUsuario } from "@/lib/auth";
import { TrocarSenha } from "./TrocarSenha";

export default async function Conta() {
  const u = await exigirUsuario();
  return (
    <>
      <h1>Minha conta</h1>
      <p className="sub">{u.nome} · {u.email}</p>
      <section className="card" style={{ maxWidth: 520 }}>
        <h2>Trocar senha</h2>
        <p className="sub">Mínimo de 12 caracteres, com pelo menos 3 destes: minúsculas, maiúsculas, números e símbolos. Ao trocar, as suas outras sessões são encerradas.</p>
        <TrocarSenha />
      </section>
    </>
  );
}
