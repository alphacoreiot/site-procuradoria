import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Portal central: lista os sites dos órgãos ativos. */
export default async function Portal() {
  const orgaos = await db.orgao.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  return (
    <>
      <link rel="stylesheet" href="/assets/css/design-system.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/portal.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/cms.css" precedence="default" />
      <main className="portal-home">
        <div className="container">
          <p className="portal-home__eyebrow">Prefeitura Municipal de Camaçari</p>
          <h1>Órgãos e secretarias</h1>
          <ul className="portal-home__list">
            {orgaos.map((o) => (
              <li key={o.id}>
                <a href={`/${o.slug}`}>
                  <strong>{o.sigla}</strong>
                  <span>{o.nome}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="brand-stripe" aria-hidden="true" />
      </main>
    </>
  );
}
