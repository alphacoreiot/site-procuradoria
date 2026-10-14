import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel — CMS Prefeitura de Camaçari", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/admin.css" precedence="default" />
      <div className="admin">{children}</div>
    </>
  );
}
