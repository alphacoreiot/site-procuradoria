/* eslint-disable @typescript-eslint/no-explicit-any */
// Renderização pública de cada componente. A marcação e as classes são as
// mesmas da versão estática, para o visual e as animações serem idênticos.
import type { ReactNode } from "react";
import { Icone, Img, Linhas, propsLink, type MapaMidias } from "@/components/site/ui";
import { urlMidia } from "@/lib/media-shared";
import { CardNoticia, type NoticiaResumo } from "@/components/site/noticias";

export type Ctx = {
  orgaoSlug: string;
  midias: MapaMidias;
  noticias: NoticiaResumo[];
};
type D = Record<string, any>;

const ancora = (ctx: Ctx, url: string) => (url.startsWith("#") ? `/${ctx.orgaoSlug}${url}` : url);

function CabecalhoSecao({ d, clara = false }: { d: D; clara?: boolean }) {
  return (
    <header className={`section__head section__head--wide reveal${clara ? " section__head--light" : ""}`}>
      {d.sobretitulo && <h6>{d.sobretitulo}</h6>}
      <h2>{d.titulo}</h2>
      {d.texto && <p><Linhas texto={d.texto} /></p>}
    </header>
  );
}

const Slants = () => (
  <div className="slants" aria-hidden="true"><span className="s-vermelho" /><span className="s-verde" /><span className="s-laranja" /><span className="s-roxo" /></div>
);

// ---------------------------------------------------------------- cabeçalho
export function Cabecalho({ d, ctx, nomeOrgao }: { d: D; ctx: Ctx; nomeOrgao: string }) {
  return (
    <>
      {d.mostrarFonte && (
        <div className="topbar">
          <div className="container topbar__inner">
            <ul className="topbar__links">
              <li><button className="topbar__btn" type="button" data-font="up" aria-label="Aumentar fonte">A+</button></li>
              <li><button className="topbar__btn" type="button" data-font="down" aria-label="Diminuir fonte">A−</button></li>
            </ul>
          </div>
        </div>
      )}
      <header className="site-header" id="topo">
        <div className="container site-header__inner">
          <a className="brand" href={`/${ctx.orgaoSlug}`} aria-label={`${nomeOrgao}, página inicial`}>
            {d.logo?.id && ctx.midias[d.logo.id]
              ? <Img valor={d.logo} midias={ctx.midias} proporcao="livre" larguras={[480, 800, 1280]} sizes="320px" className="brand__sign" altPadrao={nomeOrgao} prioridade />
              : <strong className="brand__texto">{nomeOrgao}</strong>}
          </a>
          <button className="nav-toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu">
            <span /><span /><span />
          </button>
          <nav className="site-nav" id="menu" aria-label="Principal">
            <ul>
              {(d.menu as D[]).map((m, i) => (
                <li key={i}><a {...propsLink(ancora(ctx, m.destino))}>{m.rotulo}</a></li>
              ))}
            </ul>
            {d.botaoAtendimento && (
              <a className="btn btn--pill btn--sm" data-whatsapp href="#">
                <Icone id="whatsapp" />
                {d.botaoAtendimento}
              </a>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}

// ---------------------------------------------------------------- carrossel
export function Carrossel({ d, ctx }: { d: D; ctx: Ctx }) {
  const slides = d.slides as D[];
  return (
    <section className="hero">
      <h1 className="sr-only">{d.tituloAcessivel}</h1>
      <section className="carousel" aria-roledescription="carrossel" aria-label="Destaques">
        <div className="carousel__viewport">
          <div className="carousel__bg" aria-hidden="true">
            <Img valor={d.fundo} midias={ctx.midias} proporcao="16x9" larguras={[800, 1280, 1920, 2400]} decorativa prioridade />
          </div>
          <ul className="carousel__track" aria-live="off">
            {slides.map((s, i) => (
              <li key={i} className={`carousel__slide carousel__slide--${s.cor}${i === 0 ? " is-active" : ""}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}`}>
                <Img valor={s.arte} midias={ctx.midias} proporcao="6x5" larguras={[480, 800, 1280]} sizes="(max-width: 900px) 60vw, 520px" className="carousel__art" decorativa />
                <div className="carousel__caption"><strong>{s.titulo}</strong>{s.texto && <span><Linhas texto={s.texto} /></span>}</div>
              </li>
            ))}
          </ul>
          <div className="carousel__wipe" aria-hidden="true">
            <span className="s-vermelho" /><span className="s-verde" /><span className="s-laranja" /><span className="s-roxo" />
          </div>
        </div>
        <div className="carousel__controls container">
          <button className="carousel__btn" type="button" data-carousel="prev" aria-label="Slide anterior"><Icone id="arrow" /></button>
          <div className="carousel__dots" role="group" aria-label="Escolher slide" />
          <button className="carousel__btn" type="button" data-carousel="pause" aria-label="Pausar carrossel"><Icone id="pause" /></button>
          <button className="carousel__btn" type="button" data-carousel="next" aria-label="Próximo slide"><Icone id="arrow" /></button>
        </div>
      </section>
      {(d.atalhos as D[]).length > 0 && (
        <div className="container">
          <nav className="hero-bar reveal" aria-label="Acesso rápido">
            {(d.atalhos as D[]).map((a, i) => (
              <a key={i} className="quick__item" {...(a.url ? propsLink(a.url) : { href: "#", "data-em-breve": "" })}>
                <span className={`quick__icon quick__icon--${a.cor}${a.iconeImagem?.id ? " quick__icon--sei" : ""}`}>
                  {a.iconeImagem?.id
                    ? <Img valor={a.iconeImagem} midias={ctx.midias} proporcao="livre" larguras={[160]} sizes="60px" decorativa />
                    : <Icone id={a.icone} />}
                </span>
                <span><strong>{a.titulo}</strong>{a.descricao && <small>{a.descricao}</small>}</span>
              </a>
            ))}
          </nav>
        </div>
      )}
      <div className="brand-stripe" aria-hidden="true" />
    </section>
  );
}

// ---------------------------------------------------------------- institucional
export function Institucional({ d, id }: { d: D; id: string }) {
  const p = d.perfil as D, o = d.organograma as D, e = d.estrutura as D, t = d.tecnologia as D;
  const pilares: { cor: string; titulo: string; attrs: Record<string, string> }[] = [];
  if (p.ativo) pilares.push({
    cor: "vermelho", titulo: p.titulo,
    attrs: { "data-role": p.nome || "", "data-photo": p.foto?.id ? urlMidia(p.foto.id, 800, "1x1") : "", "data-photo-alt": p.foto?.alt || p.nome || "", "data-bio": p.biografia || "" },
  });
  if (o.ativo) pilares.push({ cor: "verde", titulo: o.titulo, attrs: { "data-role": "", "data-org": "" } });
  if (e.ativo) pilares.push({ cor: "laranja", titulo: e.titulo, attrs: { "data-panel": "estrutura" } });
  if (t.ativo) pilares.push({
    cor: "roxo", titulo: t.titulo,
    attrs: {
      "data-role": "", "data-tech": "",
      "data-bio": [t.abertura, ...(t.itens as D[]).map((x) => x.texto)].join(" "),
      "data-tech-lead": t.abertura || "",
      "data-tech-items": JSON.stringify((t.itens as D[]).map((x) => ({ rotulo: x.rotulo, texto: x.texto, icone: x.icone }))),
    },
  });

  // dados do organograma no formato do organograma.js
  const ass = o.assessorias as D[];
  const pares: D[][] = [];
  for (let i = 0; i < ass.length; i += 2) pares.push(ass.slice(i, i + 2));
  const org = {
    chief: o.chefe,
    staff: pares.map((par) => par.map((a) => ({ name: a.nome, c: a.cor, children: (a.subitens as D[]).map((s) => s.nome).filter(Boolean) }))),
    sub: o.sub, group: o.grupo,
    units: (o.unidades as D[]).map((u) => ({ s: u.sigla, n: u.nome, c: u.cor })),
    cda: { s: o.avulsa.sigla, n: o.avulsa.nome, c: o.avulsa.cor },
    image: o.imagem?.id ? urlMidia(o.imagem.id, 2400, "livre") : "",
  };

  return (
    <section className="section" id={id}>
      <div className="container about">
        <div className="about__copy reveal">
          {d.sobretitulo && <h6>{d.sobretitulo}</h6>}
          <h2>{d.titulo}</h2>
          <dl className="mvv">
            {d.missao && <div className="mvv__item mvv__item--missao"><dt>Missão</dt><dd>{d.missao}</dd></div>}
            {d.visao && <div className="mvv__item mvv__item--visao"><dt>Visão</dt><dd>{d.visao}</dd></div>}
            {(d.valores as D[]).length > 0 && (
              <div className="mvv__item mvv__item--valores"><dt>Valores</dt><dd>
                <ul className="mvv__values">{(d.valores as D[]).map((v, i) => <li key={i}>{v.texto}</li>)}</ul>
              </dd></div>
            )}
          </dl>
        </div>
        {pilares.length > 0 && (
          <ul className="pillars reveal">
            {pilares.map((pl, i) => (
              <li key={i}>
                <button type="button" className="pillar" style={{ ["--pillar" as string]: `var(--brand-${pl.cor})` }} aria-haspopup="dialog" aria-controls="pillar-dialog" {...pl.attrs}>
                  <span className={`pillar__n c-${pl.cor}`}>{String(i + 1).padStart(2, "0")}</span>
                  <strong>{pl.titulo}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="pillar-layer" id="pillar-layer" hidden>
        <button type="button" className="pillar-layer__backdrop" data-pillar-close aria-label="Fechar" />
        <div className="pillar-dialog" id="pillar-dialog" role="dialog" aria-modal="true" aria-labelledby="pillar-dialog-title">
          <button type="button" className="pillar-dialog__close" data-pillar-close aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <p className="pillar-dialog__n" id="pillar-dialog-n" />
          <h3 id="pillar-dialog-title" />
          <p className="pillar-dialog__role" hidden />
          <a className="pillar-dialog__media" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pillar-dialog__photo" alt="" width={240} height={240} hidden />
          </a>
          <p className="pillar-dialog__hint" hidden>Clique na imagem para ver em tamanho real.</p>
          <div className="org" id="organograma" role="group" aria-label="Organograma" hidden />
          <p className="pillar-dialog__bio" hidden />
          <p className="pillar-dialog__contact" hidden />
          {e.ativo && (
            <div className="acc" id="estrutura" data-pillar-panel hidden>
              {(e.setores as D[]).map((s, i) => (
                <details className="acc__item" key={i}>
                  <summary className="acc__head">
                    <span className="acc__icon"><Icone id="id" /></span>
                    <span className="acc__title">{s.titulo}</span>
                    <span className="acc__chev"><Icone id="chevron" /></span>
                  </summary>
                  <div className="acc__body">
                    {(s.cartoes as D[]).map((c, j) => (
                      <div className="acc__card" key={j}>
                        <p className="acc__role"><Icone id="id" />{c.cargo}</p>
                        {(c.nomes as D[]).map((n, k) => <p className="acc__name" key={k}>{n.nome}</p>)}
                        {c.telefone && <p className="acc__line"><Icone id="phone" /><a href={`tel:+55${c.telefone.replace(/\D/g, "")}`}>{c.telefone}</a></p>}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
          <p className="pillar-dialog__text" />
        </div>
      </div>
      {o.ativo && <script type="application/json" id="pgm-org" dangerouslySetInnerHTML={{ __html: jsonSeguro(org) }} />}
    </section>
  );
}

/** JSON para <script type="application/json">: escapa "<" e separadores de linha para não fechar a tag. */
const LS = new RegExp(String.fromCharCode(0x2028), "g");
const PS = new RegExp(String.fromCharCode(0x2029), "g");
export function jsonSeguro(v: unknown) {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(LS, "\\u2028").replace(PS, "\\u2029");
}

// ---------------------------------------------------------------- sistemas
export function Sistemas({ d, id }: { d: D; id: string }) {
  return (
    <section className="section section--dark" id={id}>
      <Slants />
      <div className="container">
        <CabecalhoSecao d={d} clara />
        <div className="systems">
          {(d.itens as D[]).map((s, i) => (
            <a key={i} className="system reveal" {...(s.url ? propsLink(s.url) : { href: "#", "data-em-breve": "" })}>
              {s.etiqueta && <span className={`system__tag${s.corEtiqueta !== "verde" ? ` system__tag--${s.corEtiqueta}` : ""}`}>{s.etiqueta}</span>}
              <h3>{s.titulo}</h3>
              {s.descricao && <p>{s.descricao}</p>}
              {s.botao && <span className="system__cta">{s.botao} <Icone id="arrow" /></span>}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- serviços
export function Servicos({ d, id }: { d: D; id: string }) {
  return (
    <section className="section" id={id}>
      <div className="container">
        <CabecalhoSecao d={d} />
        <div className="services">
          {(d.itens as D[]).map((s, i) => (
            <article key={i} className="service reveal">
              <span className={`service__icon service__icon--${s.cor}`}><Icone id={s.icone} /></span>
              <h3>{s.titulo}</h3>
              {s.descricao && <p>{s.descricao}</p>}
              {s.botao && (s.acao === "whatsapp"
                ? <a className="btn btn--ghost" data-whatsapp data-msg={s.mensagem || undefined} href="#">{s.botao} →</a>
                : <a className="btn btn--ghost" {...propsLink(s.url)}>{s.botao} →</a>)}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- notícias
export function Noticias({ d, ctx, id }: { d: D; ctx: Ctx; id: string }) {
  const lista = ctx.noticias.slice(0, d.quantidade || 3);
  return (
    <section className="section section--soft" id={id}>
      <div className="container">
        <CabecalhoSecao d={d} />
        {lista.length === 0
          ? <p className="news-empty">Nenhuma notícia publicada ainda.</p>
          : <div className="news-grid">{lista.map((n) => <CardNoticia key={n.id} n={n} orgaoSlug={ctx.orgaoSlug} midias={ctx.midias} />)}</div>}
        {d.botaoTodas && lista.length > 0 && (
          <p className="news-more"><a className="btn btn--pill" href={`/${ctx.orgaoSlug}/noticias`}>{d.botaoTodas} <Icone id="arrow" /></a></p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- contato
export function Contato({ d, id }: { d: D; id: string }) {
  const f = d.formulario as D, l = d.local as D;
  return (
    <section className="section section--soft" id={id}>
      <div className="container">
        <CabecalhoSecao d={d} />
        <div className="contact reveal">
          {f.ativo && (
            <form className="contact-form" id="contact-form">
              <div className="contact-form__row contact-form__row--nome">
                <div className="field">
                  <label htmlFor="cf-nome"><Icone id="user" />Nome completo <span className="field__req" aria-hidden="true">*</span></label>
                  <input className="field__control" id="cf-nome" name="nome" type="text" autoComplete="name" maxLength={120} required placeholder="Digite seu nome completo" />
                </div>
                <div className="field">
                  <label htmlFor="cf-cpf"><Icone id="id" />CPF <span className="field__req" aria-hidden="true">*</span></label>
                  <input className="field__control" id="cf-cpf" name="cpf" type="text" inputMode="numeric" autoComplete="off" maxLength={14} required pattern="\d{3}\.\d{3}\.\d{3}-\d{2}" title="Informe o CPF no formato 000.000.000-00" placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="contact-form__row">
                <div className="field">
                  <label htmlFor="cf-email"><Icone id="mail" />E-mail <span className="field__req" aria-hidden="true">*</span></label>
                  <input className="field__control" id="cf-email" name="email" type="email" autoComplete="email" maxLength={120} required placeholder="seu@email.com" />
                </div>
                <div className="field">
                  <label htmlFor="cf-telefone"><Icone id="phone" />Telefone <span className="field__req" aria-hidden="true">*</span></label>
                  <input className="field__control" id="cf-telefone" name="telefone" type="tel" autoComplete="tel" inputMode="numeric" maxLength={15} required pattern="\(\d{2}\) \d{4,5}-\d{4}" title="Informe o telefone com DDD, ex.: (71) 99999-9999" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="cf-assunto"><Icone id="chat" />Assunto <span className="field__req" aria-hidden="true">*</span></label>
                <select className="field__control" id="cf-assunto" name="assunto" required defaultValue="">
                  <option value="">Selecione o assunto</option>
                  {(f.assuntos as D[]).map((a, i) => <option key={i}>{a.texto}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cf-mensagem"><Icone id="edit" />Mensagem <span className="field__req" aria-hidden="true">*</span></label>
                <textarea className="field__control" id="cf-mensagem" name="mensagem" rows={6} maxLength={2000} required aria-describedby="cf-contador" placeholder="Descreva em detalhes sua dúvida, sugestão ou solicitação..." />
                <small className="field__count" id="cf-contador">0 / 2000 caracteres</small>
              </div>
              <div className="consent">
                <label className="consent__check" htmlFor="cf-consentimento">
                  <input id="cf-consentimento" name="consentimento" type="checkbox" required />
                  <span>Li e concordo com o Aviso de Privacidade e autorizo o uso dos meus dados para o atendimento desta solicitação. <span className="field__req" aria-hidden="true">*</span></span>
                </label>
                {(f.privacidade as D[]).length > 0 && (
                  <details className="privacy">
                    <summary>Ler o Aviso de Privacidade</summary>
                    <div className="privacy__body"><ul>
                      {(f.privacidade as D[]).map((p, i) => <li key={i}><strong>{p.titulo}:</strong> {p.texto}</li>)}
                    </ul></div>
                  </details>
                )}
              </div>
              <div className="contact-form__actions">
                <button className="btn btn--pill btn--lg" type="submit"><Icone id="send" />Enviar mensagem</button>
                <p className="contact-form__note">Ao enviar, seu aplicativo de e-mail abre com a mensagem pronta. Campos com <span className="field__req">*</span> são obrigatórios.</p>
              </div>
            </form>
          )}
          <ul className="contact-info">
            {d.endereco && <InfoItem cor="roxo" icone="pin" titulo="Endereço"><p><Linhas texto={d.endereco} /></p>{l.ativo && <a className="contact-info__link" href="#localizacao">Ver no mapa →</a>}</InfoItem>}
            {d.telefone && <InfoItem cor="verde" icone="phone" titulo="Telefone"><p><a href={`tel:+55${d.telefone.replace(/\D/g, "")}`}>{d.telefone}</a></p></InfoItem>}
            {d.email && <InfoItem cor="laranja" icone="mail" titulo="E-mail"><p><a href={`mailto:${d.email}`}>{d.email}</a></p></InfoItem>}
            {d.horario && <InfoItem cor="vermelho" icone="clock" titulo="Horário de Atendimento"><p>{d.horario}</p></InfoItem>}
          </ul>
        </div>
        {l.ativo && (
          <div className="location contact__location reveal" id="localizacao">
            <div className="location__card">
              <span className="location__badge"><Icone id="pin" /></span>
              {l.sobretitulo && <p className="location__eyebrow">{l.sobretitulo}</p>}
              <h3>{l.nome}</h3>
              {l.descricao && <p className="location__desc">{l.descricao}</p>}
              <button className="btn btn--pill btn--lg location__cta" type="button" data-open-maps><Icone id="route" />Como chegar</button>
              <p className="location__hint">Abre no aplicativo de mapas do seu dispositivo.</p>
            </div>
            <div className="location__map">
              <div id="mapa" className="map" role="region" aria-label="Mapa com a localização">
                <button className="map__fallback" type="button" data-open-maps>Ver no mapa</button>
              </div>
              <p className="map__tip"><Icone id="pin" /> Clique no pin para abrir o trajeto no seu aplicativo de mapas</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoItem({ cor, icone, titulo, children }: { cor: string; icone: string; titulo: string; children: ReactNode }) {
  return (
    <li className="contact-info__item">
      <span className={`quick__icon quick__icon--${cor}`}><Icone id={icone} /></span>
      <div><h3>{titulo}</h3>{children}</div>
    </li>
  );
}

// ---------------------------------------------------------------- chamada
export function Chamada({ d }: { d: D }) {
  return (
    <section className="cta-band">
      <div className="container"><div className="cta-band__inner reveal">
        <Slants />
        <div>
          <h2>{d.titulo}</h2>
          {d.texto && <p>{d.texto}</p>}
        </div>
        <a className="btn btn--white btn--lg" data-whatsapp href="#" target="_blank" rel="noopener noreferrer"><Icone id="whatsapp" />{d.botao}</a>
      </div></div>
    </section>
  );
}

// ---------------------------------------------------------------- rodapé
export function Rodape({ d, ctx, nomeOrgao }: { d: D; ctx: Ctx; nomeOrgao: string }) {
  const ano = new Date().getFullYear();
  return (
    <footer className="site-footer" id="contato">
      <div className="brand-stripe" aria-hidden="true" />
      <div className="container">
        <div className="footer-card">
          <div className="footer-card__brand">
            <Img valor={d.logo} midias={ctx.midias} proporcao="livre" larguras={[480, 800, 1280]} sizes="360px" altPadrao={nomeOrgao} />
          </div>
          {(d.redes as D[]).length > 0 && (
            <div>
              {d.tituloRedes && <h5>{d.tituloRedes}</h5>}
              <div className="footer-social">
                {(d.redes as D[]).map((r, i) => (
                  <a key={i} className={`footer-social__${r.rede === "facebook" ? "fb" : r.rede === "instagram" ? "ig" : "yt"}`} {...propsLink(r.url)} title={r.rede} aria-label={r.rede}>
                    <Icone id={r.rede} />
                  </a>
                ))}
              </div>
            </div>
          )}
          {(d.links as D[]).length > 0 && (
            <div>
              {d.tituloLinks && <h5>{d.tituloLinks}</h5>}
              <ul className="footer-list">
                {(d.links as D[]).map((l, i) => <li key={i}><a {...propsLink(l.url)}>{l.rotulo}</a></li>)}
              </ul>
            </div>
          )}
        </div>
        {d.direitos && <p className="footer-bottom">© {ano} {d.direitos}</p>}
        {(d.creditoTexto || d.creditoLogo?.id) && (
          <div className="footer-credit">
            {d.creditoTexto && <span>{d.creditoTexto}</span>}
            <Img valor={d.creditoLogo} midias={ctx.midias} proporcao="livre" larguras={[320]} sizes="120px" altPadrao={d.creditoAlt} />
          </div>
        )}
      </div>
    </footer>
  );
}

/** Âncora usada no menu para cada tipo (mantém os links #sobre etc.). */
export const ANCORA_POR_TIPO: Record<string, string> = {
  institucional: "sobre", sistemas: "sistemas", servicos: "servicos", noticias: "noticias", contato: "fale-conosco",
};

export function BlocoPrincipal({ tipo, d, ctx, idx }: { tipo: string; d: D; ctx: Ctx; idx: number }) {
  const id = ANCORA_POR_TIPO[tipo] ? (idx === 0 ? ANCORA_POR_TIPO[tipo] : `${ANCORA_POR_TIPO[tipo]}-${idx + 1}`) : `bloco-${idx}`;
  switch (tipo) {
    case "carrossel": return <Carrossel d={d} ctx={ctx} />;
    case "institucional": return <Institucional d={d} id={id} />;
    case "sistemas": return <Sistemas d={d} id={id} />;
    case "servicos": return <Servicos d={d} id={id} />;
    case "noticias": return <Noticias d={d} ctx={ctx} id={id} />;
    case "contato": return <Contato d={d} id={id} />;
    case "chamada": return <Chamada d={d} />;
    default: return null;
  }
}
