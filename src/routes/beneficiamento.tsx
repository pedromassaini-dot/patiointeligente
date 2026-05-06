import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, StatusBadge } from "@/components/ui-bits";
import { useStore, actions, fmtKg, fmtBRL, custoTotalCompra, custoFinalKg } from "@/lib/store";
import { useState } from "react";
import { Hammer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/beneficiamento")({
  component: BeneficiamentoPage,
});

function BeneficiamentoPage() {
  const { lotes, tipos } = useStore((s) => ({ lotes: s.lotes, tipos: s.tipos }));
  const elegiveis = lotes.filter((l) => l.status !== "vendido");

  const [loteId, setLoteId] = useState("");
  const [pesoNovo, setPesoNovo] = useState("");
  const [custoBenef, setCustoBenef] = useState("");
  const [obs, setObs] = useState("");

  const lote = elegiveis.find((l) => l.id === loteId);
  const tipo = lote ? tipos.find((t) => t.id === lote.tipoMaterialId) : undefined;
  const pesoNum = parseFloat(pesoNovo) || 0;
  const custoBenefNum = parseFloat(custoBenef) || 0;
  const perda = lote && pesoNum ? lote.pesoAtual - pesoNum : 0;
  const perdaPct = lote && pesoNum ? (perda / lote.pesoAtual) * 100 : 0;
  const custoFinal =
    lote && pesoNum > 0
      ? (custoTotalCompra(lote) + (lote.custoBeneficiamento || 0) + custoBenefNum) / pesoNum
      : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote || !pesoNum || pesoNum <= 0 || pesoNum > lote.pesoAtual) {
      toast.error("Peso inválido (deve ser menor que o peso atual).");
      return;
    }
    actions.beneficiarLote(lote.id, pesoNum, custoBenefNum, obs);
    toast.success(`Beneficiamento registrado. Perda: ${fmtKg(perda)}`);
    setLoteId("");
    setPesoNovo("");
    setCustoBenef("");
    setObs("");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Beneficiamento"
        description="Registrar processamento de material e novo peso"
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 space-y-5">
          <Field label="Lote a beneficiar *">
            <select className={inputCls} value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              <option value="">Selecione um lote...</option>
              {elegiveis.map((l) => {
                const t = tipos.find((x) => x.id === l.tipoMaterialId);
                return (
                  <option key={l.id} value={l.id}>
                    {l.codigo} — {t?.nome} ({fmtKg(l.pesoAtual)})
                  </option>
                );
              })}
            </select>
          </Field>

          {lote && (
            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material</span>
                <span className="font-medium">{tipo?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso atual</span>
                <span className="font-medium">{fmtKg(lote.pesoAtual)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={lote.status} />
              </div>
            </div>
          )}

          <Field label="Peso após beneficiamento (kg) *">
            <input
              className={inputCls}
              type="number"
              step="0.1"
              min="0"
              value={pesoNovo}
              onChange={(e) => setPesoNovo(e.target.value)}
              placeholder="Ex: 420"
              disabled={!lote}
            />
          </Field>

          {lote && pesoNovo && perda > 0 && (
            <div className="rounded-md p-3 border border-warning/40 bg-warning/15 text-sm">
              <div className="flex justify-between">
                <span>Perda calculada</span>
                <span className="font-semibold">
                  {fmtKg(perda)} ({perdaPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          <Field label="Observações">
            <textarea
              className={inputCls + " h-20 py-2"}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Tipo de processamento, equipamento, etc."
            />
          </Field>

          <button type="submit" className={btnPrimary + " w-full"} disabled={!lote || !pesoNovo}>
            <Hammer className="h-4 w-4" /> Registrar beneficiamento
          </button>
        </form>

        <div className="bg-card rounded-xl border p-4 md:p-6">
          <h3 className="text-sm font-semibold mb-3">Beneficiamentos recentes</h3>
          <div className="space-y-2">
            {lotes
              .flatMap((l) =>
                l.movimentacoes
                  .filter((m) => m.tipo === "beneficiamento")
                  .map((m) => ({ ...m, codigo: l.codigo }))
              )
              .sort((a, b) => +new Date(b.data) - +new Date(a.data))
              .slice(0, 8)
              .map((m) => (
                <div key={m.id} className="text-sm border-b last:border-0 pb-2">
                  <div className="font-medium">{m.codigo}</div>
                  <div className="text-xs text-muted-foreground">{m.descricao}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(m.data).toLocaleString("pt-BR")} · {m.operador}
                  </div>
                </div>
              ))}
            {lotes.flatMap((l) => l.movimentacoes.filter((m) => m.tipo === "beneficiamento")).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8">
                Nenhum beneficiamento registrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
