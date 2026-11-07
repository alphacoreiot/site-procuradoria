// Ajustes de exibição: não alteram o que está salvo nem a busca.

const PRESERVAR: Record<string, string> = Object.fromEntries(
  ["ITIV", "IPTU", "ISS", "ISSQN", "TFF", "TRSD", "COSIP", "CNPJ", "CPF", "CNAE", "CNAES", "DAM", "DUA", "MEI", "EPP", "RG", "STM", "PGV", "CMC", "URBIS", "SEFAZ", "PROFI", "REFIS", "ABRASF", "WSDL", "XML", "RPS", "TXT", "DTE", "PIX", "CINF", "GED", "CONCLA", "ISSWEB"]
    .map((s) => [s, s]),
);
Object.assign(PRESERVAR, {
  "NFS-E": "NFS-e", "DT-E": "DT-e", "CAMAÇARI": "Camaçari", "BAHIA": "Bahia", "BRASIL": "Brasil", "ISS-WEB": "ISS Web", "WEB": "Web",
});

/** Palavras que chegam sem acento nos títulos em maiúsculas. */
const ACENTOS: Record<string, string> = { fisica: "física", juridica: "jurídica", imobiliario: "imobiliário", mobiliario: "mobiliário", especifica: "específica", nfse: "NFS-e", sa: "SA", cep: "CEP" };
const EXPRESSOES: [RegExp, string][] = [
  [/cadastro nacional da pessoa jurídica/gi, "Cadastro Nacional da Pessoa Jurídica"],
  [/simples nacional/gi, "Simples Nacional"],
];

/** Títulos em MAIÚSCULAS viram frase normal, preservando siglas e nomes próprios. */
export function fraseAmigavel(texto: string) {
  if (!texto) return texto;
  const letras = texto.replace(/[^\p{L}]/gu, "");
  const maiusculas = letras.replace(/[^\p{Lu}]/gu, "").length;
  if (letras.length < 4 || maiusculas / letras.length < 0.7) return texto; // já é texto normal
  let r = texto.replace(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu, (p) => {
    const m = p.toLocaleUpperCase("pt-BR");
    if (PRESERVAR[m]) return PRESERVAR[m];
    if (/^[IVX]{2,}$/.test(m)) return m; // numeração romana
    const min = p.toLocaleLowerCase("pt-BR");
    return ACENTOS[min] ?? min;
  });
  for (const [re, certo] of EXPRESSOES) r = r.replace(re, certo);
  return r.charAt(0).toLocaleUpperCase("pt-BR") + r.slice(1);
}
