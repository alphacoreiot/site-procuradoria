import { Icone } from "./ui";

const SUGESTOES = ["Quem é isento do IPTU?", "O que é o ITIV?", "Como emitir a 2ª via?", "Onde acho os formulários?"];

/** Assistente virtual. O comportamento fica em /assets/js/assistente.js. */
export function Assistente({ orgao, sigla }: { orgao: string; sigla: string }) {
  return (
    <div className="ast" data-assistente={orgao}>
      <button className="ast__abrir" type="button" aria-expanded="false" aria-controls="ast-painel" aria-label={`Abrir assistente virtual da ${sigla}`} data-ast-abrir>
        <Icone id="chat" />
        <span className="ast__dica" aria-hidden="true">Tire sua dúvida</span>
      </button>
      <section className="ast__painel" id="ast-painel" role="dialog" aria-label={`Assistente virtual da ${sigla}`} hidden data-ast-painel>
        <header className="ast__topo">
          <span className="ast__avatar"><Icone id="chat" /></span>
          <div>
            <strong>Assistente {sigla}</strong>
            <small><i />Versão de teste</small>
          </div>
          <button type="button" className="ast__mini" data-ast-novo>Nova conversa</button>
          <button type="button" className="ast__fechar" aria-label="Fechar assistente" data-ast-fechar>×</button>
        </header>
        <div className="ast__msgs" data-ast-msgs aria-live="polite">
          <div className="ast__msg ast__msg--bot">
            <p>Olá! Sou o assistente virtual da {sigla}. Respondo com base no <strong>Código Tributário</strong> e nos documentos oficiais, e indico onde encontrar cada informação.</p>
          </div>
          <div className="ast__sugestoes" data-ast-sugestoes>
            {SUGESTOES.map((s) => <button key={s} type="button" data-ast-sugestao={s}>{s}</button>)}
          </div>
        </div>
        <form className="ast__form" data-ast-form>
          <label className="sr-only" htmlFor="ast-campo">Sua pergunta</label>
          <textarea id="ast-campo" rows={1} maxLength={600} placeholder="Digite sua pergunta" data-ast-campo />
          <button type="submit" aria-label="Enviar pergunta" data-ast-enviar><Icone id="send" /></button>
        </form>
        <p className="ast__aviso">Respostas geradas por IA: confira sempre a fonte. Não informe CPF, senhas ou dados pessoais.</p>
      </section>
    </div>
  );
}
