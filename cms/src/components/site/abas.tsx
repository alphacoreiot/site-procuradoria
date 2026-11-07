import { Icone, eExterno, propsLink } from "./ui";
import { fraseAmigavel } from "@/lib/texto";
import { normalizarBusca } from "@/lib/documentos-shared";
import type { ItemLink } from "@/lib/conteudo";

export type ItemAba = { href: string; texto: string; total?: number; ativo: boolean };

/** Linha nas cores da marca, desenhada quando entra na tela. */
export const Separador = () => (
  <div className="separador" aria-hidden="true"><span /><span /><span /><span /></div>
);

/** Categorias sempre todas à vista: quebram em linhas. O marcador deslizante vem do script. */
export function Abas({ rotulo, itens, separador = true, ancoras = false }: { rotulo: string; itens: ItemAba[]; separador?: boolean; ancoras?: boolean }) {
  return (
    <>
      <nav className={`abas${ancoras ? " abas--ancoras" : ""}`} aria-label={rotulo} data-abas>
        <div className="abas__trilho">
          <span className="abas__marca" aria-hidden="true" />
          {itens.map((i) => (
            <a key={i.href} href={i.href} aria-current={i.ativo ? "true" : undefined}>
              <b>{i.texto}</b>{i.total !== undefined && <span>{i.total}</span>}
            </a>
          ))}
        </div>
      </nav>
      {separador && <Separador />}
    </>
  );
}

/** Conjunto de opções de filtro, todas visíveis. */
export function LinhaFiltro({ rotulo, itens }: { rotulo: string; itens: ItemAba[] }) {
  return (
    <div className="flt" role="group" aria-label={rotulo}>
      <span className="flt__rotulo">{rotulo}</span>
      <div className="flt__itens">
        {itens.map((i) => (
          <a key={i.href} href={i.href} aria-current={i.ativo ? "true" : undefined}>
            {i.texto}{i.total !== undefined && <span>{i.total}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

const ICONES: [RegExp, string][] = [
  [/2.{0,2}via|parcelamento|pagamento/, "ticket"],
  [/certid|alvara/, "id"],
  [/consulta|protocolo|autenticidade/, "search"],
  [/e-?mail/, "mail"],
  [/ouvidoria/, "chat"],
  [/servidor|autonomo|inscricao/, "user"],
  [/iptu|itiv|itbi|imoveis|sedur/, "pin"],
  [/nfs|nota fiscal|dt-e|iss/, "doc"],
  [/tff|trsd|cosip/, "layers"],
  [/diario|arquivos|legislacao/, "inbox"],
  [/sebrae|juceb|simples/, "handshake"],
  [/sistema|portal|gov|receita|sefaz|tce|serpro/, "grid"],
];
const iconeDe = (t: string) => ICONES.find(([re]) => re.test(t))?.[1] ?? "send";

function Servico({ l }: { l: ItemLink }) {
  const n = normalizarBusca(l.texto);
  return (
    <li data-busca={n}>
      <a className="serv" {...propsLink(l.url)}>
        <span className="serv__ico"><Icone id={iconeDe(n)} /></span>
        <span className="serv__txt">
          <strong>{fraseAmigavel(l.texto)}</strong>
          <small>{eExterno(l.url) ? "Abre em outro sistema" : "Ver orientações"}</small>
        </span>
        <Icone id="arrow" className="serv__seta" />
      </a>
    </li>
  );
}

/** Todos os grupos abertos, em seções. A barra leva até cada seção e a busca filtra na hora. */
export function GruposServicos({ grupos }: { grupos: { id: string; titulo: string; itens: ItemLink[] }[] }) {
  return (
    <div className="grupos" data-grupos>
      <div className="grupos__busca" hidden data-grupos-busca>
        <label className="sr-only" htmlFor="busca-serv">Buscar serviço</label>
        <Icone id="search" />
        <input id="busca-serv" type="search" placeholder="O que você precisa? Ex.: certidão, nota fiscal, IPTU" autoComplete="off" />
      </div>
      <p className="grupos__vazio" role="status" hidden data-grupos-vazio />
      <Abas
        rotulo="Ir para o grupo de serviços"
        ancoras
        separador={false}
        itens={grupos.map((g, i) => ({ href: `#${g.id}`, texto: fraseAmigavel(g.titulo), total: g.itens.length, ativo: i === 0 }))}
      />
      {grupos.map((g) => (
        <section key={g.id} id={g.id} className="grupo" aria-labelledby={`t-${g.id}`}>
          <Separador />
          <h2 id={`t-${g.id}`} className="grupo__titulo">{fraseAmigavel(g.titulo)} <span>{g.itens.length}</span></h2>
          <ul className="serv-lista">{g.itens.map((l) => <Servico key={`${l.url}-${l.texto}`} l={l} />)}</ul>
        </section>
      ))}
    </div>
  );
}
