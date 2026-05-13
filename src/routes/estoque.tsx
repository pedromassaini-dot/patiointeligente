import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, LoteCard, inputCls } from "@/components/ui-bits";
import { LoteDrawer } from "@/components/LoteDrawer";
import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { PackagePlus, Search, Archive } from "lucide-react";

export const Route = createFileRoute("/estoque")({
  component: EstoquePage,
});

function EstoquePage() {
  const { lotes, tipos, fornecedores } = useStore((s) => ({
    lotes: s.lotes,
    tipos: s.tipos,
    fornecedores: s.fornecedores,
  }));

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [forn, setForn] = useState("");
  const [status, setStatus] = useState("");
  const [loc, setLoc] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const localizacoes = Array.from(new Set(lotes.map((l) => l.localizacao))).sort();

  const filtrados = useMemo(() => {
    return lotes.filter((l) => {
      if (tipo && l.tipoMaterialId !== tipo) return false;
      if (forn && l.fornecedorId !== forn) return false;
      if (status && l.status !== status) return false;
      if (loc && l.localizacao !== loc) return false;
      if (q) {
        const t = tipos.find((x) => x.id === l.tipoMaterialId)?.nome ?? "";
        const f = fornecedores.find((x) => x.id === l.fornecedorId)?.nome ?? "";
        const hay = `${l.codigo} ${t} ${f} ${l.localizacao}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [lotes, q, tipo, forn, status, loc, tipos, fornecedores]);

  const iniciais = filtrados.filter((l) => l.isEstoqueInicial);
  const comprados = filtrados.filter((l) => !l.isEstoqueInicial);

  return (
    <AppLayout>
      <PageHeader
        title="Estoque"
        description={`${filtrados.length} de ${lotes.length} lotes`}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/novo-estoque-inicial"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-700 text-sm font-medium hover:bg-sky-100 dark:hover:bg-sky-900/40 transition"
            >
              <Archive className="h-4 w-4" /> Estoque Inicial
            </Link>
            <Link
              to="/novo-lote"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <PackagePlus className="h-4 w-4" /> Novo lote
            </Link>
          </div>
        }
      />

      <div className="bg-card rounded-xl border p-3 md:p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-2">
        <div className="col-span-2 md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código, material..."
            className={inputCls + " pl-9"}
          />
        </div>
        <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos materiais</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select className={inputCls} value={forn} onChange={(e) => setForn(e.target.value)}>
          <option value="">Todos fornecedores</option>
          {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos status</option>
          <option value="estoque">Em estoque</option>
          <option value="estoque_inicial">Estoque Inicial</option>
          <option value="beneficiamento">Beneficiamento</option>
          <option value="vendido">Vendido</option>
        </select>
        <select className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)}>
          <option value="">Toda localização</option>
          {localizacoes.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground">
          Nenhum lote encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-6">
          {iniciais.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Archive className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h2 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                  Estoque Inicial ({iniciais.length})
                </h2>
                <div className="h-px flex-1 bg-sky-200/60 dark:bg-sky-800/40" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {iniciais.map((l) => (
                  <LoteCard
                    key={l.id}
                    lote={l}
                    tipo={tipos.find((t) => t.id === l.tipoMaterialId)}
                    fornecedor={undefined}
                    onClick={() => setSelectedId(l.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {comprados.length > 0 && (
            <section>
              {iniciais.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <PackagePlus className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Lotes comprados ({comprados.length})
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {comprados.map((l) => (
                  <LoteCard
                    key={l.id}
                    lote={l}
                    tipo={tipos.find((t) => t.id === l.tipoMaterialId)}
                    fornecedor={fornecedores.find((f) => f.id === l.fornecedorId)}
                    onClick={() => setSelectedId(l.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <LoteDrawer loteId={selectedId} onClose={() => setSelectedId(null)} />
    </AppLayout>
  );
}
