import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, StatusBadge } from "@/components/ui-bits";
import { useStore, actions, fmtKg, fmtBRL, fmtDate, custoFinalKg } from "@/lib/store";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/venda")({
  component: VendaPage,
});

function VendaPage() {
  const { lotes, tipos } = useStore((s) => ({ lotes: s.lotes, tipos: s.tipos }));
  const disponiveis = lotes.filter((l) => l.status !== "vendido");
  const vendidos = lotes.filter((l) => l.status === "vendido");

  const [loteId, setLoteId] = useState("");
  const [preco, setPreco] = useState("");

  const lote = disponiveis.find((l) => l.id === loteId);
  const tipo = lote ? tipos.find((t) => t.id === lote.tipoMaterialId) : undefined;
  const precoNum = parseFloat(preco) || 0;
  const custoFinal = lote ? custoFinalKg(lote) : 0;
  const receita = lote ? lote.pesoAtual * precoNum : 0;
  const custo = lote ? lote.pesoAtual * custoFinal : 0;
  const margem = receita - custo;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote || precoNum <= 0) {
      toast.error("Selecione um lote e informe o preço.");
      return;
    }
    actions.venderLote(lote.id, precoNum);
    toast.success(`Venda do lote ${lote.codigo} registrada!`);
    setLoteId("");
    setPreco("");
  };

  return (
    <AppLayout>
      <PageHeader title="Venda / Saída" description="Registrar venda de lotes" />

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 space-y-5">
          <Field label="Lote *">
            <select className={inputCls} value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              <option value="">Selecione...</option>
              {disponiveis.map((l) => {
                const t = tipos.find((x) => x.id === l.tipoMaterialId);
                return (
                  <option key={l.id} value={l.id}>
                    {l.codigo} — {t?.nome} ({fmtKg(l.pesoAtual)})
                  </option>
                );
              })}
            </select>
          </Field>

          <Field
            label="Preço de venda (R$/kg) *"
            hint={tipo ? `Sugerido: R$ ${tipo.precoMedioVenda.toFixed(2)}` : undefined}
          >
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              disabled={!lote}
            />
          </Field>

          {lote && precoNum > 0 && (
            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso</span>
                <span className="font-medium">{fmtKg(lote.pesoAtual)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita</span>
                <span className="font-medium">{fmtBRL(receita)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo proporcional</span>
                <span className="font-medium">{fmtBRL(custo)} <span className="text-xs text-muted-foreground">({fmtBRL(custoFinal)}/kg)</span></span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground">Margem</span>
                <span className={`font-semibold ${margem >= 0 ? "text-success" : "text-destructive"}`}>
                  {fmtBRL(margem)}
                </span>
              </div>
            </div>
          )}

          <button type="submit" className={btnPrimary + " w-full"} disabled={!lote || precoNum <= 0}>
            <ShoppingCart className="h-4 w-4" /> Registrar venda
          </button>
        </form>

        <div className="bg-card rounded-xl border p-4 md:p-6">
          <h3 className="text-sm font-semibold mb-3">Vendas recentes</h3>
          <div className="space-y-2">
            {vendidos.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8">
                Nenhuma venda registrada.
              </div>
            )}
            {vendidos
              .sort((a, b) => +new Date(b.dataSaida ?? 0) - +new Date(a.dataSaida ?? 0))
              .map((l) => {
                const t = tipos.find((x) => x.id === l.tipoMaterialId);
                const m = (l.precoVenda! - custoFinalKg(l)) * l.pesoAtual;
                return (
                  <div key={l.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                    <div>
                      <div className="font-medium">{l.codigo} <StatusBadge status={l.status} /></div>
                      <div className="text-xs text-muted-foreground">
                        {t?.nome} · {fmtKg(l.pesoAtual)} · {fmtDate(l.dataSaida ?? "")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmtBRL(l.pesoAtual * l.precoVenda!)}</div>
                      <div className={`text-xs ${m >= 0 ? "text-success" : "text-destructive"}`}>
                        {m >= 0 ? "+" : ""}{fmtBRL(m)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
