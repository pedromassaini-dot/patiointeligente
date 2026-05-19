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

  // Available = not fully sold and has peso disponível
  const disponiveis = lotes.filter((l) => l.status !== "vendido" && !l.consumido && l.pesoDisponivel > 0);
  const vendidos = lotes.filter((l) => l.status === "vendido" || l.status === "vendido_parcial" as string);

  const [loteId, setLoteId] = useState("");
  const [preco, setPreco] = useState("");
  const [pesoVendidoStr, setPesoVendidoStr] = useState("");
  const [comprador, setComprador] = useState("");
  const [saving, setSaving] = useState(false);

  const lote = disponiveis.find((l) => l.id === loteId);
  const tipo = lote ? tipos.find((t) => t.id === lote.tipoMaterialId) : undefined;
  const precoNum = parseFloat(preco) || 0;
  const pesoNum = parseFloat(pesoVendidoStr) || (lote?.pesoDisponivel ?? 0);
  const pesoEfetivo = lote ? Math.min(pesoNum, lote.pesoDisponivel) : 0;
  const custoFinal = lote ? custoFinalKg(lote) : 0;
  const receita = pesoEfetivo * precoNum;
  const custo = pesoEfetivo * custoFinal;
  const margem = receita - custo;
  const isTotal = lote ? pesoNum >= lote.pesoDisponivel - 0.001 : true;

  const resetForm = () => {
    setLoteId("");
    setPreco("");
    setPesoVendidoStr("");
    setComprador("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote || precoNum <= 0) {
      toast.error("Selecione um lote e informe o preço.");
      return;
    }
    if (pesoNum <= 0) {
      toast.error("Informe o peso a vender.");
      return;
    }
    if (pesoNum > lote.pesoDisponivel + 0.001) {
      toast.error(`Peso solicitado (${fmtKg(pesoNum)}) excede o disponível (${fmtKg(lote.pesoDisponivel)}).`);
      return;
    }
    setSaving(true);
    try {
      await actions.venderLote(lote.id, precoNum, comprador.trim() || "Comprador", pesoNum);
      toast.success(
        isTotal
          ? `Venda total do lote ${lote.codigo} registrada.`
          : `Venda parcial de ${fmtKg(pesoNum)} do lote ${lote.codigo} registrada.`
      );
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar venda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Venda / Saída" description="Registrar venda de lotes" />

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 space-y-5">
          <Field label="Lote *">
            <select className={inputCls} value={loteId} onChange={(e) => { setLoteId(e.target.value); setPesoVendidoStr(""); }}>
              <option value="">Selecione...</option>
              {disponiveis.map((l) => {
                const t = tipos.find((x) => x.id === l.tipoMaterialId);
                const tag = l.loteTipo === "expedicao" ? " [Expedição]" : l.loteTipo === "sublote" ? " [Sublote]" : "";
                return (
                  <option key={l.id} value={l.id}>
                    {l.codigo}{tag} — {t?.nome} (disp: {fmtKg(l.pesoDisponivel)})
                  </option>
                );
              })}
            </select>
          </Field>

          {lote && (
            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium capitalize">{lote.loteTipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso disponível</span>
                <span className="font-medium">{fmtKg(lote.pesoDisponivel)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={lote.status} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Peso a vender (kg) *${lote ? ` — máx: ${fmtKg(lote.pesoDisponivel)}` : ""}`}>
              <input
                className={inputCls}
                type="number"
                step="0.1"
                min="0.1"
                max={lote?.pesoDisponivel}
                value={pesoVendidoStr}
                onChange={(e) => setPesoVendidoStr(e.target.value)}
                placeholder={lote ? lote.pesoDisponivel.toFixed(1) : "0"}
                disabled={!lote}
              />
            </Field>
            <Field label="Comprador">
              <input
                className={inputCls}
                value={comprador}
                onChange={(e) => setComprador(e.target.value)}
                placeholder="Nome do comprador"
                disabled={!lote}
              />
            </Field>
          </div>

          <Field
            label="Preço de venda (R$/kg) *"
            hint={tipo?.precoMedioVenda ? `Sugerido: R$ ${tipo.precoMedioVenda.toFixed(2)}` : undefined}
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

          {lote && precoNum > 0 && pesoEfetivo > 0 && (
            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso vendido</span>
                <span className="font-medium">{fmtKg(pesoEfetivo)}</span>
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
              {!isTotal && lote && (
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>Saldo restante</span>
                  <span>{fmtKg(lote.pesoDisponivel - pesoEfetivo)}</span>
                </div>
              )}
              <div className="pt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isTotal ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground"}`}>
                  {isTotal ? "Venda total — lote será baixado do estoque" : "Venda parcial — saldo permanece em estoque"}
                </span>
              </div>
            </div>
          )}

          <button type="submit" className={btnPrimary + " w-full"} disabled={!lote || precoNum <= 0 || saving}>
            <ShoppingCart className="h-4 w-4" /> {saving ? "Registrando..." : "Registrar venda"}
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
            {lotes
              .filter((l) => l.status === "vendido" || (l.status as string) === "vendido_parcial")
              .sort((a, b) => +new Date(b.dataSaida ?? 0) - +new Date(a.dataSaida ?? 0))
              .map((l) => {
                const t = tipos.find((x) => x.id === l.tipoMaterialId);
                const pesoVendido = l.pesoAtual - l.pesoDisponivel;
                const m = l.precoVenda ? (l.precoVenda - custoFinalKg(l)) * pesoVendido : 0;
                return (
                  <div key={l.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                    <div>
                      <div className="font-medium flex items-center gap-1.5">{l.codigo} <StatusBadge status={l.status} /></div>
                      <div className="text-xs text-muted-foreground">
                        {t?.nome} · {fmtKg(pesoVendido > 0 ? pesoVendido : l.pesoAtual)} · {fmtDate(l.dataSaida)}
                      </div>
                    </div>
                    <div className="text-right">
                      {l.precoVenda && <div className="font-semibold">{fmtBRL(l.pesoAtual * l.precoVenda)}</div>}
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
