import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id com parâmetros recomendados pela OWASP (19 MiB, 2 iterações).
const OPCOES = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const SENHA_MIN = 12;
export const SENHA_MAX = 128;

export function validarForcaSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (senha.length > SENHA_MAX) return `A senha pode ter no máximo ${SENHA_MAX} caracteres.`;
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (tipos < 3) return "Use pelo menos 3 destes: minúsculas, maiúsculas, números e símbolos.";
  return null;
}

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

export async function conferirSenha(hashSalvo: string, senha: string): Promise<boolean> {
  try {
    return await verify(hashSalvo, senha);
  } catch {
    return false;
  }
}

// Hash fixo usado quando o usuário não existe, para o tempo de resposta não
// revelar quais e-mails estão cadastrados.
let hashFalso: Promise<string> | null = null;
export function hashDeTempoConstante(): Promise<string> {
  hashFalso ??= hash("senha-inexistente-para-tempo-constante", OPCOES);
  return hashFalso;
}
