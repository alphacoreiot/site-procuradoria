// Reorganiza a Central de Conteúdo da SEFAZ: categorias por finalidade e títulos legíveis
// no lugar de nomes de arquivo. Pode rodar de novo; o que já foi ajustado fica como está.
// Só altera documentos ainda com a categoria ou o título originais.
// Uso: DATABASE_URL=... npx tsx scripts/sefaz-central.ts [--aplicar]
import { db } from "../src/lib/db";
import { normalizarBusca } from "../src/lib/documentos-shared";

const aplicar = process.argv.includes("--aplicar");

const CATEGORIAS: Record<string, string> = {
  "Audiência Pública": "Audiências públicas",
  "Formulários / Declarações": "Formulários e declarações",
  "Integração STM": "Integração de sistemas",
  "Manuais SEFAZ": "Manuais e guias",
  "Material Didático": "Manuais e guias",
  "Publicações SEFAZ": "Tabelas e valores",
};

/** Título original -> [novo título, categoria]. Vazio mantém. */
const ITENS: [RegExp, string, string][] = [
  [/^PASSO A PASSO DO SISTEMA TRIBUT/i, "", "Manuais e guias"],
  [/^Audiência Púbica/i, "Audiência 2º Quadrimestre - 2026", ""],
  [/^Manual Digital - Novo Processo ITIV/i, "Manual digital do novo processo do ITIV (2026)", "Manuais e guias"],
  [/^Manual Refis 2023/i, "Manual do REFIS 2023", "Manuais e guias"],
  [/^ebook-cadastramento/i, "E-book: cadastramento e emissão de NFS-e (agosto de 2023)", "Manuais e guias"],
  [/^Abertura_Proc_Digitais/i, "Tutorial de abertura de processos digitais", "Manuais e guias"],
  [/^TABELA DOS CNAEs FISCAIS - CONCLA 2\.3 - CLASSIFICADOS/i, "", "Tabelas e valores"],
  [/^ATO CONJUNTO RFB/i, "", "Normas e comunicados"],
  [/^COMUNICADO AOS CONTRIBUINTES/i, "Comunicado aos contribuintes sobre a NFS-e Nacional", "Normas e comunicados"],
  [/^INSTRUÇÃO NORMATIVA 002-2026/i, "Instrução Normativa 002/2026", "Normas e comunicados"],
  [/^PREFEITURA DE CAMAÇARI-BA - DIÁRIO Nro 2942/i, "Diário Oficial nº 2942, de 3 de setembro de 2026", "Normas e comunicados"],
  [/^Resol\. CGSN n 191-2026/i, "Resolução CGSN nº 191/2026 (revoga a Resolução CGSN nº 189/2026)", "Normas e comunicados"],
  [/^nt-009-se-cgnfse/i, "Nota Técnica nº 009 SE/CGNFS-e, versão 1.0.1", "Normas e comunicados"],
  [/^PORTARIA Nº 048_2025/i, "Portaria nº 048/2025, de 25 de março de 2025", "Normas e comunicados"],
];

async function main() {
  const o = await db.orgao.findUniqueOrThrow({ where: { slug: "sefaz" } });
  const ds = await db.documento.findMany({ where: { orgaoId: o.id, tipo: "CONTEUDO", publicado: true } });
  const mudou: string[] = [];
  const ficam: Record<string, number> = {};
  for (const d of ds) {
    const r = ITENS.find(([re]) => re.test(d.titulo));
    const titulo = r?.[1] || d.titulo;
    const categoria = r?.[2] || CATEGORIAS[d.categoria] || d.categoria;
    ficam[categoria || "(sem)"] = (ficam[categoria || "(sem)"] ?? 0) + 1;
    if (titulo === d.titulo && categoria === d.categoria) continue;
    mudou.push(`${d.titulo.slice(0, 40)} -> ${categoria}`);
    if (aplicar) await db.documento.update({ where: { id: d.id }, data: { titulo, categoria, busca: normalizarBusca(`${titulo} ${d.descricao}`) } });
  }
  console.log(JSON.stringify({ aplicar, total: ds.length, alterados: mudou.length, categorias: ficam }));
}
main().finally(() => db.$disconnect());
