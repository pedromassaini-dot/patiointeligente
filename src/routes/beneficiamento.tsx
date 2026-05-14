import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui-bits";
import { useStore, actions, fmtKg, fmtBRL, custoTotalCompra, custoFinalKg, type Lote, type TipoMaterial } from "@/lib/store";
import { useState } from "react";
import { Hammer, Plus, Trash2, GitFork } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/beneficiamento")({
  component: BeneficiamentoPage,
});

type Sublote = {
  tipoMaterialId: string;
  peso: string;
  custoEstimado: string;
  localizacao: string;
  observacoes: string;
};

const LOCALIZACOES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

function BeneficiamentoPage() {
  const { lotes, tipos } = useStore((s) => ({ lotes: s.lotes, tipos: s.tipos }));
  const elegiveis = lotes.filter((l) => l.status !== "vendido" && !l.consumido);

  const [modo, setModo] = useState<"simples" | "split">("simples");
  const [loteId, setLoteId] = useState("");
  const [custoBenef, setCustoBenef] = useState("");
  const [saving, setSaving] = useState(false);

  // Simples mode
  const [pesoNovo, setPesoNovo] = useState("");
  const [obs, setObs] = useState("");

  // Split mode
  const [sublotes, setSublotes] = useState<Sublote[]>([
    { tipoMaterialId: "", peso: "", custoEstimado: "", localizacao: "A1", observacoes: "" },
  ]);

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

  const pesoTotalSublotes = sublotes.reduce((a, s) => a + (parseFloat(s.peso) || 0), 0);

  const addSublote = () => {
    setSublotes((prev) => [
      ...prev,
      { tipoMaterialId: "", peso: "", custoEstimado: "", localizacao: "A1", observacoes: "" },
    ]);
  };

  const removeSublote = (i: number) => {
    setSublotes((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateSublote = (i: number, field: keyof Sublote, value: string) => {
    setSublotes((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const submitSimples = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote || !pesoNum || pesoNum <= 0 || pesoNum > lote.pesoAtual) {
      toast.error("Peso inválido (deve ser ≤ peso atual).");
      return;
    }
    setSaving(true);
    try {
      await actions.beneficiarLote(lote.id, pesoNum, custoBenefNum, obs);
      toast.success(`Beneficiamento registrado. Perda: ${fmtKg(perda)}`);
      setLoteId("");
      setPesoNovo("");
      setCustoBenef("");
      setObs("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  };

  const submitSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lote) { toast.error("Selecione um lote."); return; }
    if (sublotes.length < 1) { toast.error("Adicione pelo menos 1 sublote."); return; }
    for (const s of sublotes) {
      if (!s.tipoMaterialId) { toast.error("Selecione o material de cada sublote."); return; }
      if (!parseFloat(s.peso) || parseFloat(s.peso) <= 0) { toast.error("Informe o peso de cada sublote."); return; }
      if (!parseFloat(s.custoEstimado) || parseFloat(s.custoEstimado) < 0) { toast.error("Informe o custo estimado por kg de cada sublote."); return; }
    }
    if (pesoTotalSublotes > lote.pesoDisponivel + 0.001) {
      toast.error(`Total dos sublotes (${fmtKg(pesoTotalSublotes)}) excede o peso disponível (${fmtKg(lote.pesoDisponivel)}).`);
      return;
    }
    if (!window.confirm(`Confirmar split do lote ${lote.codigo} em ${sublotes.length} sublotes? O lote original será marcado como consumido.`)) return;
    setSaving(true);
    try {
      await actions.splitLote(
        lote.id,
        custoBenefNum,
        sublotes.map((s) => ({
          tipoMaterialId: s.tipoMaterialId,
          peso: parseFloat(s.peso),
          custoEstimado: parseFloat(s.custoEstimado),
          localizacao: s.localizacao,
          observacoes: s.observacoes || undefined,
        }))
      );
      toast.success(`Lote ${lote.codigo} dividido em ${sublotes.length} sublotes.`);
      setLoteId("");
      setCustoBenef("");
      setSublotes([{ tipoMaterialId: "", peso: "", custoEstimado: "", localizacao: "A1", observacoes: "" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao dividir lote");
    } finally {
      setSaving(false);
    }
  };

  const recentBenefs = lotes
    .flatMap((l) =>
      l.movimentacoes
        .filter((m) => m.tipo === "beneficiamento")
        .map((m) => ({ ...m, codigo: l.codigo }))
    )
    .sort((a, b) => +new Date(b.data) - +new Date(a.data))
    .slice(0, 8);

  return (
    <AppLayout>
      <PageHeader
        title="Beneficiamento"
        description="Processar material e gerar sublotes"
      />

      {/* Mode selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg text-sm mb-4 w-fit">
        <button
          type="button"
          onClick={() => setModo("simples")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition",
            modo === "simples" ? "bg-card shadow font-medium" : "text-muted-foreground"
          )}
        >
          <Hammer className="h-3.5 w-3.5" /> Beneficiamento simples
        </button>
        <button
          type="button"
          onClick={() => setModo("split")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition",
            modo === "split" ? "bg-card shadow font-medium" : "text-muted-foreground"
          )}
        >
          <GitFork className="h-3.5 w-3.5" /> Dividir em sublotes
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {modo === "simples" ? (
          <form onSubmit={submitSimples} className="bg-card rounded-xl border p-4 md:p-6 space-y-5">
            <LoteSelector loteId={loteId} setLoteId={setLoteId} elegiveis={elegiveis} tipos={tipos} />

            {lote && <LoteInfo lote={lote} tipo={tipo} />}

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

            <Field label="Custo do beneficiamento (R$)" hint="Mão de obra, energia, etc.">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={custoBenef}
                onChange={(e) => setCustoBenef(e.target.value)}
                placeholder="Ex: 50.00"
                disabled={!lote}
              />
            </Field>

            {lote && pesoNum > 0 && (
              <div className="rounded-md p-3 border border-warning/40 bg-warning/15 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Perda calculada</span>
                  <span className="font-semibold">{fmtKg(perda)} ({perdaPct.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Custo final</span>
                  <span className="font-semibold">{fmtBRL(custoFinal)}/kg</span>
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

            <button type="submit" className={btnPrimary + " w-full"} disabled={!lote || !pesoNovo || saving}>
              <Hammer className="h-4 w-4" /> {saving ? "Registrando..." : "Registrar beneficiamento"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitSplit} className="bg-card rounded-xl border p-4 md:p-6 space-y-5">
            <div className="rounded-md border border-sky-300 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-700 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
              <strong>Split de lote:</strong> O lote original será consumido e novos sublotes serão gerados com rastreabilidade completa para cada material resultante.
            </div>

            <LoteSelector loteId={loteId} setLoteId={setLoteId} elegiveis={elegiveis} tipos={tipos} />

            {lote && <LoteInfo lote={lote} tipo={tipo} />}

            <Field label="Custo total do beneficiamento (R$)" hint="Rateado proporcionalmente entre os sublotes">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={custoBenef}
                onChange={(e) => setCustoBenef(e.target.value)}
                placeholder="Ex: 200.00"
                disabled={!lote}
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sublotes resultantes</span>
                <button type="button" onClick={addSublote} className={btnSecondary + " h-8 text-xs"}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>

              {sublotes.map((s, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Sublote {lote ? `${lote.codigo}-${String.fromCharCode(65 + i)}` : String.fromCharCode(65 + i)}
                    </span>
                    {sublotes.length > 1 && (
                      <button type="button" onClick={() => removeSublote(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Material *">
                      <select
                        className={inputCls}
                        value={s.tipoMaterialId}
                        onChange={(e) => updateSublote(i, "tipoMaterialId", e.target.value)}
                        disabled={!lote}
                      >
                        <option value="">Selecione...</option>
                        {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    </Field>
                    <Field label="Peso (kg) *">
                      <input
                        className={inputCls}
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={s.peso}
                        onChange={(e) => updateSublote(i, "peso", e.target.value)}
                        placeholder="Ex: 50"
                        disabled={!lote}
                      />
                    </Field>
                    <Field label="Custo estim. (R$/kg) *">
                      <input
                        className={inputCls}
                        type="number"
                        step="0.01"
                        min="0"
                        value={s.custoEstimado}
                        onChange={(e) => updateSublote(i, "custoEstimado", e.target.value)}
                        placeholder="Ex: 8.50"
                        disabled={!lote}
                      />
                    </Field>
                    <Field label="Localização">
                      <select
                        className={inputCls}
                        value={s.localizacao}
                        onChange={(e) => updateSublote(i, "localizacao", e.target.value)}
                        disabled={!lote}
                      >
                        {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Observações">
                    <input
                      className={inputCls}
                      value={s.observacoes}
                      onChange={(e) => updateSublote(i, "observacoes", e.target.value)}
                      placeholder="Opcional"
                      disabled={!lote}
                    />
                  </Field>
                </div>
              ))}

              {lote && pesoTotalSublotes > 0 && (
                <div className={cn(
                  "rounded-md p-3 border text-sm space-y-1",
                  pesoTotalSublotes > lote.pesoDisponivel
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-success/40 bg-success/10"
                )}>
                  <div className="flex justify-between">
                    <span>Total sublotes</span>
                    <span className="font-semibold">{fmtKg(pesoTotalSublotes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Disponível no lote</span>
                    <span className="font-semibold">{fmtKg(lote.pesoDisponivel)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Perda no split</span>
                    <span className="font-semibold">{fmtKg(Math.max(0, lote.pesoDisponivel - pesoTotalSublotes))}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={btnPrimary + " w-full"}
              disabled={!lote || sublotes.length === 0 || saving}
            >
              <GitFork className="h-4 w-4" /> {saving ? "Processando..." : `Dividir em ${sublotes.length} sublote${sublotes.length !== 1 ? "s" : ""}`}
            </button>
          </form>
        )}

        <div className="bg-card rounded-xl border p-4 md:p-6">
          <h3 className="text-sm font-semibold mb-3">Beneficiamentos recentes</h3>
          <div className="space-y-2">
            {recentBenefs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                Nenhum beneficiamento registrado ainda.
              </div>
            ) : (
              recentBenefs.map((m) => (
                <div key={m.id} className="text-sm border-b last:border-0 pb-2">
                  <div className="font-medium">{m.codigo}</div>
                  <div className="text-xs text-muted-foreground">{m.descricao}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(m.data).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sublotes section */}
          {lotes.filter((l) => l.loteTipo === "sublote").length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Sublotes gerados
              </h4>
              <div className="space-y-1.5">
                {lotes
                  .filter((l) => l.loteTipo === "sublote")
                  .slice(0, 6)
                  .map((l) => {
                    const t = tipos.find((x) => x.id === l.tipoMaterialId);
                    return (
                      <div key={l.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{l.codigo}</span>
                        <span className="text-muted-foreground">{t?.nome} · {fmtKg(l.pesoAtual)}</span>
                        <StatusBadge status={l.status} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function LoteSelector({
  loteId,
  setLoteId,
  elegiveis,
  tipos,
}: {
  loteId: string;
  setLoteId: (v: string) => void;
  elegiveis: Lote[];
  tipos: TipoMaterial[];
}) {
  return (
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
  );
}

function LoteInfo({
  lote,
  tipo,
}: {
  lote: Lote;
  tipo?: TipoMaterial;
}) {
  return (
    <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Material</span>
        <span className="font-medium">{tipo?.nome ?? "—"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Peso atual</span>
        <span className="font-medium">{fmtKg(lote.pesoAtual)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Disponível</span>
        <span className="font-medium">{fmtKg(lote.pesoDisponivel)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Custo/kg</span>
        <span className="font-medium">{fmtBRL(lote.custoUnitario)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Status</span>
        <StatusBadge status={lote.status} />
      </div>
    </div>
  );
}
