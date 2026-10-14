import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";
import { BLOCOS, BLOCOS_POR_TIPO } from "@/blocks/specs";
import { AcoesBloco, AdicionarBloco } from "./AcoesBloco";

type Props = { params: Promise<{ orgao: string }> };
const AREAS = [
  { area: "cabecalho", nome: "Cabeçalho" },
  { area: "principal", nome: "Conteúdo da página (de cima para baixo)" },
  { area: "rodape", nome: "Rodapé" },
];

export default async function PaginaComponentes({ params }: Props) {
  const { usuario, orgao } = await orgaoDaPagina((await params).orgao);
  const blocos = await db.bloco.findMany({ where: { pagina: { orgaoId: orgao.id, slug: "inicio" } }, orderBy: { ordem: "asc" } });
  const admin = usuario.papel !== "EDITOR";
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Página e componentes</h1>
          <p className="sub">Tudo o que aparece no site é um componente. Edite, reordene ou oculte cada um.</p>
        </div>
        <a className="bt" href={`/${orgao.slug}`} target="_blank" rel="noopener noreferrer">Ver site ↗</a>
      </div>
      {AREAS.map(({ area, nome }) => {
        const lista = blocos.filter((b) => b.area === area);
        return (
          <section className="card" key={area}>
            <h2>{nome}</h2>
            <ul className="lista">
              {lista.map((b, i) => (
                <li key={b.id}>
                  <div className="lista__info">
                    <strong>{BLOCOS_POR_TIPO[b.tipo]?.nome ?? b.tipo}</strong>{" "}
                    <span className={`tag ${b.visivel ? "tag--ok" : "tag--off"}`}>{b.visivel ? "Visível" : "Oculto"}</span>
                    <small>{BLOCOS_POR_TIPO[b.tipo]?.descricao} {b.alteradoPor && `· última edição: ${b.alteradoPor}`}</small>
                  </div>
                  <AcoesBloco orgao={orgao.slug} id={b.id} visivel={b.visivel} primeiro={i === 0} ultimo={i === lista.length - 1} podeExcluir={admin} />
                </li>
              ))}
              {lista.length === 0 && <li className="sub">Nenhum componente nesta área.</li>}
            </ul>
          </section>
        );
      })}
      {admin && (
        <section className="card">
          <h2>Adicionar componente</h2>
          <p className="sub">O componente novo entra oculto, no fim da área, com conteúdo de exemplo.</p>
          <AdicionarBloco orgao={orgao.slug} tipos={BLOCOS.map((b) => ({ tipo: b.tipo, nome: b.nome }))} />
        </section>
      )}
    </>
  );
}
