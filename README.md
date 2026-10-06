# Portal PROGER — Procuradoria-Geral do Município de Camaçari

MVP do portal institucional da Procuradoria. É um site estático servido por nginx em container. Cores, tipografia e marca seguem o **Brandbook Camaçari 2025**; a estrutura de interface foi inspirada no portal da SEFAZ Camaçari.

## Estrutura

```
public/                    site (raiz servida pelo nginx)
  index.html               página do portal
  design-system.html       referência visual de cores, tipografia e componentes
  assets/css/design-system.css   tokens e componentes base
  assets/css/portal.css          estilos do portal
  assets/js/config.js      links, WhatsApp e contatos (edite aqui)
  assets/js/main.js        menu, animações, links de WhatsApp
  assets/logos/            logos e brasão da Prefeitura
docker/nginx.conf          configuração do nginx (porta 8080, headers de segurança)
Dockerfile                 imagem nginx sem root
docker-compose.yml         execução local ou em servidor
```

## Configurar links e contatos

Edite `public/assets/js/config.js`: URLs do SPG-C, do SGPM-C e do SCP-C, número do WhatsApp (só dígitos, com 55 e DDD), telefone, e-mail e endereço. Os links que ficarem em branco mostram o aviso "disponível em breve".

Em produção, dá para trocar esses valores sem gerar outra imagem. Basta montar um arquivo por cima, como no exemplo comentado do `docker-compose.yml`:

```yaml
volumes:
  - ./config/config.prod.js:/usr/share/nginx/html/assets/js/config.js:ro
```

## Rodar

```bash
docker compose up -d --build
# http://localhost:8080
```

Use `PORTAL_PORT=80 docker compose up -d` para outra porta no host. O health check fica em `/healthz`.

Sem Docker (só para ver o site):

```bash
cd public && python -m http.server 8080
```

## Publicar na PRODEB

- A imagem roda sem root na porta **8080**, com sistema de arquivos somente leitura. Ela é compatível com Kubernetes e OpenShift.
- HTTPS e domínio ficam no balanceador/proxy da PRODEB.
- Para gerar a imagem e enviar ao registry indicado por eles:
  ```bash
  docker build -t <registry>/proger-portal:1.0.0 .
  docker push <registry>/proger-portal:1.0.0
  ```

## Google Workspace

Para verificar o domínio pelo método de **meta tag HTML**, cole o código do Google na tag `google-site-verification` (comentada no `<head>` do `public/index.html`) e publique. Se a verificação for por **registro TXT no DNS**, o site não precisa de alteração.

## Pendências de conteúdo

- Texto institucional da seção "A Procuradoria" (está marcado como provisório).
- Descrição dos serviços e do SPG-C.
- `assets/logos/assinatura-proger.png` foi montada a partir do brandbook (padrão da p. 17: Montserrat Regular + Black, espaçamento x1). Validar com a Diretoria de Comunicação ou trocar pelo arquivo oficial quando houver.
