import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, inputCls } from "@/components/ui-bits";
import { useStore, fmtDateTime } from "@/lib/store";
import { useState, useMemo } from "react";
import { ArrowDown, ArrowRightLeft, Hammer, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/movimentacoes")({
  component: MovsPage,
});

const ICON = {
  entrada: ArrowDown,
  movimentacao: ArrowRightLeft,
  beneficiamento: Hammer,
  saida: ShoppingCart,
};

const TONE = {
  entrada: "bg-success/15 text-success",
  movimentacao: "bg-primary/15 text-primary",
  beneficiamento: "bg-warning/20 text-warning-foreground",
  saida: "bg-muted text-muted-foreground",
};

function MovsPage() {
  const lotes = useStore((s) => s.lotes);
  const [filtro, setFiltro] = useState("");

  const movs = useMemo(() => {
    return lotes
      .flatMap((l) => l.movimentacoes.map((m) => ({ ...m, loteId: l.id, codigo: l.codigo })))
      .filter((m) => !filtro || m.tipo === filtro)
      .sort((a, b) => +new Date(b.data) - +new Date(a.data));
  }, [lotes, filtro]);

  return (
    <AppLayout>
      <PageHeader
        title="Movimentações"
        description={`${movs.length} eventos registrados`}
      />

      <div className="bg-card rounded-xl border p-3 mb-4 flex gap-2">
        <select className={inputCls + " max-w-xs"} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="movimentacao">Movimentação</option>
          <option value="beneficiamento">Beneficiamento</option>
          <option value="saida">Saída/Venda</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        {movs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Nenhuma movimentação encontrada.
          </div>
        ) : (
          <ol className="divide-y">
            {movs.map((m) => {
              const Icon = ICON[m.tipo];
              return (
                <li key={m.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition">
                  <div className={cn("h-9 w-9 rounded-md flex items-center justify-center shrink-0", TONE[m.tipo])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to="/lote/$id"
                        params={{ id: m.loteId }}
                        className="font-medium text-sm hover:underline"
                      >
                        {m.codigo}
                      </Link>
                      <span className="text-xs text-muted-foreground">{m.operador}</span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{m.descricao}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    {fmtDateTime(m.data)}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </AppLayout>
  );
}
