// Preenche tipo, tema, autor e busca das notícias e o ano dos documentos da SEFAZ.
// Só preenche o que está vazio ou ainda no valor original: não apaga edições do painel.
import { db } from "../src/lib/db";
import { anoDoDocumento, normalizarBusca } from "../src/lib/documentos-shared";
import { CAMPOS_CONFIG } from "../src/blocks/specs";
import { completar, schemaObjeto } from "../src/blocks/campos";
import { classificar } from "./sefaz-classes";

const ORIGINAIS = new Set(["", "SEFAZ", "Notícia", "Noticia"]);

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" }, include: { configuracao: true } });
  const ns = await db.noticia.findMany({ where: { orgaoId: o.id } });
  const tipos: Record<string, number> = {}, temas: Record<string, number> = {};
  for (const n of ns) {
    const c = classificar(n.titulo, n.chamada, n.resumo);
    const tipo = n.tipo || c.tipo;
    const tema = ORIGINAIS.has(n.categoria) ? c.tema : n.categoria;
    tipos[tipo] = (tipos[tipo] ?? 0) + 1;
    temas[tema] = (temas[tema] ?? 0) + 1;
    await db.noticia.update({ where: { id: n.id }, data: { tipo, categoria: tema, busca: normalizarBusca(`${n.titulo} ${n.resumo}`) } });
  }
  const ds = await db.documento.findMany({ where: { orgaoId: o.id, ano: null } });
  for (const d of ds) await db.documento.update({ where: { id: d.id }, data: { ano: anoDoDocumento(d.titulo, d.data) } });

  const atual = completar(CAMPOS_CONFIG, JSON.parse(o.configuracao!.dados));
  const cfg = schemaObjeto(CAMPOS_CONFIG).parse({
    ...atual, visualModerno: true,
    linkSistema: atual.linkSistema || "https://sefazweb.camacari.ba.gov.br/prefeituras/loginb.tela",
    rotuloSistema: atual.rotuloSistema || "Acessar o Sistema Tributário",
  });
  await db.configuracao.update({ where: { orgaoId: o.id }, data: { dados: JSON.stringify(cfg) } });
  console.log(JSON.stringify({ noticias: ns.length, documentos: ds.length, tipos, temas }));
}
main().finally(() => db.$disconnect());
