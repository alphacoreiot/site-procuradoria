import { db } from "@/lib/db";
import { orgaoDaPagina } from "@/lib/auth";

type Props = { params: Promise<{ orgao: string }> };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Bahia" });

export default async function Auditoria({ params }: Props) {
  const { orgao } = await orgaoDaPagina((await params).orgao, "ADMIN");
  const registros = await db.auditoria.findMany({ where: { orgaoId: orgao.id }, orderBy: { criadaEm: "desc" }, take: 300 });
  return (
    <>
      <h1>Auditoria</h1>
      <p className="sub">Últimas 300 ações em {orgao.sigla}. Cada alteração de conteúdo guarda a versão anterior.</p>
      <section className="card" style={{ overflowX: "auto" }}>
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Item</th><th>IP</th></tr></thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id}>
                <td>{fmt.format(r.criadaEm)}</td>
                <td>{r.email || "—"}</td>
                <td><span className={`tag ${r.acao.includes("falha") || r.acao.includes("bloque") ? "tag--off" : r.acao.includes("excluir") ? "tag--off" : "tag--roxo"}`}>{r.acao}</span></td>
                <td>{r.entidade}{r.entidadeId && <small style={{ color: "var(--suave)" }}> · {r.entidadeId.slice(-8)}</small>}</td>
                <td>{r.ip || "—"}</td>
              </tr>
            ))}
            {registros.length === 0 && <tr><td colSpan={5}>Nenhum registro ainda.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
