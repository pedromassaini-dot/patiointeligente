import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui-bits";
import { useStore, actions, custoFinalKg, fmtBRL, fmtKg } from "@/lib/store";
import { useState, useMemo } from "react";
import { Save, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/remessas/nova")({
  component: NovaRemessaPage,
});

function NovaRemessaPage() {
  const navigate = useNavigate();
  const industrializadoresAll = useStore((s) => s.industrializadores);
  const lotes = useStore((s) => s.lotes);
  const tipos = useStore((s) => s.tipos);

  const industrializadores = useMemo(
    () => (industrializadoresAll ?? []).filter((i) => i.ativo),
    [industrializadoresAll]
  );

  const disponiveis = useMemo(
    () => (lotes ?? []).filter((l) => !l.consumido && l.pesoDisponivel > 0 && l.status !== "vendido" && l.status !== "vendido_parcial" && l.status !== "industrializacao"),
    [lotes]
  );

  const [industrializadorId, setIndustrializadorId] = useState("");
  const [dataEnvio, setDataEnvio] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [custoInd, setCustoInd] = useState("");
  const [freteIda, setFreteIda] = useState("");
  const [freteVolta, setFreteVolta] = useState("");
  const [outros, setOutros] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const lotesSel = disponiveis.filter((l) => selecionados.has(l.id));
  const pesoTotalEnv = lotesSel.reduce((a, l) => a + l.pesoDisponivel, 0);
  const custoTotalLotes = lotesSel.reduce((a, l) => a + custoFinalKg(l) * l.pesoDisponivel, 0);
  const custoExtra = (parseFloat(custoInd) || 0) + (parseFloat(freteIda) || 0) + (parseFloat(freteVolta) || 0) + (parseFloat(outros) || 0);
  const custoTotal = custoTotalLotes + custoExtra;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industrializadorId) { toast.error("Selecione um industrializador"); return; }
    if (selecionados.size === 0) { toast.error("Selecione ao menos um lote"); return; }
    setSaving(true);
    try {
      const id = await actions.criarRemessa({
        industrializadorId,
        dataEnvio,
        observacoes,
        custoIndustrializacao: parseFloat(custoInd) || 0,
        freteIda: parseFloat(freteIda) || 0,
        freteVolta: parseFloat(freteVolta) || 0,
        outrosCustos: parseFloat(outros) || 0,
        loteIds: Array.from(selecionados),
      });
      toast.success("Remessa criada e lotes enviados para industrialização");
      navigate({ to: "/remessas/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar remessa");
    } finally {
      setSaving(false);
    }
  };

  if (industrializadores.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Nova Remessa" />
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground space-y-3">
          <p>Cadastre ao menos um industrializador antes de criar uma remessa.</p>
          <Link to="/industrializadores" className={btnSecondary}>Cadastrar industrializador</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Nova Remessa para Industrialização" description="Envio de lotes para fundição em terceiros" />

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border p-4 md:p-6 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Industrializador *">
                <select className={inputCls} value={industrializadorId} onChange={(e) => setIndustrializadorId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {industrializadores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </Field>
              <Field label="Data de envio *">
                <input type="date" className={inputCls} value={dataEnvio} onChange={(e) => setDataEnvio(e.target.value)} />
              </Field>
            </div>
            <Field label="Observações">
              <textarea className={inputCls + " min-h-[64px] py-2"} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </Field>
          </div>

          <div className="bg-card rounded-xl border p-4 md:p-6">
            <h2 className="font-semibold mb-3">Lotes a enviar</h2>
            {disponiveis.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Nenhum lote disponível.</div>
            ) : (
              <div className="border rounded-md divide-y max-h-[480px] overflow-y-auto">
                {disponiveis.map((l) => {
                  const t = tipos.find((x) => x.id === l.tipoMaterialId);
                  const checked = selecionados.has(l.id);
                  const cFinal = custoFinalKg(l);
                  return (
                    <label key={l.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 ${checked ? "bg-primary/5" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(l.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{l.codigo} — {t?.nome ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtKg(l.pesoDisponivel)} · {fmtBRL(cFinal)}/kg · {l.localizacao}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {fmtBRL(cFinal * l.pesoDisponivel)}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border p-4 md:p-6 space-y-3">
            <h2 className="font-semibold">Custos da industrialização</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Industrialização (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={custoInd} onChange={(e) => setCustoInd(e.target.value)} />
              </Field>
              <Field label="Frete ida (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={freteIda} onChange={(e) => setFreteIda(e.target.value)} />
              </Field>
              <Field label="Frete volta (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={freteVolta} onChange={(e) => setFreteVolta(e.target.value)} />
              </Field>
              <Field label="Outros custos (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={outros} onChange={(e) => setOutros(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="bg-card rounded-xl border p-4 md:p-6 space-y-2 sticky top-20">
            <h2 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4" /> Resumo</h2>
            <Row label="Lotes selecionados" value={`${lotesSel.length}`} />
            <Row label="Peso total enviado" value={fmtKg(pesoTotalEnv)} />
            <Row label="Custo dos lotes" value={fmtBRL(custoTotalLotes)} />
            <Row label="Industrialização" value={fmtBRL(parseFloat(custoInd) || 0)} />
            <Row label="Frete ida + volta" value={fmtBRL((parseFloat(freteIda) || 0) + (parseFloat(freteVolta) || 0))} />
            <Row label="Outros" value={fmtBRL(parseFloat(outros) || 0)} />
            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
              <span>Custo total da remessa</span>
              <span>{fmtBRL(custoTotal)}</span>
            </div>
            <button type="submit" className={btnPrimary + " w-full mt-2"} disabled={saving || selecionados.size === 0 || !industrializadorId}>
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Criar remessa"}
            </button>
            <Link to="/remessas" className={btnSecondary + " w-full"}>Cancelar</Link>
          </div>
        </aside>
      </form>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
