import Link from "next/link";
import { exigirUsuario, orgaosDoUsuario } from "@/lib/auth";
import { sair } from "../acoes/auth";
import { MenuOrgao } from "./MenuOrgao";

const ROTULO_PAPEL = { SUPERADMIN: "Administração da Prefeitura", ADMIN: "Administrador(a) do órgão", EDITOR: "Editor(a)" };

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario();
  const orgaos = await orgaosDoUsuario(u);
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-side__marca">Portais<small>Prefeitura de Camaçari</small></div>
        <div className="adm-side__faixa" />
        <nav aria-label="Geral">
          <Link href="/admin">Início</Link>
          <Link href="/admin/conta">Minha conta</Link>
        </nav>
        <MenuOrgao orgaos={orgaos.map((o) => ({ slug: o.slug, sigla: o.sigla }))} podeAdministrar={u.papel !== "EDITOR"} />
        <div className="adm-side__rodape">
          <strong>{u.nome}</strong><br />{ROTULO_PAPEL[u.papel]}
          <form action={sair}><button className="bt bt--peq bt--claro" type="submit">Sair</button></form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
