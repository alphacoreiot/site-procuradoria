import { NextResponse, type NextRequest } from "next/server";

const PRODUCAO = process.env.NODE_ENV === "production";
const COOKIE_SESSAO = PRODUCAO ? "__Host-cms_sessao" : "cms_sessao";

/**
 * 1) Content-Security-Policy com nonce único por requisição: só executam
 *    scripts emitidos pelo próprio servidor (e os que eles carregarem).
 * 2) Primeira barreira do painel: sem cookie de sessão, vai para o login.
 *    A verificação real (sessão válida, papel, órgão) é feita no servidor
 *    em cada página e em cada Server Action.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.cookies.get(COOKIE_SESSAO)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${PRODUCAO ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(PRODUCAO ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // tudo, menos arquivos estáticos do Next e imagens já processadas
    { source: "/((?!_next/static|_next/image|favicon.ico|assets/).*)" },
  ],
};
