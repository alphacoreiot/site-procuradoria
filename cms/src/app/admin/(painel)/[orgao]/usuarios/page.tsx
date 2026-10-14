import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { GerenciarUsuarios } from "./GerenciarUsuarios";

type Props = { params: Promise<{ orgao: string }> };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia" });

export default async function Usuarios({ params }: Props) {
  const { usuario, orgao } = await orgaoDaPagina((await params).orgao, "ADMIN");
  const lista = await db.usuario.findMany({ where: { orgaoId: orgao.id }, orderBy: { nome: "asc" } });
  return (
    <>
      <h1>Usuários</h1>
      <p className="sub">Quem pode editar o site de {orgao.sigla}. <strong>Editor(a)</strong>: conteúdo, notícias e mídia. <strong>Administrador(a)</strong>: também configurações, componentes, usuários e auditoria.</p>
      <GerenciarUsuarios
        orgao={orgao.slug}
        meuId={usuario.id}
        usuarios={lista.map((u) => ({
          id: u.id, nome: u.nome, email: u.email, papel: u.papel, ativo: u.ativo,
          bloqueado: !!(u.bloqueadoAte && u.bloqueadoAte > new Date()),
          ultimo: u.ultimoAcesso ? fmt.format(u.ultimoAcesso) : "nunca",
        }))}
      />
    </>
  );
}
