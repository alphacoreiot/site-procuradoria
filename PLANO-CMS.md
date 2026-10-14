# Plano — CMS da Prefeitura de Camaçari (Next.js + Prisma)

> Documento de referência da construção. Cada etapa é marcada ao ser concluída.

## 0. Princípios

1. **A versão estática continua intacta.** `public/` (HTML + CSS + JS) segue sendo o site publicado hoje em `jorgebatista.com/procuradoria`. O CMS fica em `cms/` e não altera nada fora dessa pasta.
2. **Uma instalação, vários órgãos.** O CMS é central para a Prefeitura: cada secretaria/órgão tem o seu site (`/procuradoria`, `/sefaz`, `/saude`…), o seu conteúdo, a sua mídia e os seus usuários. A Procuradoria vem com todos os dados atuais já preenchidos.
3. **Tudo é componente editável.** Logomarca, assinatura, favicon, menu, carrossel, textos, imagens, cartões, organograma, estrutura, contatos, rodapé e créditos. Nada de texto "chumbado" no código.
4. **Limites e proporções.** Cada campo tem um **máximo de caracteres** (validado no navegador *e* no servidor) e cada imagem tem uma **proporção fixa**: o sistema recorta/ajusta automaticamente (ex.: capa de notícia 16:9, foto de perfil 1:1, logomarca sem recorte, só reduzida).
5. **Segurança em primeiro lugar** (seção 4).
6. **Banco portátil.** Prisma com **SQLite** para testes; trocar para **PostgreSQL** muda só `provider` e `DATABASE_URL` (seção 5).
7. **Mesmo visual e motion design.** Reaproveita o design system (brandbook) e as animações da versão estática.

## 1. Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), TypeScript |
| Banco / ORM | Prisma 6 — SQLite (dev) → PostgreSQL (produção) |
| Validação | Zod (mesmo esquema no formulário e no servidor) |
| Imagens | sharp (validação real do arquivo, reprocessamento, recorte proporcional, WebP) |
| Senhas | Argon2id (`@node-rs/argon2`) |
| Notícias | Markdown restrito (sem HTML) renderizado com `react-markdown` |
| Estilo | CSS do design system existente (`design-system.css`, `portal.css`) + `admin.css` |

## 2. Estrutura de pastas (`cms/`)

```
cms/
  prisma/schema.prisma        modelos (seção 3)
  prisma/seed.ts              Procuradoria completa + usuários iniciais
  src/app/
    page.tsx                  portal: lista de órgãos
    [orgao]/page.tsx          site do órgão (blocos)
    [orgao]/noticias/…        lista e detalhe de notícias
    media/[id]/route.ts       entrega de imagens (variações seguras)
    admin/login               login
    admin/(painel)/…          painel: órgão, página, blocos, notícias, mídia, usuários, auditoria
  src/blocks/                 registro de componentes: esquema (campos+limites) + render
  src/components/             componentes públicos e do admin
  src/lib/                    db, auth, sessão, permissões, mídia, auditoria, rate limit
  src/middleware.ts           CSP com nonce + proteção de /admin
  storage/                    uploads e cache de imagens (fora do público, não versionado)
```

## 3. Modelo de dados

- **Orgao** — slug, nome, sigla, ativo.
- **Configuracao** (1:1 com órgão) — dados globais: WhatsApp, SEO, favicon.
- **Pagina** — página do órgão (`inicio`), título, descrição SEO.
- **Bloco** — `tipo`, `area` (cabeçalho / principal / rodapé), `ordem`, `visivel`, `dados` (JSON validado pelo esquema do tipo).
- **Noticia** — título, slug, resumo, conteúdo (Markdown), capa, categoria, destaque, status (rascunho/publicada), datas, autor.
- **Midia** — arquivo reprocessado, dimensões, texto alternativo, ponto focal.
- **Usuario** — e-mail, nome, hash Argon2id, papel, órgão, ativo, bloqueio por tentativas.
- **Sessao** — hash do token, expiração, IP, navegador.
- **Auditoria** — quem, o quê, quando, de onde, antes/depois.
- **LimiteTaxa** — controle de tentativas (login).

Enums e JSON ficam como `String` validada pela aplicação → o mesmo schema funciona em SQLite e PostgreSQL.

## 4. Segurança

- **Senhas:** Argon2id; mínimo 12 caracteres; nunca registradas em log.
- **Sessão:** token aleatório de 256 bits; no banco só o **hash SHA-256**; cookie `HttpOnly`, `Secure` (produção), `SameSite=Lax`, prefixo `__Host-`; expira em 8 h; logout invalida no servidor.
- **Força bruta:** 5 falhas → bloqueio de 15 min por conta e limite por IP; mensagem de erro genérica.
- **Permissões (RBAC + órgão):** `SUPERADMIN` (Prefeitura, todos os órgãos), `ADMIN` (seu órgão, inclusive usuários), `EDITOR` (conteúdo e notícias do seu órgão). **Toda** ação no servidor confere sessão, papel e órgão — o middleware é só a primeira barreira.
- **CSRF:** Server Actions do Next só aceitam requisições da mesma origem; cookies `SameSite`.
- **Validação:** Zod em toda entrada (limites de caracteres, URLs só `https:`/`mailto:`/`tel:`/âncora, cores e ícones de listas fechadas).
- **XSS:** React escapa tudo; notícias em Markdown **sem HTML**; nenhum `dangerouslySetInnerHTML` com dado de usuário.
- **Uploads:** máx. 5 MB; o arquivo é aberto pelo sharp (tipo real, não a extensão); só JPEG/PNG/WebP/AVIF; **SVG proibido**; imagem reprocessada para WebP (remove metadados/EXIF); nome aleatório; guardado fora da pasta pública.
- **Entrega de imagens:** só larguras e proporções de uma lista fechada (evita abuso de processamento); cache em disco.
- **Cabeçalhos:** CSP com nonce, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Auditoria:** toda alteração registrada com usuário, IP e o conteúdo anterior.
- **Segredos:** só em `.env` (fora do Git); `.env.example` documenta.

## 5. SQLite → PostgreSQL

1. Em `prisma/schema.prisma`: `provider = "postgresql"`.
2. Em `.env`: `DATABASE_URL="postgresql://usuario:senha@host:5432/cms?schema=public"`.
3. `npx prisma migrate dev --name inicial` (gera as migrações para o PostgreSQL) e `npm run seed`.
Nenhuma linha de código da aplicação muda.

## 6. Componentes (blocos) e limites

| Bloco | Conteúdo editável (exemplos de limite) |
|---|---|
| Cabeçalho | logomarca/assinatura (sem recorte), texto alternativo (120), menu (até 6 itens, 24 caract.), botão de atendimento (20) |
| Carrossel | imagem de fundo (16:9), até 6 slides: título (40), texto (120), ilustração, cor; atalhos (até 6): nome (16), descrição (50), link, ícone/imagem |
| Institucional | sobretítulo (30), título (50), missão (400), visão (300), valores (até 12 × 40) |
| Destaques | perfil (nome 80, foto 1:1, biografia 900); organograma (estrutura completa editável); estrutura organizacional (setores, cargos, nomes, telefones); texto institucional com atribuições (DTI) |
| Sistemas | até 8: etiqueta (16), nome (20), descrição (140), link, texto do botão (20) |
| Serviços | até 8: ícone, cor, título (50), descrição (160), ação (WhatsApp ou link) |
| Notícias | sobretítulo, título, quantidade exibida (3 a 6) |
| Contato | formulário (assuntos até 10 × 50), aviso de privacidade, endereço (160), telefone, e-mail, horário (80), mapa (coordenadas, link) |
| Chamada (CTA) | título (60), texto (160), botão (24) |
| Rodapé | logomarca, redes sociais, links (até 8 × 40), direitos (120), crédito + logomarca do desenvolvedor |

Notícia: título (120), resumo (280), conteúdo (20.000), capa 16:9, categoria (40).

Proporções de imagem: `16x9`, `3x2`, `4x3`, `1x1`, `4x5`, `6x5` (recorte centrado no ponto focal) e `livre` (sem recorte, só reduzida — logomarcas).

## 7. Etapas

- [x] 1. Criar o projeto Next.js em `cms/` e instalar dependências
- [x] 2. Prisma: schema + cliente + banco SQLite
- [x] 3. Biblioteca de segurança: senhas, sessão, permissões, limite de tentativas, auditoria
- [x] 4. Middleware: CSP com nonce e proteção do painel
- [x] 5. Mídia: upload seguro, reprocessamento e entrega com recorte proporcional
- [x] 6. Registro de blocos (campos + limites → Zod) e componentes públicos (mesmo visual)
- [x] 7. Site público do órgão (`/[orgao]`) com as animações
- [x] 8. Notícias (lista, detalhe, bloco na página inicial)
- [x] 9. Painel: login, órgão, blocos (editor gerado pelos esquemas), notícias, mídia, usuários, auditoria
- [x] 10. Seed: Procuradoria completa (textos, imagens, organograma, estrutura) + usuários
- [x] 11. Testes: build, páginas públicas, login, edição, upload, limites, permissões
- [x] 12. README do CMS (instalação, PostgreSQL, produção)

## 8. Resultado dos testes (14/10/2026)

- Build de produção (lint + tipos): aprovado.
- Site público idêntico à versão estática; carrossel, organograma, perfil, estrutura, DTI e mapa funcionando sob CSP com nonce, sem violações.
- Painel: login, edição de componente refletida no site, upload (imagem real aceita, arquivo falso recusado), notícia com capa publicada, `<script>` no conteúdo não renderizado.
- Limites: o campo corta no navegador; o servidor recusa texto acima do limite, campos extras, links `javascript:`/`data:`, cores fora da lista e listas acima do máximo.
- Permissões: editor sem acesso a usuários, configurações e auditoria; usuário de um órgão recebe 404 em outro órgão; órgão novo nasce fora do ar.
- Força bruta: conta bloqueada após 5 erros, mesmo com a senha correta em seguida.
- Cookie de sessão em produção: `__Host-`, `Secure`, `HttpOnly`.

## 9. Próximos passos sugeridos

- Envio do formulário de contato pelo servidor (hoje abre o e-mail do cidadão, como na versão estática).
- Páginas internas além da inicial (o modelo `Pagina` já suporta).
- Restaurar versões anteriores a partir da auditoria (o conteúdo anterior já é guardado).
- Autenticação em dois fatores para administradores.
