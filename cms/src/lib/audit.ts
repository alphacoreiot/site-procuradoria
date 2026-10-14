import "server-only";
import { db } from "./db";
import { ipCliente } from "./request";

type Registro = {
  acao: string;
  orgaoId?: string | null;
  usuarioId?: string | null;
  email?: string;
  entidade?: string;
  entidadeId?: string;
  detalhes?: unknown;
};

/** Registra uma ação na auditoria. Nunca grava senhas ou tokens. */
export async function auditar(r: Registro): Promise<void> {
  let detalhes = "{}";
  try {
    detalhes = JSON.stringify(r.detalhes ?? {}).slice(0, 100_000);
  } catch {
    /* ignora detalhes não serializáveis */
  }
  await db.auditoria.create({
    data: {
      acao: r.acao,
      orgaoId: r.orgaoId ?? null,
      usuarioId: r.usuarioId ?? null,
      email: r.email ?? "",
      entidade: r.entidade ?? "",
      entidadeId: r.entidadeId ?? "",
      detalhes,
      ip: await ipCliente(),
    },
  });
}
