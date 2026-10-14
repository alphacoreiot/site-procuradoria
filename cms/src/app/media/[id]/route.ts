import { variacao } from "@/lib/media";
import { PROPORCOES, type Proporcao } from "@/lib/media-shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const largura = Number(url.searchParams.get("w") || 1280);
  const ar = (url.searchParams.get("ar") || "livre") as Proporcao;
  if (!(ar in PROPORCOES)) return new Response("Proporção inválida", { status: 400 });

  const buf = await variacao(id, largura, ar);
  if (!buf) return new Response("Não encontrada", { status: 404 });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
