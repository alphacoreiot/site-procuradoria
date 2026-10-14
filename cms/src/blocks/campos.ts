// Linguagem de descrição de campos: a mesma definição gera o formulário do
// painel (com limites e contadores) e o esquema Zod que valida no servidor.
import { z } from "zod";
import type { Proporcao } from "@/lib/media-shared";

type Base = { nome: string; rotulo: string; ajuda?: string };

export type Campo =
  | (Base & { tipo: "texto"; max: number; min?: number; obrigatorio?: boolean; multilinha?: boolean; linhas?: number })
  | (Base & { tipo: "url"; obrigatorio?: boolean })
  | (Base & { tipo: "email"; obrigatorio?: boolean })
  | (Base & { tipo: "telefone"; obrigatorio?: boolean })
  | (Base & { tipo: "numero"; min: number; max: number; passo?: number })
  | (Base & { tipo: "booleano" })
  | (Base & { tipo: "selecao"; opcoes: readonly { valor: string; rotulo: string }[] })
  | (Base & { tipo: "imagem"; proporcao: Proporcao; obrigatorio?: boolean })
  | (Base & { tipo: "lista"; itemRotulo: string; max: number; min?: number; campos: Campo[]; resumo?: string })
  | (Base & { tipo: "grupo"; campos: Campo[] });

// ---- opções fechadas (nada fora delas é aceito) -------------------------------
export const CORES = [
  { valor: "roxo", rotulo: "Roxo" },
  { valor: "vermelho", rotulo: "Vermelho" },
  { valor: "verde", rotulo: "Verde" },
  { valor: "laranja", rotulo: "Laranja" },
] as const;

export const ICONES = [
  { valor: "layers", rotulo: "Camadas" },
  { valor: "grid", rotulo: "Grade" },
  { valor: "ticket", rotulo: "Chamado" },
  { valor: "search", rotulo: "Lupa" },
  { valor: "handshake", rotulo: "Acordo" },
  { valor: "doc", rotulo: "Documento" },
  { valor: "inbox", rotulo: "Caixa de entrada" },
  { valor: "phone", rotulo: "Telefone" },
  { valor: "mail", rotulo: "E-mail" },
  { valor: "pin", rotulo: "Localização" },
  { valor: "clock", rotulo: "Relógio" },
  { valor: "id", rotulo: "Crachá" },
  { valor: "user", rotulo: "Pessoa" },
  { valor: "chat", rotulo: "Conversa" },
  { valor: "send", rotulo: "Enviar" },
] as const;

// ---- regras ------------------------------------------------------------------
const RE_URL = /^(https:\/\/[^\s"'<>]+|http:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:\+?[0-9]{8,15}|#[A-Za-z][\w-]*|\/(?!\/)[^\s"'<>]*)$/;
const RE_TEL = /^[0-9()+\- ]{8,20}$/;
const RE_ID = /^[a-z0-9]{10,40}$/;

const imagemSchema = z.object({
  id: z.string().regex(RE_ID).or(z.literal("")),
  alt: z.string().trim().max(160),
});
export type ValorImagem = z.infer<typeof imagemSchema>;

function schemaCampo(c: Campo): z.ZodTypeAny {
  switch (c.tipo) {
    case "texto": {
      let s = z.string().trim().max(c.max, `${c.rotulo}: no máximo ${c.max} caracteres.`);
      if (c.obrigatorio) s = s.min(c.min ?? 1, `${c.rotulo}: obrigatório.`);
      return s;
    }
    case "url":
      return c.obrigatorio
        ? z.string().trim().max(500).regex(RE_URL, `${c.rotulo}: link inválido.`)
        : z.string().trim().max(500).regex(RE_URL, `${c.rotulo}: link inválido.`).or(z.literal(""));
    case "email":
      return c.obrigatorio ? z.string().trim().max(120).email() : z.string().trim().max(120).email().or(z.literal(""));
    case "telefone":
      return c.obrigatorio ? z.string().trim().regex(RE_TEL) : z.string().trim().regex(RE_TEL).or(z.literal(""));
    case "numero":
      return z.coerce.number().min(c.min).max(c.max);
    case "booleano":
      return z.boolean();
    case "selecao":
      return z.enum(c.opcoes.map((o) => o.valor) as [string, ...string[]]);
    case "imagem":
      return c.obrigatorio ? imagemSchema.refine((v) => v.id !== "", `${c.rotulo}: escolha uma imagem.`) : imagemSchema;
    case "lista":
      return z
        .array(schemaObjeto(c.campos))
        .min(c.min ?? 0, `${c.rotulo}: mínimo de ${c.min} item(ns).`)
        .max(c.max, `${c.rotulo}: no máximo ${c.max} itens.`);
    case "grupo":
      return schemaObjeto(c.campos);
  }
}

/** Esquema Zod estrito (campos desconhecidos são rejeitados). */
export function schemaObjeto(campos: Campo[]) {
  const forma: Record<string, z.ZodTypeAny> = {};
  for (const c of campos) forma[c.nome] = schemaCampo(c);
  return z.object(forma).strict();
}

/** Valor vazio de um conjunto de campos (para "adicionar item"). */
export function valorVazio(campos: Campo[]): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const c of campos) {
    switch (c.tipo) {
      case "numero": v[c.nome] = c.min; break;
      case "booleano": v[c.nome] = false; break;
      case "selecao": v[c.nome] = c.opcoes[0].valor; break;
      case "imagem": v[c.nome] = { id: "", alt: "" }; break;
      case "lista": v[c.nome] = []; break;
      case "grupo": v[c.nome] = valorVazio(c.campos); break;
      default: v[c.nome] = "";
    }
  }
  return v;
}

/** Junta um valor salvo com o padrão (campos novos ganham valor vazio). */
export function completar(campos: Campo[], valor: unknown): Record<string, unknown> {
  const base = valorVazio(campos);
  const obj = valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
  for (const c of campos) {
    if (!(c.nome in obj)) continue;
    if (c.tipo === "grupo") base[c.nome] = completar(c.campos, obj[c.nome]);
    else if (c.tipo === "lista" && Array.isArray(obj[c.nome]))
      base[c.nome] = (obj[c.nome] as unknown[]).map((i) => completar(c.campos, i));
    else base[c.nome] = obj[c.nome];
  }
  return base;
}

/** Todos os ids de imagem usados num valor (para conferir se são do órgão). */
export function idsDeImagens(campos: Campo[], valor: unknown, saida: Set<string> = new Set()): Set<string> {
  const obj = (valor ?? {}) as Record<string, unknown>;
  for (const c of campos) {
    const v = obj[c.nome];
    if (c.tipo === "imagem" && v && typeof v === "object" && (v as ValorImagem).id) saida.add((v as ValorImagem).id);
    if (c.tipo === "grupo") idsDeImagens(c.campos, v, saida);
    if (c.tipo === "lista" && Array.isArray(v)) v.forEach((i) => idsDeImagens(c.campos, i, saida));
  }
  return saida;
}
