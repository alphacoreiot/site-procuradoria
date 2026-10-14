# CMS dos portais da Prefeitura de Camaçari

Sistema de gestão de conteúdo (Next.js 15 + Prisma) para os sites dos órgãos e secretarias da Prefeitura. Uma instalação atende vários órgãos (`/procuradoria`, `/sefaz`…), cada um com seu conteúdo, sua mídia e seus usuários. A Procuradoria-Geral do Município já vem preenchida com todo o conteúdo do site atual.

> A versão estática (HTML/CSS/JS) continua em `../public` e não depende deste CMS.
> O planejamento está em [`../PLANO-CMS.md`](../PLANO-CMS.md).

## Rodar localmente

```bash
cd cms
npm install
cp .env.example .env          # ajuste SEED_ADMIN_PASSWORD (12+ caracteres)
npx prisma db push            # cria o banco SQLite (prisma/dev.db)
npm run seed                  # Procuradoria completa + usuário da Prefeitura
npm run dev                   # http://localhost:3000
```

- Site público: `http://localhost:3000/procuradoria`
- Notícias: `http://localhost:3000/procuradoria/noticias`
- Painel: `http://localhost:3000/admin` (e-mail e senha do `.env`)

> npm 11+: se aparecer aviso de *install scripts*, aprove os pacotes do Prisma e do esbuild: `npm install-scripts approve prisma @prisma/client @prisma/engines esbuild unrs-resolver` e rode `npm rebuild`.

## Como o conteúdo funciona

**Tudo o que aparece no site é um componente** com campos de tamanho limitado:

| Componente | O que se edita |
|---|---|
| Cabeçalho | logomarca/assinatura, menu, botão de atendimento, A+/A− |
| Carrossel | foto de fundo, slides (título, texto, ilustração, cor), atalhos |
| Institucional | missão, visão, valores; perfil (foto, biografia); organograma animado (toda a hierarquia); estrutura organizacional (setores, cargos, nomes, telefones); atribuições (ex.: DTI) |
| Sistemas · Serviços | cartões com etiqueta, nome, descrição, link/WhatsApp |
| Notícias | título da seção e quantidade exibida |
| Contato | formulário, aviso de privacidade, endereço, telefone, e-mail, horário, mapa |
| Chamada | faixa do WhatsApp |
| Rodapé | logomarca, redes, links, direitos, crédito e logomarca do desenvolvedor |
| Configurações | título do site, descrição para buscadores, favicon, WhatsApp |

- Os campos, os limites de caracteres e as proporções das imagens ficam em `src/blocks/specs.ts`. O mesmo arquivo gera o formulário do painel e a validação do servidor.
- As imagens são recortadas automaticamente na proporção de cada lugar (16:9, 1:1, 6:5…) em volta do **ponto focal**, que se define em *Mídia*. Logomarcas usam "sem recorte".
- Novo componente: defina-o em `specs.ts` e crie o visual em `src/blocks/render.tsx`.

**Papéis**

| Papel | Pode |
|---|---|
| SUPERADMIN (Prefeitura) | tudo, em todos os órgãos; criar órgãos; colocar sites no ar |
| ADMIN (do órgão) | conteúdo, componentes, configurações, usuários e auditoria do seu órgão |
| EDITOR (do órgão) | conteúdo, notícias e mídia do seu órgão |

## Segurança (resumo)

- Senhas Argon2id (mín. 12 caracteres, 3 tipos); 5 erros → bloqueio de 15 min; limite por IP.
- Sessão: token de 256 bits, só o hash no banco; cookie `__Host-` `HttpOnly` `Secure` `SameSite=Lax`; 8 h.
- Toda ação confere sessão, papel e órgão **no servidor**; Server Actions recusam outras origens (CSRF).
- Validação Zod estrita (limites, links só `https`/`mailto`/`tel`/âncora, listas fechadas de cores e ícones).
- Uploads: tipo real verificado pelo sharp, SVG proibido, regravados em WebP sem metadados, nome aleatório, fora da pasta pública; variações só de tamanhos pré-definidos.
- Notícias em Markdown **sem HTML**.
- CSP com nonce por requisição + HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy; painel `no-store` e `noindex`.
- Auditoria de todas as alterações com o conteúdo anterior.

## Trocar SQLite por PostgreSQL

1. `prisma/schema.prisma`: `provider = "postgresql"`.
2. `.env`: `DATABASE_URL="postgresql://usuario:senha@host:5432/cms?schema=public"`.
3. `npx prisma migrate dev --name inicial` (em produção: `npx prisma migrate deploy`) e `npm run seed`.

Nenhum código da aplicação muda: enums e JSON são `String` validados pela aplicação.

## Produção

```bash
npm ci
npx prisma migrate deploy      # ou db push no SQLite
npm run build
NODE_ENV=production npm start  # porta 3000
```

- Coloque atrás de HTTPS (proxy reverso). Repasse `X-Forwarded-For` para o registro de IP.
- `STORAGE_DIR` precisa ser um **volume persistente** (uploads e cache de imagens).
- Faça backup do banco e do `STORAGE_DIR`.
- Troque a senha do usuário inicial no primeiro acesso (*Minha conta*).
