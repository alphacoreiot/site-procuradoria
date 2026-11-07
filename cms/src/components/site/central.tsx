import { formatarBytes, rotuloFormato } from "@/lib/documentos-shared";
import { fraseAmigavel } from "@/lib/texto";
import type { DocCentral, ItemSerie, SecaoCentral } from "@/lib/central";
import { Separador } from "./abas";
import { Icone } from "./ui";

const Chip = ({ i }: { i: ItemSerie }) => <a className="chip-doc" href={`/doc/${i.id}`} target="_blank" rel="noopener noreferrer">{i.rotulo}</a>;

function Cartao({ d }: { d: DocCentral }) {
  const href = d.arquivo ? `/doc/${d.id}` : d.linkExterno;
  const pdf = d.mime === "application/pdf";
  return (
    <li>
      <a className="doc-card" href={href} {...(!d.arquivo || pdf ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        <span className="doc-item__formato">{d.arquivo ? rotuloFormato(d.mime) : "LINK"}</span>
        <span className="doc-card__txt">
          <strong>{fraseAmigavel(d.titulo)}</strong>
          <small>{d.ano}{d.bytes > 0 && <> · {formatarBytes(d.bytes)}</>}</small>
        </span>
        <Icone id="arrow" className="doc-card__seta" />
      </a>
    </li>
  );
}

/** Central por categoria, com todos os documentos à vista. */
export function CentralOrganizada({ secoes }: { secoes: SecaoCentral[] }) {
  return (
    <div className="central">
      {secoes.map((s) => (
        <section key={s.nome} className="central__secao" aria-label={s.nome}>
          <Separador />
          <header className="central__topo">
            <h2>{s.nome} <span>{s.total}</span></h2>
            {s.desc && <p>{s.desc}</p>}
          </header>

          {s.audiencias.length > 0 && (
            <ul className="aud">
              {s.audiencias.map((a) => (
                <li key={a.ano}>
                  <strong>{a.ano}</strong>
                  <div>{a.itens.map((i) => <Chip key={i.id} i={i} />)}</div>
                </li>
              ))}
            </ul>
          )}

          {s.series.map((g) => (
            <div key={g.titulo} className="serie">
              <h3>{g.titulo}</h3>
              <div>{g.itens.map((i) => <Chip key={i.id} i={i} />)}</div>
            </div>
          ))}

          {s.soltos.length > 0 && <ul className="doc-cards">{s.soltos.map((d) => <Cartao key={d.id} d={d} />)}</ul>}
        </section>
      ))}
    </div>
  );
}
