/**
 * Manutenção de usuários pelo terminal (sem abrir o banco).
 *
 *   npm run admin -- listar
 *   npm run admin -- criar-superadmin  <email> "<nome>"
 *   npm run admin -- redefinir-senha   <email>
 *   npm run admin -- desbloquear       <email>
 *   npm run admin -- desativar         <email>
 *
 * A senha é pedida no terminal (não fica no histórico do shell). Para uso em
 * automação, defina a variável ADMIN_SENHA.
 */
import { createInterface } from "node:readline/promises";
import { hash } from "@node-rs/argon2";
import { db } from "../src/lib/db";

const OPCOES = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

function validar(senha: string): string | null {
  if (senha.length < 12) return "A senha precisa ter pelo menos 12 caracteres.";
  if (senha.length > 128) return "A senha pode ter no máximo 128 caracteres.";
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (tipos < 3) return "Use pelo menos 3 destes: minúsculas, maiúsculas, números e símbolos.";
  return null;
}

async function pedirSenha(): Promise<string> {
  if (process.env.ADMIN_SENHA) return process.env.ADMIN_SENHA;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const s1 = await rl.question("Nova senha: ");
  const s2 = await rl.question("Repita a senha: ");
  rl.close();
  if (s1 !== s2) throw new Error("As senhas não conferem.");
  return s1;
}

async function usuario(email?: string) {
  if (!email) throw new Error("Informe o e-mail.");
  const u = await db.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!u) throw new Error(`Usuário ${email} não encontrado.`);
  return u;
}

async function main() {
  const [cmd, email, nome] = process.argv.slice(2);
  switch (cmd) {
    case "listar": {
      const lista = await db.usuario.findMany({ include: { orgao: true }, orderBy: { email: "asc" } });
      for (const u of lista) {
        const estado = !u.ativo ? "DESATIVADO" : u.bloqueadoAte && u.bloqueadoAte > new Date() ? "BLOQUEADO" : "ativo";
        console.log(`${u.email.padEnd(40)} ${u.papel.padEnd(10)} ${(u.orgao?.sigla ?? "Prefeitura").padEnd(12)} ${estado}`);
      }
      break;
    }
    case "criar-superadmin": {
      if (!email || !nome) throw new Error('Uso: criar-superadmin <email> "<nome>"');
      if (await db.usuario.findUnique({ where: { email: email.toLowerCase() } })) throw new Error("Esse e-mail já existe.");
      const senha = await pedirSenha();
      const erro = validar(senha); if (erro) throw new Error(erro);
      await db.usuario.create({ data: { email: email.toLowerCase(), nome, papel: "SUPERADMIN", orgaoId: null, senhaHash: await hash(senha, OPCOES) } });
      console.log(`✔ SUPERADMIN ${email} criado.`);
      break;
    }
    case "redefinir-senha": {
      const u = await usuario(email);
      const senha = await pedirSenha();
      const erro = validar(senha); if (erro) throw new Error(erro);
      await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await hash(senha, OPCOES), senhaAlteradaEm: new Date(), falhasLogin: 0, bloqueadoAte: null } });
      await db.sessao.deleteMany({ where: { usuarioId: u.id } });
      console.log(`✔ Senha de ${u.email} redefinida; sessões encerradas.`);
      break;
    }
    case "desbloquear": {
      const u = await usuario(email);
      await db.usuario.update({ where: { id: u.id }, data: { falhasLogin: 0, bloqueadoAte: null, ativo: true } });
      console.log(`✔ ${u.email} desbloqueado.`);
      break;
    }
    case "desativar": {
      const u = await usuario(email);
      await db.usuario.update({ where: { id: u.id }, data: { ativo: false } });
      await db.sessao.deleteMany({ where: { usuarioId: u.id } });
      console.log(`✔ ${u.email} desativado; sessões encerradas.`);
      break;
    }
    default:
      console.log("Comandos: listar | criar-superadmin <email> \"<nome>\" | redefinir-senha <email> | desbloquear <email> | desativar <email>");
  }
}

main()
  .catch((e) => { console.error("✖", e.message); process.exitCode = 1; })
  .finally(() => db.$disconnect());
