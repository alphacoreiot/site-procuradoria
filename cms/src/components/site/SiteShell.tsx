/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Cabecalho, Rodape, jsonSeguro, type Ctx } from "@/blocks/render";
import { Icone } from "./ui";
import { SPRITE } from "./sprite";
import { ScriptsSite } from "./ScriptsSite";
import type { BlocoCarregado } from "@/lib/site";

/**
 * Moldura comum do site do órgão: cabeçalho, rodapé, botões flutuantes,
 * ícones, configuração para os scripts e os scripts de animação (com nonce).
 */
export async function SiteShell({
  ctx, nomeOrgao, config, blocos, children,
}: {
  ctx: Ctx;
  nomeOrgao: string;
  config: Record<string, any>;
  blocos: BlocoCarregado[];
  children: ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const cab = blocos.find((b) => b.tipo === "cabecalho");
  const rod = blocos.find((b) => b.tipo === "rodape");
  const contato = blocos.find((b) => b.tipo === "contato")?.dados as any;

  // configuração lida pelo main.js (WhatsApp, e-mail do formulário, mapa)
  const cfgScripts = {
    whatsappNumero: config.whatsappNumero || "",
    whatsappMensagem: config.whatsappMensagem || "",
    telefone: contato?.telefone || "",
    email: contato?.email || "",
    endereco: contato?.endereco || "",
    horario: contato?.horario || "",
    localNome: contato?.local?.nome || "",
    mapa: contato?.local?.ativo
      ? { lat: contato.local.latitude, lng: contato.local.longitude, zoom: contato.local.zoom, link: contato.local.link || "" }
      : undefined,
  };

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      {cab && <Cabecalho d={cab.dados} ctx={ctx} nomeOrgao={nomeOrgao} />}
      <main id="conteudo">{children}</main>
      {rod && <Rodape d={rod.dados} ctx={ctx} nomeOrgao={nomeOrgao} />}

      {config.whatsappFlutuante && (
        <a className="wa-float" data-whatsapp href="#" target="_blank" rel="noopener noreferrer" aria-label="Atendimento pelo WhatsApp">
          <Icone id="whatsapp" />
        </a>
      )}
      {config.voltarTopo && (
        <a className="to-top" href="#topo" aria-label="Voltar ao topo" title="Voltar ao topo"><Icone id="chevron" /></a>
      )}

      {/* ícones fixos do projeto (não contém dados de usuário) */}
      <div dangerouslySetInnerHTML={{ __html: SPRITE }} />
      <script type="application/json" id="pgm-config" dangerouslySetInnerHTML={{ __html: jsonSeguro(cfgScripts) }} />

      <ScriptsSite nonce={nonce} />
    </>
  );
}
