import type { NextConfig } from "next";

const PRODUCAO = process.env.NODE_ENV === "production";

const cabecalhosSeguranca = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(PRODUCAO ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // instalação de um órgão só: cada build ganha endereços novos de CSS e JS,
  // porque a hospedagem serve esses arquivos sem regra de cache
  env: { VERSAO_ATIVOS: process.env.ORGAO_PADRAO ? Date.now().toString(36) : "" },
  serverExternalPackages: ["@node-rs/argon2", "sharp"],
  experimental: {
    serverActions: {
      // uploads de documentos (máx. 40 MB) + margem do formulário
      bodySizeLimit: "41mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosSeguranca },
      // o painel nunca deve ser guardado em cache nem indexado
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
