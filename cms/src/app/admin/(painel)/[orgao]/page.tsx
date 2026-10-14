import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";

type Props = { params: Promise<{ orgao: string }> };

export default async function VisaoGeral({ params }: Props) {
  const { usuario, orgao } = await orgaoDaPagina((await params).orgao);
  const [blocos, publicadas, rascunhos, midias] = await Promise.all([
    db.bloco.count({ where: { pagina: { orgaoId: orgao.id } } }),
    db.noticia.count({ where: { orgaoId: orgao.id, status: "PUBLICADA" } }),
    db.noticia.count({ where: { orgaoId: orgao.id, status: "RASCUNHO" } }),
    db.midia.count({ where: { orgaoId: orgao.id } }),
  ]);
  const admin = usuario.papel !== "EDITOR";
  const a = (href: string, t: string, d: string) => <a className="atalho" href={href}><strong>{t}</strong><span>{d}</span></a>;
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>{orgao.nome}</h1>
          <p className="sub">
            <span className={`tag ${orgao.ativo ? "tag--ok" : "tag--off"}`}>{orgao.ativo ? "No ar" : "Fora do ar"}</span>{" "}
            Endereço: <a href={`/${orgao.slug}`} target="_blank" rel="noopener noreferrer">/{orgao.slug}</a>
          </p>
        </div>
        <a className="bt bt--pri" href={`/admin/${orgao.slug}/noticias/nova`}>+ Nova notícia</a>
      </div>
      <div className="grade">
        {a(`/admin/${orgao.slug}/pagina`, "Página e componentes", `${blocos} componentes: cabeçalho, carrossel, textos, imagens, rodapé…`)}
        {a(`/admin/${orgao.slug}/noticias`, "Notícias", `${publicadas} publicada(s), ${rascunhos} rascunho(s)`)}
        {a(`/admin/${orgao.slug}/midia`, "Mídia", `${midias} imagem(ns) na biblioteca`)}
        {admin && a(`/admin/${orgao.slug}/configuracoes`, "Configurações", "Nome, título, favicon, WhatsApp")}
        {admin && a(`/admin/${orgao.slug}/usuarios`, "Usuários", "Quem pode editar este site")}
        {admin && a(`/admin/${orgao.slug}/auditoria`, "Auditoria", "Histórico de alterações")}
      </div>
    </>
  );
}
