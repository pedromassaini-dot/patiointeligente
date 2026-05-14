import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/ui-bits";
import { useStore, actions, fmtKg, fmtBRL, custoFinalKg, type Lote, type TipoMaterial, type Fornecedor } from "@/lib/store";
import { useState, useMemo } from "react";
import { PackageSearch, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expedicao")({
  component: ExpedicaoPage,
});

type ItemExpedicao = {
  loteId: string;
  pesoUsado: string;
};

const LOCALIZACOES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

function ExpedicaoPage() {
  const { lotes, tipos, fornecedores } = useStore((s) => ({
    lotes: s.lotes,
    tipos: s.tipos,
    fornecedores: s.fornecedores,
  }));

  const disponiveis = lotes.filter((l) => l.status !== "vendido" && !l.consumido && l.pesoDisponivel > 0);

  const [itens, setItens] = useState<ItemExpedicao[]>([{ loteId: "", pesoUsado: "" }]);
  const [localizacao, setLocalizacao] = useState("Doca");
  const [observacoes, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const addItem = () => setItens((prev) => [...prev, { loteId: "", pesoUsado: "" }]);
  const removeItem = (i: number) => setItens((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ItemExpedicao, value: string) =>
    setItens((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const itensValidos = useMemo(
    () =>
      itens
        .map((item) => ({
          ...item,
          lote: disponiveis.find((l) => l.id === item.loteId),
          pesoNum: parseFloat(item.pesoUsado) || 0,
        }))
        .filter((item) => item.lote && item.pesoNum > 0),
    [itens, disponiveis]
  );

  const pesoTotal = itensValidos.reduce((a, i) => a + i.pesoNum, 0);
  const custoTotal = itensValidos.reduce((a, i) => a + custoFinalKg(i.lote!) * i.pesoNum, 0);
  const custoPorKg = pesoTotal > 0 ? custoTotal / pesoTotal : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itensValidos.length === 0) {
      toast.error("Adicione pelo menos um lote com peso válido.");
      return;
    }
    for (const item of itensValidos) {
      if (item.pesoNum > item.lote!.pesoDisponivel + 0.001) {
        toast.error(`Peso solicitado (${fmtKg(item.pesoNum)}) excede disponível (${fmtKg(item.lote!.pesoDisponivel)}) no lote ${item.lote!.codigo}.`);
        return;
      }
    }
    if (!localizacao) { toast.error("Informe a localização."); return; }
    if (!window.confirm(`Formar lote de expedição com ${fmtKg(pesoTotal)} de ${itensValidos.length} lote(s)?`)) return;

    setSaving(true);
    try {
      const id = await actions.formarExpedicao(
        localizacao,
        observacoes || undefined,
        itensValidos.map((i) => ({ loteId: i.loteId, pesoUsado: i.pesoNum }))
      );
      setResultado(id);
      toast.success("Lote de expedição formado com sucesso.");
      setItens([{ loteId: "", pesoUsado: "" }]);
      setObs("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao formar lote");
    } finally {
      setSaving(false);
    }
  };

  const expedicoes = lotes.filter((l) => l.loteTipo === "expedicao");

  return (
    <AppLayout>
      <PageHeader
        title="Formar Lote de Expedição"
        description="Compor lote de venda a partir de múltiplos lotes e sublotes"
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-4 md:p-6 space-y-5">
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            Selecione lotes disponíveis e informe quanto peso de cada um será incluído neste lote de expedição.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lotes de origem</span>
              <button type="button" onClick={addItem} className={btnSecondary + " h-8 text-xs"}>
                <Plus className="h-3.5 w-3.5" /> Adicionar lote
              </button>
            </div>

            {itens.map((item, i) => {
              const lote = disponiveis.find((l) => l.id === item.loteId);
              const pesoNum = parseFloat(item.pesoUsado) || 0;
              const disponivel = lote?.pesoDisponivel ?? 0;
              const excede = pesoNum > disponivel + 0.001;

              return (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Item {i + 1}</span>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Field label="Lote *">
                    <select
                      className={inputCls}
                      value={item.loteId}
                      onChange={(e) => updateItem(i, "loteId", e.target.value)}
                    >
                      <option value="">Selecione um lote...</option>
                      {disponiveis.map((l) => {
                        const t = tipos.find((x) => x.id === l.tipoMaterialId);
                        const f = fornecedores.find((x) => x.id === l.fornecedorId);
                        return (
                          <option key={l.id} value={l.id}>
                            {l.codigo} — {t?.nome}{f ? ` (${f.nome})` : ""} · disp: {fmtKg(l.pesoDisponivel)}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  <Field label={`Peso a usar (kg) *${lote ? ` — máx: ${fmtKg(disponivel)}` : ""}`}>
                    <input
                      className={cn(inputCls, excede && "border-destructive focus:ring-destructive")}
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={disponivel || undefined}
                      value={item.pesoUsado}
                      onChange={(e) => updateItem(i, "pesoUsado", e.target.value)}
                      placeholder="Ex: 200"
                      disabled={!lote}
                    />
                  </Field>
                  {lote && pesoNum > 0 && (
                    <LoteItemSummary lote={lote} pesoUsado={pesoNum} tipos={tipos} fornecedores={fornecedores} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Localização do lote">
              <select className={inputCls} value={localizacao} onChange={(e) => setLocalizacao(e.target.value)}>
                {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              className={inputCls + " h-16 py-2"}
              value={observacoes}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Cliente, pedido, etc."
            />
          </Field>

          {pesoTotal > 0 && (
            <div className="rounded-md p-4 border border-primary/30 bg-primary/10 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5" /> Resumo do lote de expedição
              </div>
              <SummaryRow label="Lotes de origem" value={String(itensValidos.length)} />
              <SummaryRow label="Peso total" value={fmtKg(pesoTotal)} />
              <SummaryRow label="Custo total" value={fmtBRL(custoTotal)} />
              <SummaryRow label="Custo médio" value={`${fmtBRL(custoPorKg)}/kg`} />
            </div>
          )}

          <button
            type="submit"
            className={btnPrimary + " w-full"}
            disabled={itensValidos.length === 0 || saving}
          >
            <PackageSearch className="h-4 w-4" />
            {saving ? "Formando..." : "Formar lote de expedição"}
          </button>
        </form>

        <div className="space-y-4">
          {resultado && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-4">
              <div className="text-sm font-semibold text-success mb-1">Lote formado com sucesso!</div>
              <div className="text-xs text-muted-foreground">
                O novo lote de expedição está disponível no estoque para venda.
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-3">Lotes de expedição</h3>
            {expedicoes.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                Nenhum lote de expedição formado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {expedicoes.slice(0, 10).map((l) => {
                  const t = tipos.find((x) => x.id === l.tipoMaterialId);
                  return (
                    <div key={l.id} className="border rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{l.codigo}</span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t?.nome} · {fmtKg(l.pesoAtual)} · {fmtBRL(custoFinalKg(l))}/kg
                      </div>
                      {l.composicao.length > 0 && (
                        <div className="pt-1 space-y-0.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Composição ({l.composicao.length} origens)
                          </div>
                          {l.composicao.map((c) => {
                            const mat = tipos.find((x) => x.id === c.materialId);
                            const forn = fornecedores.find((x) => x.id === c.fornecedorId);
                            return (
                              <div key={c.id} className="flex justify-between text-[11px] text-muted-foreground">
                                <span>{c.origemLoteCodigo}{forn ? ` · ${forn.nome}` : ""}{mat ? ` · ${mat.nome}` : ""}</span>
                                <span>{fmtKg(c.pesoUsado)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function LoteItemSummary({
  lote,
  pesoUsado,
  tipos,
  fornecedores,
}: {
  lote: Lote;
  pesoUsado: number;
  tipos: TipoMaterial[];
  fornecedores: Fornecedor[];
}) {
  const t = tipos.find((x) => x.id === lote.tipoMaterialId);
  const f = fornecedores.find((x) => x.id === lote.fornecedorId);
  const custo = custoFinalKg(lote) * pesoUsado;
  return (
    <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground bg-background rounded p-2">
      <div><span className="font-medium">{t?.nome ?? "—"}</span></div>
      <div>{f ? f.nome : <em>Sem fornecedor</em>}</div>
      <div className="text-right font-medium">{fmtBRL(custo)}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
