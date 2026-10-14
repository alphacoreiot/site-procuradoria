"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigirOrgao, exigirSuperadmin } from "@/lib/auth";
import { auditar } from "@/lib/audit";
import { executar, ErroUsuario } from "@/lib/acao";
import { BLOCOS_POR_TIPO, CAMPOS_CONFIG } from "@/blocks/specs";
import { idsDeImagens, schemaObjeto, type Campo } from "@/blocks/campos";
import { blocosModelo, configModelo } from "@/blocks/modelo";

const RE_ID = /^[a-z0-9]{10,40}$/;
const SLUGS_RESERVADOS = new Set(["admin", "media", "assets", "api", "_next", "noticias", "login"]);

/** Valida dados de um conjunto de campos e confere se as imagens são do órgão. */
async function validarDados(campos: Campo[], json: string, orgaoId: string) {
  if (json.length > 500_000) throw new ErroUsuario("Conteúdo grande demais.");
  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    throw new ErroUsuario("Dados inválidos.");
  }
  const dados = schemaObjeto(campos).parse(bruto);
  const ids = [...idsDeImagens(campos, dados)];
  if (ids.length) {
    const ok = await db.midia.count({ where: { id: { in: ids }, orgaoId } });
    if (ok !== ids.length) throw new ErroUsuario("Há imagem que não pertence a este órgão.");
  }
  return dados;
}

function revalidarSite(slug: string) {
  revalidatePath(`/${slug}`, "layout");
  revalidatePath("/");
}

// ------------------------------------------------------------------ blocos
export async function salvarBloco(orgao: string, blocoId: string, json: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    if (!RE_ID.test(blocoId)) throw new ErroUsuario("Bloco inválido.");
    const b = await db.bloco.findFirst({ where: { id: blocoId, pagina: { orgaoId: o.id } } });
    if (!b || !BLOCOS_POR_TIPO[b.tipo]) throw new ErroUsuario("Bloco não encontrado.");
    const dados = await validarDados(BLOCOS_POR_TIPO[b.tipo].campos, json, o.id);
    await db.bloco.update({ where: { id: b.id }, data: { dados: JSON.stringify(dados), alteradoPor: usuario.email } });
    await auditar({ acao: "bloco.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: b.tipo, entidadeId: b.id, detalhes: { anterior: JSON.parse(b.dados) } });
    revalidarSite(o.slug);
    return { ok: true as const, msg: "Salvo e publicado." };
  });
}

export async function alternarBloco(orgao: string, blocoId: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const b = await db.bloco.findFirst({ where: { id: String(blocoId), pagina: { orgaoId: o.id } } });
    if (!b) throw new ErroUsuario("Bloco não encontrado.");
    await db.bloco.update({ where: { id: b.id }, data: { visivel: !b.visivel, alteradoPor: usuario.email } });
    await auditar({ acao: b.visivel ? "bloco.ocultar" : "bloco.mostrar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: b.tipo, entidadeId: b.id });
    revalidarSite(o.slug);
    revalidatePath(`/admin/${o.slug}/pagina`);
  });
}

export async function moverBloco(orgao: string, blocoId: string, direcao: "acima" | "abaixo") {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "EDITOR");
    const b = await db.bloco.findFirst({ where: { id: String(blocoId), pagina: { orgaoId: o.id } } });
    if (!b) throw new ErroUsuario("Bloco não encontrado.");
    const irmaos = await db.bloco.findMany({ where: { paginaId: b.paginaId, area: b.area }, orderBy: { ordem: "asc" } });
    const i = irmaos.findIndex((x) => x.id === b.id);
    const j = direcao === "acima" ? i - 1 : i + 1;
    if (j < 0 || j >= irmaos.length) return;
    const outro = irmaos[j];
    await db.$transaction([
      db.bloco.update({ where: { id: b.id }, data: { ordem: outro.ordem } }),
      db.bloco.update({ where: { id: outro.id }, data: { ordem: b.ordem } }),
    ]);
    await auditar({ acao: "bloco.mover", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: b.tipo, entidadeId: b.id, detalhes: { direcao } });
    revalidarSite(o.slug);
    revalidatePath(`/admin/${o.slug}/pagina`);
  });
}

export async function adicionarBloco(orgao: string, tipo: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const def = BLOCOS_POR_TIPO[String(tipo)];
    if (!def) throw new ErroUsuario("Tipo de componente inválido.");
    const pagina = await db.pagina.findUniqueOrThrow({ where: { orgaoId_slug: { orgaoId: o.id, slug: "inicio" } } });
    if (def.unico && (await db.bloco.count({ where: { paginaId: pagina.id, tipo: def.tipo } }))) {
      throw new ErroUsuario(`"${def.nome}" só pode existir uma vez por página.`);
    }
    const modelo = blocosModelo(o.nome, o.sigla).find((m) => m.tipo === def.tipo);
    const ultima = await db.bloco.findFirst({ where: { paginaId: pagina.id, area: def.area }, orderBy: { ordem: "desc" } });
    const novo = await db.bloco.create({
      data: { paginaId: pagina.id, tipo: def.tipo, area: def.area, ordem: (ultima?.ordem ?? -1) + 1, visivel: false, dados: JSON.stringify(modelo?.dados ?? {}), alteradoPor: usuario.email },
    });
    await auditar({ acao: "bloco.adicionar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: def.tipo, entidadeId: novo.id });
    revalidatePath(`/admin/${o.slug}/pagina`);
    return novo.id;
  });
}

export async function excluirBloco(orgao: string, blocoId: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const b = await db.bloco.findFirst({ where: { id: String(blocoId), pagina: { orgaoId: o.id } } });
    if (!b) throw new ErroUsuario("Bloco não encontrado.");
    await db.bloco.delete({ where: { id: b.id } });
    await auditar({ acao: "bloco.excluir", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: b.tipo, entidadeId: b.id, detalhes: { anterior: JSON.parse(b.dados) } });
    revalidarSite(o.slug);
    revalidatePath(`/admin/${o.slug}/pagina`);
  });
}

// ------------------------------------------------------------------ configurações
export async function salvarConfig(orgao: string, json: string) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const dados = await validarDados(CAMPOS_CONFIG, json, o.id);
    if (dados.whatsappNumero && !/^\d{12,13}$/.test(String(dados.whatsappNumero))) {
      throw new ErroUsuario("WhatsApp: use só números, com 55 + DDD + número (12 ou 13 dígitos).");
    }
    const anterior = await db.configuracao.findUnique({ where: { orgaoId: o.id } });
    await db.configuracao.upsert({ where: { orgaoId: o.id }, create: { orgaoId: o.id, dados: JSON.stringify(dados) }, update: { dados: JSON.stringify(dados) } });
    await auditar({ acao: "config.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "configuracao", detalhes: { anterior: anterior ? JSON.parse(anterior.dados) : null } });
    revalidarSite(o.slug);
    return { ok: true as const, msg: "Configurações salvas." };
  });
}

const schemaOrgao = z.object({
  nome: z.string().trim().min(3).max(100),
  sigla: z.string().trim().min(2).max(20),
  ativo: z.boolean(),
});

export async function salvarOrgao(orgao: string, entrada: unknown) {
  return executar(async () => {
    const { usuario, orgao: o } = await exigirOrgao(orgao, "ADMIN");
    const d = schemaOrgao.parse(entrada);
    // só a Prefeitura (SUPERADMIN) pode tirar um órgão do ar
    if (d.ativo !== o.ativo && usuario.papel !== "SUPERADMIN") throw new ErroUsuario("Somente a administração da Prefeitura pode ativar/desativar o site.");
    await db.orgao.update({ where: { id: o.id }, data: d });
    await auditar({ acao: "orgao.salvar", orgaoId: o.id, usuarioId: usuario.id, email: usuario.email, entidade: "orgao", entidadeId: o.id, detalhes: { anterior: { nome: o.nome, sigla: o.sigla, ativo: o.ativo } } });
    revalidarSite(o.slug);
    return { ok: true as const, msg: "Dados do órgão salvos." };
  });
}

export async function criarOrgao(entrada: unknown) {
  return executar(async () => {
    const u = await exigirSuperadmin();
    const d = z
      .object({
        slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Endereço: só letras minúsculas, números e hífen.").min(2).max(40),
        nome: z.string().trim().min(3).max(100),
        sigla: z.string().trim().min(2).max(20),
      })
      .parse(entrada);
    if (SLUGS_RESERVADOS.has(d.slug)) throw new ErroUsuario("Esse endereço é reservado pelo sistema.");
    if (await db.orgao.findUnique({ where: { slug: d.slug } })) throw new ErroUsuario("Já existe um órgão com esse endereço.");
    const o = await db.orgao.create({ data: { ...d, ativo: false } }); // nasce fora do ar até ser preenchido
    await db.configuracao.create({ data: { orgaoId: o.id, dados: JSON.stringify(configModelo(d.nome, d.sigla)) } });
    const pagina = await db.pagina.create({ data: { orgaoId: o.id, slug: "inicio", titulo: "Página inicial" } });
    let ordem = 0;
    for (const b of blocosModelo(d.nome, d.sigla)) {
      await db.bloco.create({ data: { paginaId: pagina.id, tipo: b.tipo, area: b.area, ordem: ordem++, dados: JSON.stringify(b.dados) } });
    }
    await auditar({ acao: "orgao.criar", orgaoId: o.id, usuarioId: u.id, email: u.email, entidade: "orgao", entidadeId: o.id, detalhes: d });
    revalidatePath("/admin");
    return o.slug;
  });
}
