# Guia de deploy: Portal PROGER (Procuradoria-Geral do Município)

Publicado em **https://jorgebatista.com/procuradoria** desde 06/10/2026 (primeira instalação pela etapa 5A).
Pasta no servidor: `~/domains/jorgebatista.com/public_html/procuradoria`

Código-fonte: `C:\site-procuradoria` (repositório `https://github.com/alphacoreiot/site-procuradoria`; veja o `README.md`).
Este arquivo é lido por **você** e pelo **agente de IA** que for executar os passos.

---

## Instruções para o agente

Siga as etapas na ordem. Pare e peça ação humana sempre que aparecer 🧑 **AÇÃO HUMANA**.

**Regras que não podem ser quebradas:**

1. **Só mexa em `~/domains/jorgebatista.com/public_html/procuradoria` e em `~/backups/`.** O servidor hospeda outros sites e sistemas (`junta`, `fiscais`, `fm`, `curso`, `senai`, `arembepe`, `melissa` em `jedb.com.br`...). **Nunca** leia, altere ou envie nada para eles.
2. **O site é estático** (HTML, CSS, JS e imagens). Não há banco nem dados de usuário no servidor, então a pasta pode ser trocada inteira, sempre com backup antes.
3. **Envie somente o conteúdo de `public/` mais `deploy/hostinger/.htaccess`.** **Nunca** envie `.git/`, `docker/`, `Dockerfile`, `README.md`, guias, PDFs, `.pptx` nem arquivos `.zip`.
4. **Sempre faça backup (etapa 4) antes de substituir a pasta.**
5. **Antes de enviar, mostre a lista de arquivos e peça confirmação.**
6. Se algo sair do esperado, **pare e explique**. Não improvise no servidor.

Os comandos remotos usam aspas **simples**: assim o `$(date)` roda no servidor, e não no Windows.

> ⚠️ **Rede:** a rede interna da Prefeitura bloqueia as portas 21, 22 e 65002, e o SSH não sai dela. Rode as etapas a partir de outra rede (por exemplo, o roteador do celular) ou use a **etapa 5B**, pelo painel da Hostinger.

---

## 1. Como o site fica no servidor

```
public_html/procuradoria/
  .htaccess            cabeçalhos de segurança, cache, 404 -> index.html (vem de deploy/hostinger/)
  index.html           página do portal
  design-system.html   referência visual
  assets/
    css/  js/  logos/  img/carrossel/  vendor/leaflet/
```

| Item | Valor |
|---|---|
| Hospedagem | Hostinger, `212.1.209.49`, porta SSH `65002`, usuário `u817008098` |
| Atalho SSH | `jedb` em `~/.ssh/config` (chave `~/.ssh/id_ed25519`) |
| Servidor web | Apache/LiteSpeed (usa o `.htaccess`; o `docker/nginx.conf` vale só para o container da PRODEB) |
| Links, WhatsApp, endereço | `assets/js/config.js` (editável sem mexer no HTML) |

---

## 2. Teste de conexão

```
ssh -o BatchMode=yes -o ConnectTimeout=15 jedb 'echo CONECTADO; ls -d ~/domains/jorgebatista.com/public_html/procuradoria 2>/dev/null || echo "pasta ainda nao existe"'
```

Esperado: `CONECTADO`. Se der `Connection timed out`, veja o aviso de **Rede** acima.

---

## 3. Gerar o pacote (na máquina local, Git Bash, em `C:\site-procuradoria`)

```
rm -rf dist/procuradoria && mkdir -p dist/procuradoria
cp -r public/. dist/procuradoria/ && rm -f dist/procuradoria/*.zip
cp deploy/hostinger/.htaccess dist/procuradoria/
find dist/procuradoria -type f | sort      # lista para conferência
```

🧑 **AÇÃO HUMANA:** conferir a lista de arquivos.

---

## 4. Backup no servidor

```
ssh jedb 'D=~/domains/jorgebatista.com/public_html/procuradoria; mkdir -p ~/backups; if [ -d "$D" ]; then cp -a "$D" ~/backups/procuradoria-$(date +%Y%m%d-%H%M) && ls -d ~/backups/procuradoria-*; else echo "primeira instalacao: nada para copiar"; fi'
```

Anote o nome da pasta criada.

---

## 5A. Publicar por SSH (recomendado)

Envia para uma pasta temporária e troca de uma vez, para ninguém pegar o site pela metade:

```
tar -C dist/procuradoria -cf - . | ssh jedb 'P=~/domains/jorgebatista.com/public_html; rm -rf "$P/procuradoria.novo" && mkdir "$P/procuradoria.novo" && tar -xf - -C "$P/procuradoria.novo" && find "$P/procuradoria.novo" -type d -exec chmod 755 {} + && find "$P/procuradoria.novo" -type f -exec chmod 644 {} + && rm -rf "$P/procuradoria" && mv "$P/procuradoria.novo" "$P/procuradoria" && echo PUBLICADO'
```

Só rode depois da etapa 4. O `rm -rf` atinge **apenas** `procuradoria` e `procuradoria.novo`.

## 5B. Publicar pelo painel da Hostinger (sem SSH)

1. Na máquina local: `dist/procuradoria.zip` (gerado com o conteúdo da etapa 3, incluindo o `.htaccess`).
2. 🧑 **AÇÃO HUMANA:** hPanel → **Arquivos → Gerenciador de arquivos** → `public_html/` → criar a pasta `procuradoria` (se não existir).
3. Dentro de `procuradoria/`, **Enviar** o `procuradoria.zip` → botão direito → **Extrair** → apagar o `.zip`.
4. Conferir se o `.htaccess` está na raiz de `procuradoria/` (ative "mostrar arquivos ocultos").

---

## 6. Verificar

```
U=https://jorgebatista.com/procuradoria
curl -s -o /dev/null -w "%{http_code} home\n" "$U/"                                   # 200
curl -s -o /dev/null -w "%{http_code} config.js\n" "$U/assets/js/config.js"           # 200
curl -s -o /dev/null -w "%{http_code} .htaccess\n" "$U/.htaccess"                     # 403
curl -s -o /dev/null -w "%{http_code} pagina inexistente\n" "$U/nao-existe"            # 404 (mostra a home)
curl -sI "$U/" | grep -iE "content-security-policy|x-frame-options"                   # cabeçalhos presentes
curl -s -o /dev/null -w "%{http_code} junta intacta\n" https://jorgebatista.com/junta/ # 302, como antes
```

🧑 **AÇÃO HUMANA:** abrir o site, apertar **Ctrl + F5** e conferir carrossel, mapa (seção Contato) e links.

---

> ℹ️ O domínio tem a proteção anti-robô da Hostinger ("Checking your browser..."). Navegadores automatizados recebem **403** no primeiro acesso até o desafio passar; o `curl` e as pessoas acessam normalmente. Isso não é erro do site.

## 7. Atualizar só links/contatos

Edite `public/assets/js/config.js`, depois envie só ele (com backup antes):

```
scp public/assets/js/config.js jedb:domains/jorgebatista.com/public_html/procuradoria/assets/js/
```

---

## 8. Desfazer

Volta a pasta inteira para o backup da etapa 4:

```
ssh jedb 'B=~/backups/procuradoria-AAAAMMDD-HHMM; P=~/domains/jorgebatista.com/public_html; [ -d "$B" ] && rm -rf "$P/procuradoria" && cp -a "$B" "$P/procuradoria" && echo RESTAURADO'
```

Para tirar o site do ar: 🧑 **AÇÃO HUMANA** obrigatória antes, e depois `ssh jedb 'rm -rf ~/domains/jorgebatista.com/public_html/procuradoria'` (só essa pasta).
