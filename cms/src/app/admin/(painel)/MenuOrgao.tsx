"use client";
import { usePathname } from "next/navigation";

/** Menu do órgão aberto no momento (marca a página atual). */
export function MenuOrgao({ orgaos, podeAdministrar }: { orgaos: { slug: string; sigla: string }[]; podeAdministrar: boolean }) {
  const caminho = usePathname();
  const atual = orgaos.find((o) => caminho.startsWith(`/admin/${o.slug}`));
  const item = (href: string, texto: string) => (
    <a href={href} aria-current={caminho === href || (href !== `/admin/${atual?.slug}` && caminho.startsWith(href)) ? "page" : undefined}>{texto}</a>
  );
  return (
    <>
      {orgaos.length > 1 && (
        <>
          <h4>Órgãos</h4>
          <nav aria-label="Órgãos">{orgaos.map((o) => <a key={o.slug} href={`/admin/${o.slug}`} aria-current={atual?.slug === o.slug ? "page" : undefined}>{o.sigla}</a>)}</nav>
        </>
      )}
      {atual && (
        <>
          <h4>{atual.sigla}</h4>
          <nav aria-label={`Conteúdo de ${atual.sigla}`}>
            {item(`/admin/${atual.slug}`, "Visão geral")}
            {item(`/admin/${atual.slug}/pagina`, "Página e componentes")}
            {item(`/admin/${atual.slug}/noticias`, "Notícias")}
            {item(`/admin/${atual.slug}/midia`, "Mídia")}
            {podeAdministrar && item(`/admin/${atual.slug}/configuracoes`, "Configurações")}
            {podeAdministrar && item(`/admin/${atual.slug}/usuarios`, "Usuários")}
            {podeAdministrar && item(`/admin/${atual.slug}/auditoria`, "Auditoria")}
            <a href={`/${atual.slug}`} target="_blank" rel="noopener noreferrer">Ver site ↗</a>
          </nav>
        </>
      )}
    </>
  );
}
