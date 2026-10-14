import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/session";
import { FormLogin } from "./FormLogin";

export default async function Login() {
  if (await obterSessao()) redirect("/admin");
  return (
    <main className="login">
      <div className="login__caixa">
        <div className="login__faixa" />
        <div className="login__corpo">
          <p className="sub" style={{ margin: 0 }}>Prefeitura Municipal de Camaçari</p>
          <h1>Painel dos portais</h1>
          <p className="sub">Entre com o seu e-mail institucional.</p>
          <FormLogin />
          <p className="login__nota">Acesso restrito e monitorado. Após 5 tentativas erradas a conta é bloqueada por 15 minutos.</p>
        </div>
      </div>
    </main>
  );
}
