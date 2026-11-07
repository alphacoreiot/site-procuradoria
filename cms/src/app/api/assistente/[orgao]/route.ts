import { z } from "zod";
import { headers } from "next/headers";
import { carregarSite } from "@/lib/site";
import { consumirLimite } from "@/lib/ratelimit";
import { ipCliente } from "@/lib/request";
import { indiceDoOrgao } from "@/lib/assistente/base";
import { chamarComReserva, lerFluxo, mensagens, montarContexto } from "@/lib/assistente/modelo";
import { normalizarBusca } from "@/lib/documentos-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const entrada = z.object({
  mensagem: z.string().trim().min(2).max(600),
  historico: z.array(z.object({ papel: z.enum(["user", "assistant"]), texto: z.string().max(1500) })).max(6).default([]),
});

const erro = (status: number, msg: string) => Response.json({ erro: msg }, { status });
const SEM_RESPOSTA = "Não consegui responder agora. Tente de novo em instantes ou fale com o SEFAZ Atende.";
const OCUPADO = "Muita gente está usando o assistente neste momento. Tente de novo em um minuto ou fale com o SEFAZ Atende.";

// perguntas repetidas não gastam a cota do modelo
type Guardada = { t: string; f: unknown[]; em: number };
const respostas = new Map<string, Guardada>();
const VALIDADE = 60 * 60 * 1000;
function guardar(chave: string, g: Guardada) {
  if (respostas.size >= 300) respostas.delete(respostas.keys().next().value as string);
  respostas.set(chave, g);
}

/**
 * Responde em linhas JSON: pedaços de texto ({t}) e, no fim, as fontes citadas ({f}).
 * A conversa não é gravada. Só a chave do limite (o IP) passa pelo banco.
 */
export async function POST(req: Request, { params }: { params: Promise<{ orgao: string }> }) {
  if (!process.env.GROQ_API_KEY) return erro(404, "Indisponível.");
  const h = await headers();
  const origem = h.get("origin");
  const hostReal = h.get("x-forwarded-host") ?? h.get("host");
  if (!origem || new URL(origem).host !== hostReal) return erro(403, "Origem não permitida.");

  const site = await carregarSite((await params).orgao);
  if (!site || !site.config.chatAtivo) return erro(404, "Indisponível.");

  const ip = await ipCliente();
  if (!(await consumirLimite(`chat:${ip}`, 30, 10 * 60 * 1000))) return erro(429, "Você enviou muitas perguntas. Aguarde alguns minutos.");
  if (!(await consumirLimite(`chat-dia:${site.orgao.id}`, 1800, 24 * 60 * 60 * 1000))) return erro(429, "O assistente atingiu o limite do dia. Fale com o SEFAZ Atende.");

  let corpo: z.infer<typeof entrada>;
  try {
    corpo = entrada.parse(await req.json());
  } catch {
    return erro(400, "Mensagem inválida.");
  }

  const codifica = new TextEncoder();
  const chave = corpo.historico.length === 0 ? `${site.orgao.id}:${normalizarBusca(corpo.mensagem)}` : "";
  const pronta = chave ? respostas.get(chave) : undefined;
  if (pronta && Date.now() - pronta.em < VALIDADE) {
    const linhas = `${JSON.stringify({ t: pronta.t })}\n${JSON.stringify({ f: pronta.f })}\n`;
    return new Response(codifica.encode(linhas), { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const indice = await indiceDoOrgao(site.orgao.id, site.orgao.slug);
  const ultimaUser = [...corpo.historico].reverse().find((t) => t.papel === "user")?.texto ?? "";
  const curta = corpo.mensagem.split(/\s+/).length < 7;
  const { usados, texto } = montarContexto(indice.buscar(curta && ultimaUser ? `${corpo.mensagem} ${ultimaUser}` : corpo.mensagem));

  const contato = site.blocos.find((b) => b.tipo === "contato")?.dados as { telefone?: string } | undefined;
  const msgs = mensagens(site.orgao.sigla, contato?.telefone ?? "", texto, corpo.historico, corpo.mensagem);

  const fluxo = new ReadableStream({
    async start(ctrl) {
      const manda = (o: unknown) => ctrl.enqueue(codifica.encode(`${JSON.stringify(o)}\n`));
      let completo = "";
      try {
        const sinal = AbortSignal.timeout(45_000);
        const r = await chamarComReserva(msgs, sinal);
        if (!r?.body) {
          manda({ e: OCUPADO });
          ctrl.close();
          return;
        }
        for await (const t of lerFluxo(r)) {
          completo += t;
          manda({ t });
        }
        // só fontes realmente citadas; se nada foi citado, nenhuma fonte é atribuída à resposta
        const citadas = [...new Set([...completo.matchAll(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g)].flatMap((m) => m[1].split(",").map(Number)))].filter((n) => usados[n - 1]);
        const f = citadas.map((n) => ({ n, titulo: usados[n - 1].titulo, rotulo: usados[n - 1].rotulo, tipo: usados[n - 1].tipo, url: usados[n - 1].url }));
        manda({ f });
        if (chave && completo) guardar(chave, { t: completo, f, em: Date.now() });
      } catch (e) {
        console.error("[assistente]", (e as Error).message);
        manda({ e: SEM_RESPOSTA });
      }
      ctrl.close();
    },
  });
  return new Response(fluxo, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
