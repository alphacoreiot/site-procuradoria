import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Prefeitura de Camaçari", template: "%s" },
  description: "Portais dos órgãos da Prefeitura Municipal de Camaçari.",
};

export const viewport: Viewport = { themeColor: "#84329B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
