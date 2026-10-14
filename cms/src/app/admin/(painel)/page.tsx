import { exigirUsuario, orgaosDoUsuario } from "@/lib/auth";
import { NovoOrgao } from "./NovoOrgao";

export default async function InicioPainel() {
  const u = await exigirUsuario();
  const orgaos = await orgaosDoUsuario(u);
  return (
    <>
      <h1>Olá, {u.nome.split(" ")[0]}</h1>
      <p className="sub">Escolha o site que deseja editar.</p>
      {orgaos.length === 0 ? <p className="card">Sua conta ainda não está ligada a nenhum órgão. Fale com a administração da Prefeitura.</p> : (
        <div className="grade">
          {orgaos.map((o) => (
            <a key={o.id} className="atalho" href={`/admin/${o.slug}`}>
              <strong>{o.sigla}</strong>
              <span>{o.nome}</span><br />
              <span className={`tag ${o.ativo ? "tag--ok" : "tag--off"}`}>{o.ativo ? "No ar" : "Fora do ar"}</span>
            </a>
          ))}
        </div>
      )}
      {u.papel === "SUPERADMIN" && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2>Novo órgão / secretaria</h2>
          <p className="sub">O site é criado com todos os componentes e textos de exemplo, <strong>fora do ar</strong>, até ser preenchido e ativado.</p>
          <NovoOrgao />
        </section>
      )}
    </>
  );
}
