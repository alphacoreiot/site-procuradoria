import "server-only";
import { ZodError } from "zod";
import { AcessoNegado } from "./auth";
import { ErroMidia } from "./media-core";

export type Resultado<T = undefined> = { ok: true; dados?: T; msg?: string } | { ok: false; erro: string };

export class ErroUsuario extends Error {}

/**
 * Executa uma Server Action devolvendo erros amigáveis (sem vazar detalhes
 * internos). Erros inesperados são registrados no servidor.
 */
export async function executar<T>(fn: () => Promise<T | Resultado<T>>): Promise<Resultado<T>> {
  try {
    const r = await fn();
    if (r && typeof r === "object" && "ok" in (r as object)) return r as Resultado<T>;
    return { ok: true, dados: r as T };
  } catch (e) {
    if (e instanceof AcessoNegado || e instanceof ErroUsuario || e instanceof ErroMidia) return { ok: false, erro: e.message };
    if (e instanceof ZodError) {
      const i = e.issues[0];
      const caminho = i.path.filter((p) => typeof p === "string").join(" › ");
      return { ok: false, erro: i.message.includes(":") ? i.message : `${caminho ? caminho + ": " : ""}${i.message}` };
    }
    // redirecionamentos do Next precisam continuar subindo
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    console.error("[acao]", e);
    return { ok: false, erro: "Não foi possível concluir. Tente novamente." };
  }
}
