import "server-only";
import { db } from "./db";

/**
 * Janela fixa de tentativas por chave (ex.: "login:ip:1.2.3.4").
 * Retorna true se a ação ainda é permitida.
 */
export async function consumirLimite(chave: string, maximo: number, janelaMs: number): Promise<boolean> {
  const agora = new Date();
  const atual = await db.limiteTaxa.findUnique({ where: { chave } });
  if (!atual || atual.reiniciaEm <= agora) {
    await db.limiteTaxa.upsert({
      where: { chave },
      create: { chave, contagem: 1, reiniciaEm: new Date(agora.getTime() + janelaMs) },
      update: { contagem: 1, reiniciaEm: new Date(agora.getTime() + janelaMs) },
    });
    return true;
  }
  if (atual.contagem >= maximo) return false;
  await db.limiteTaxa.update({ where: { chave }, data: { contagem: { increment: 1 } } });
  return true;
}

export async function limparLimite(chave: string): Promise<void> {
  await db.limiteTaxa.deleteMany({ where: { chave } });
}
