import "server-only";
import { headers } from "next/headers";

/** IP do cliente (primeiro endereço de X-Forwarded-For quando atrás de proxy). */
export async function ipCliente(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : h.get("x-real-ip")) || "";
  return ip.trim().slice(0, 64);
}

export async function navegadorCliente(): Promise<string> {
  const h = await headers();
  return (h.get("user-agent") || "").slice(0, 200);
}
