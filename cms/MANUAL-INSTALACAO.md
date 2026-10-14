# Manual de instalação — CMS dos portais da Prefeitura de Camaçari

Este manual leva da máquina vazia até o CMS em produção, com HTTPS. Ele vale para o **CMS** (pasta `cms/`). A versão estática do site (pasta `public/`) é publicada à parte e não depende dele.

**Sumário**

1. [Visão geral](#1-visão-geral)
2. [Requisitos](#2-requisitos)
3. [Instalação para testes (SQLite)](#3-instalação-para-testes-sqlite)
4. [Primeiro acesso](#4-primeiro-acesso)
5. [Produção com PostgreSQL](#5-produção-com-postgresql)
6. [Rodar como serviço (systemd ou PM2)](#6-rodar-como-serviço)
7. [Proxy reverso com HTTPS (nginx)](#7-proxy-reverso-com-https-nginx)
8. [Backup e restauração](#8-backup-e-restauração)
9. [Atualizar para uma nova versão](#9-atualizar-para-uma-nova-versão)
10. [Manutenção de usuários pelo terminal](#10-manutenção-de-usuários-pelo-terminal)
11. [Checklist de segurança](#11-checklist-de-segurança)
12. [Solução de problemas](#12-solução-de-problemas)

---

## 1. Visão geral

| Peça | O que é |
|---|---|
| Aplicação | Next.js 15 (Node.js), porta 3000 por padrão |
| Banco de dados | SQLite para testes; **PostgreSQL em produção** |
| Arquivos enviados | Pasta `STORAGE_DIR` (uploads e cache de imagens). **Precisa de backup.** |
| Acesso público | `https://<domínio>/<órgão>`, por exemplo `/procuradoria` |
| Painel | `https://<domínio>/admin` |

```
Navegador ──HTTPS──> nginx (443) ──HTTP──> Node/Next.js (127.0.0.1:3000) ──> PostgreSQL
                                                    └──> STORAGE_DIR (uploads)
```

## 2. Requisitos

**Servidor**

- Linux x86-64 (Ubuntu 22.04/24.04, Debian 12 ou RHEL 9) ou Windows Server; os exemplos usam Linux.
- **Node.js 20 LTS ou 22 LTS** (mínimo 18.18). Confira com `node -v`.
- npm 10 ou mais novo (vem com o Node).
- **PostgreSQL 14 ou mais novo** (produção).
- nginx (ou outro proxy reverso) e um certificado HTTPS.
- 2 GB de RAM e 5 GB de disco livres, mais o espaço das imagens.

**Rede**

| Saída | Para quê |
|---|---|
| `registry.npmjs.org`, `binaries.prisma.sh`, `github.com` | só durante a instalação (pacotes e motores do Prisma) |
| Nenhuma | em funcionamento, o servidor não precisa acessar a internet |

Os **navegadores dos visitantes** buscam fontes em `fonts.googleapis.com`/`fonts.gstatic.com` e o mapa em `tile.openstreetmap.org`.

Instalar o Node.js 22 no Ubuntu/Debian:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v && npm -v
```

## 3. Instalação para testes (SQLite)

Use esta seção para conhecer o sistema ou testar uma alteração. Para produção, vá para a [seção 5](#5-produção-com-postgresql).

```bash
git clone https://github.com/alphacoreiot/site-procuradoria.git
cd site-procuradoria/cms
npm install
```

> **npm 11 ou mais novo:** se aparecer *"install scripts not yet covered by allowScripts"*, aprove os pacotes conhecidos e reconstrua:
> ```bash
> npm install-scripts approve prisma @prisma/client @prisma/engines esbuild unrs-resolver
> npm rebuild
> ```

Crie o arquivo de configuração:

```bash
cp .env.example .env
```

Edite o `.env`:

| Variável | O que colocar |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) |
| `STORAGE_DIR` | `./storage` |
| `SEED_ADMIN_EMAIL` | e-mail do primeiro administrador da Prefeitura |
| `SEED_ADMIN_PASSWORD` | senha forte: 12+ caracteres, com 3 destes: minúsculas, maiúsculas, números e símbolos |

Para gerar uma senha forte: `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`.

Crie o banco e carregue o conteúdo:

```bash
npx prisma db push      # cria prisma/dev.db com as tabelas
npm run seed            # cria a Procuradoria completa e o usuário da Prefeitura
npm run dev             # http://localhost:3000
```

O `seed` importa as imagens da pasta `../public/assets` (versão estática). Por isso, rode-o a partir do repositório completo. Ele pode ser executado de novo sem duplicar nada.

## 4. Primeiro acesso

1. Abra `http://localhost:3000/procuradoria` para conferir o site.
2. Abra `http://localhost:3000/admin` e entre com `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
3. Vá em **Minha conta** e troque a senha.
4. Em **Procuradoria › Usuários**, crie as contas da equipe (*Editor(a)* ou *Administrador(a)*).
5. **Apague `SEED_ADMIN_PASSWORD` do `.env`.** Ela só é usada pelo seed.

Para criar outra secretaria, use **Início › Novo órgão / secretaria** (só a conta da Prefeitura vê esse botão). O site nasce **fora do ar**. Depois de preenchido, coloque no ar em **Configurações › Site no ar**.

## 5. Produção com PostgreSQL

### 5.1 Usuário do sistema e pastas

```bash
sudo useradd --system --create-home --home-dir /opt/portais --shell /usr/sbin/nologin portais
sudo mkdir -p /var/lib/portais/storage
sudo chown -R portais:portais /var/lib/portais
```

### 5.2 Banco de dados

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE portais LOGIN PASSWORD 'TROQUE-POR-UMA-SENHA-FORTE';
CREATE DATABASE portais OWNER portais ENCODING 'UTF8';
SQL
```

### 5.3 Código

```bash
sudo -u portais git clone https://github.com/alphacoreiot/site-procuradoria.git /opt/portais/app
cd /opt/portais/app/cms
```

Troque o banco no arquivo **`prisma/schema.prisma`**:

```prisma
datasource db {
  provider = "postgresql"   // era "sqlite"
  url      = env("DATABASE_URL")
}
```

Crie o **`/opt/portais/app/cms/.env`**. Ele não vai para o Git; dê permissão só ao dono:

```bash
DATABASE_URL="postgresql://portais:TROQUE-POR-UMA-SENHA-FORTE@127.0.0.1:5432/portais?schema=public"
STORAGE_DIR="/var/lib/portais/storage"
SEED_ADMIN_EMAIL="admin@camacari.ba.gov.br"
SEED_ADMIN_PASSWORD="senha-forte-so-para-o-primeiro-seed"
```

```bash
sudo chown portais:portais .env && sudo chmod 600 .env
```

### 5.4 Instalar, criar tabelas, carregar conteúdo e compilar

```bash
sudo -u portais npm ci
sudo -u portais npx prisma migrate dev --name inicial   # primeira vez: gera prisma/migrations e cria as tabelas
sudo -u portais npm run seed
sudo -u portais npm run build
```

- Faça o commit da pasta `prisma/migrations` gerada. Nas próximas instalações, use `npx prisma migrate deploy`, que só aplica as migrações, sem gerar nada.
- Depois do seed, **apague `SEED_ADMIN_PASSWORD` do `.env`**.

Teste rapidamente:

```bash
sudo -u portais NODE_ENV=production npx next start -p 3000 -H 127.0.0.1
# em outro terminal:
curl -I http://127.0.0.1:3000/procuradoria    # deve responder 200
```

> Em produção o login **só funciona por HTTPS**, porque o cookie de sessão é `Secure` e usa o prefixo `__Host-`. Testar o painel por `http://IP:3000` não funciona: configure antes o proxy da [seção 7](#7-proxy-reverso-com-https-nginx).

## 6. Rodar como serviço

### Opção A — systemd (recomendada)

Crie **`/etc/systemd/system/portais.service`**:

```ini
[Unit]
Description=CMS dos portais da Prefeitura de Camaçari
After=network.target postgresql.service

[Service]
Type=simple
User=portais
Group=portais
WorkingDirectory=/opt/portais/app/cms
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npx next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
# endurecimento
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/portais /opt/portais/app/cms

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now portais
sudo systemctl status portais
journalctl -u portais -f      # logs
```

### Opção B — PM2

```bash
sudo npm install -g pm2
cd /opt/portais/app/cms
sudo -u portais pm2 start "npx next start -p 3000 -H 127.0.0.1" --name portais
sudo -u portais pm2 save
pm2 startup                   # siga a instrução impressa para iniciar no boot
```

## 7. Proxy reverso com HTTPS (nginx)

Crie **`/etc/nginx/sites-available/portais`**, trocando `portais.exemplo.gov.br` pelo domínio:

```nginx
server {
    listen 80;
    server_name portais.exemplo.gov.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portais.exemplo.gov.br;

    ssl_certificate     /etc/letsencrypt/live/portais.exemplo.gov.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portais.exemplo.gov.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # uploads de imagem (máx. 5 MB) + margem
    client_max_body_size 8m;
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $remote_addr;   # IP real para a auditoria e o limite de tentativas
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/portais /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# certificado gratuito (se o domínio for público):
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d portais.exemplo.gov.br
```

- **`X-Forwarded-For $remote_addr`** substitui o valor enviado pelo navegador, que poderia ser forjado. Se houver outro proxy ou CDN na frente do nginx, ajuste para o IP que ele repassa.
- Cabeçalhos de segurança (CSP com nonce, HSTS, X-Frame-Options etc.) já são enviados pela aplicação. Não é preciso repeti-los no nginx.

## 8. Backup e restauração

**O que guardar:** o banco **e** a pasta `STORAGE_DIR`. Um sem o outro deixa imagens sem registro ou registros sem imagem.

```bash
# /etc/cron.daily/portais-backup  (chmod +x)
#!/bin/sh
set -e
D=/var/backups/portais/$(date +%Y%m%d)
mkdir -p "$D"
sudo -u postgres pg_dump -Fc portais > "$D/portais.dump"
tar -czf "$D/storage.tar.gz" -C /var/lib/portais storage/uploads
find /var/backups/portais -maxdepth 1 -mtime +30 -exec rm -rf {} +
```

> A pasta `storage/cache` pode ficar de fora do backup: são variações das imagens, refeitas automaticamente.

**Restaurar:**

```bash
sudo systemctl stop portais
sudo -u postgres pg_restore --clean --if-exists -d portais /var/backups/portais/AAAAMMDD/portais.dump
sudo tar -xzf /var/backups/portais/AAAAMMDD/storage.tar.gz -C /var/lib/portais
sudo chown -R portais:portais /var/lib/portais
sudo systemctl start portais
```

**SQLite (testes):** basta copiar `prisma/dev.db` e a pasta `storage/` com o serviço parado.

## 9. Atualizar para uma nova versão

```bash
cd /opt/portais/app/cms
# 1) backup (seção 8)
sudo -u portais git pull
sudo -u portais npm ci
sudo -u portais npx prisma migrate deploy   # aplica mudanças de banco, se houver
sudo -u portais npm run build
sudo systemctl restart portais
```

Confira `https://<domínio>/procuradoria` e o painel. Para voltar atrás: `git checkout <versão-anterior>`, repita os comandos acima e, se o banco mudou, restaure o backup.

## 10. Manutenção de usuários pelo terminal

Útil quando ninguém consegue entrar no painel. Rode dentro de `cms/`, com o `.env` apontando para o banco certo:

| Comando | O que faz |
|---|---|
| `npm run admin -- listar` | lista usuários, papéis, órgãos e situação (ativo, bloqueado, desativado) |
| `npm run admin -- desbloquear <email>` | libera uma conta bloqueada por tentativas erradas |
| `npm run admin -- redefinir-senha <email>` | pede a nova senha no terminal e encerra as sessões da pessoa |
| `npm run admin -- criar-superadmin <email> "<nome>"` | cria outra conta da administração da Prefeitura |
| `npm run admin -- desativar <email>` | bloqueia o acesso e derruba as sessões |

A senha é digitada no terminal e não fica no histórico do shell. Em produção, rode como o usuário do serviço, por exemplo `sudo -u portais npm run admin -- listar`.

## 11. Checklist de segurança

- [ ] Acesso **só por HTTPS**, com o redirecionamento da porta 80 ativo.
- [ ] A porta 3000 ouve só em `127.0.0.1`; o firewall libera apenas 80/443 (e SSH para a equipe).
- [ ] `.env` com permissão `600` e dono `portais`; **`SEED_ADMIN_PASSWORD` removida** depois do seed.
- [ ] Senha do usuário inicial trocada no primeiro acesso.
- [ ] Senha do PostgreSQL forte; o banco não aceita conexões de fora (`listen_addresses = 'localhost'`).
- [ ] Backup diário do banco e de `STORAGE_DIR` testado com uma restauração.
- [ ] Sistema e Node.js com atualizações de segurança em dia; `npm audit --omit=dev` sem alertas.
- [ ] Contas de quem saiu da equipe desativadas (painel › Usuários ou `npm run admin -- desativar`).
- [ ] Auditoria (painel › Auditoria) revisada periodicamente.

## 12. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Login não entra e volta para a tela de login, sem erro | Acesso por `http://` em produção: o cookie `Secure`/`__Host-` é descartado | Acesse por HTTPS (seção 7). Para testar sem HTTPS, use `npm run dev` |
| "Conta bloqueada temporariamente" | 5 senhas erradas seguidas | Aguarde 15 min ou `npm run admin -- desbloquear <email>` |
| "Muitas tentativas. Aguarde alguns minutos." | Limite de 20 tentativas por IP em 15 min. Também acontece quando o proxy não repassa o IP real e todos parecem vir do mesmo IP | Confira o `X-Forwarded-For` do nginx (seção 7) |
| `npm install` avisa sobre *install scripts* | npm 11+ bloqueia scripts de instalação | Aprove os pacotes (seção 3) e rode `npm rebuild` |
| Erro do Prisma: *"Query engine library … not found"* | Motores do Prisma não baixados (script bloqueado ou sem internet) | Aprove os scripts, rode `npm rebuild` com acesso a `binaries.prisma.sh` |
| Erro ao carregar `sharp` ou `@node-rs/argon2` | Pacotes nativos instalados em outro sistema operacional | Não copie `node_modules` entre máquinas: rode `npm ci` no próprio servidor |
| Imagens não aparecem (404 em `/media/...`) | `STORAGE_DIR` errado ou sem permissão de escrita | Confira o caminho no `.env` e `chown -R portais:portais` na pasta |
| Upload falha com "no máximo 5 MB" ou erro 413 | Imagem grande ou limite do nginx | Reduza a imagem; confira `client_max_body_size 8m` |
| Mapa ou fontes não carregam | Rede dos visitantes bloqueia OpenStreetMap ou Google Fonts | Libere `tile.openstreetmap.org`, `fonts.googleapis.com` e `fonts.gstatic.com` |
| Página de um órgão dá 404 | Órgão fora do ar ou endereço errado | Painel › Configurações › "Site no ar" (só a conta da Prefeitura altera) |
| Alteração salva não aparece no site | Cache do navegador ou de CDN | Ctrl+F5; se houver CDN na frente, limpe o cache dela |
| `EADDRINUSE: address already in use :::3000` | Outro processo usa a porta | Use outra porta (`-p 3001`) ou pare o processo (`sudo ss -ltnp \| grep 3000`) |

Logs da aplicação: `journalctl -u portais -f` (systemd) ou `pm2 logs portais` (PM2).
