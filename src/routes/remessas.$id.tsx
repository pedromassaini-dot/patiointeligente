import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui-bits";
import { useStore, actions, fmtBRL, fmtKg, fmtDate, type StatusRemessa } from "@/lib/store";
import { useMemo, useState } from "react";
import { Save, Trash2, Lock, PackagePlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/remessas/$id")({
  component: RemessaDetalhePage,
});

const STATUS_LABEL: Record<StatusRemessa, string> = {
  aberta: "Aberta",
  em_industrializacao: "Em Industrialização",
  retornada: "Retornada",
  encerrada: "Encerrada",
};
const STATUS_CLS: Record<StatusRemessa, string> = {
  aberta: "bg-muted text-muted-foreground border-border",
  em_industrializacao: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  retornada: "bg-success/15 text-success border-success/30",
  encerrada: "bg-muted text-muted-foreground border-border opacity-70",
};

function RemessaDetalhePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { remessa, industrializador, lotes, tipos, user, localizacoes } = useStore((s) => {
    const r = s.remessas.find((x) => x.id === id);
    return {
      remessa: r,
      industrializador: r ? s.industrializadores.find((i) => i.id === r.industrializadorId) : undefined,
      lotes: s.lotes,
      tipos: s.tipos,
      user: s.user,
      localizacoes: s.localizacoes,
    };
  });

  if (!remessa) {
    return (
      <AppLayout>
        <PageHeader title="Remessa não encontrada" />
        <Link to="/remessas" className={btnSecondary}>Voltar</Link>
      </AppLayout>
    );
  }

  const isGestor = user?.role === "gestor";
  const podeRetornar = remessa.status === "em_industrializacao" || remessa.status === "aberta";

  const custoLotes = remessa.lotesEnviados.reduce((a, l) => a + l.custoProporcional, 0);
  const custoTotal = custoLotes + remessa.custoIndustrializacao + remessa.freteIda + remessa.freteVolta + remessa.outrosCustos;
  const pesoEnviado = remessa.lotesEnviados.reduce((a, l) => a + l.pesoEnviado, 0);
  const pesoRetornado = remessa.retornos.reduce((a, r) => a + r.pesoRetornado, 0);
  const pesoAproveitavel = remessa.retornos.filter((r) => r.aproveitavel).reduce((a, r) => a + r.pesoRetornado, 0);
  const perdaTotal = Math.max(0, pesoEnviado - pesoRetornado);

  return (
    <AppLayout>
      <PageHeader
        title={remessa.codigo}
        description={`${industrializador?.nome ?? "—"} · Enviada em ${fmtDate(remessa.dataEnvio)}${remessa.dataRetorno ? ` · Retornada em ${fmtDate(remessa.dataRetorno)}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-md border font-medium ${STATUS_CLS[remessa.status]}`}>
              {STATUS_LABEL[remessa.status]}
            </span>
            {isGestor && remessa.status === "retornada" && (
              <button
                className={btnSecondary}
                onClick={async () => {
                  if (!confirm("Encerrar esta remessa?")) return;
                  try { await actions.encerrarRemessa(remessa.id); toast.success("Remessa encerrada"); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                }}
              >
                <Lock className="h-4 w-4" /> Encerrar
              </button>
            )}
            {isGestor && remessa.retornos.length === 0 && (
              <button
                className={btnSecondary + " text-destructive"}
                onClick={async () => {
                  if (!confirm("Excluir esta remessa? Os lotes voltarão ao estoque.")) return;
                  try { await actions.deleteRemessa(remessa.id); toast.success("Remessa excluída"); navigate({ to: "/remessas" }); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                }}
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Lotes enviados */}
          <section className="bg-card rounded-xl border p-4 md:p-6">
            <h2 className="font-semibold mb-3">Lotes enviados ({remessa.lotesEnviados.length})</h2>
            <div className="divide-y">
              {remessa.lotesEnviados.map((e) => {
                const l = lotes.find((x) => x.id === e.loteId);
                const t = l ? tipos.find((x) => x.id === l.tipoMaterialId) : undefined;
                return (
                  <div key={e.id} className="py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {l ? <Link to="/lote/$id" params={{ id: l.id }} className="hover:underline">{e.loteCodigo}</Link> : e.loteCodigo}
                        {t && <span className="text-muted-foreground ml-1 font-normal">· {t.nome}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{fmtKg(e.pesoEnviado)} enviados</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{fmtBRL(e.custoProporcional)}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Custos */}
          <CustosRemessa remessa={remessa} canEdit={isGestor} />

          {/* Retornos */}
          {remessa.retornos.length > 0 && (
            <section className="bg-card rounded-xl border p-4 md:p-6">
              <h2 className="font-semibold mb-3">Produtos retornados</h2>
              <div className="divide-y">
                {remessa.retornos.map((r) => {
                  const lote = r.loteGeradoId ? lotes.find((l) => l.id === r.loteGeradoId) : undefined;
                  return (
                    <div key={r.id} className="py-3 flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full ${r.aproveitavel ? "bg-success" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {r.descricao}
                          {!r.aproveitavel && <span className="ml-2 text-xs text-muted-foreground">(não aproveitável)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtKg(r.pesoRetornado)} · custo {fmtBRL(r.custoUnitarioCalculado)}/kg
                          {lote && <> · lote gerado: <Link to="/lote/$id" params={{ id: lote.id }} className="hover:underline font-medium">{lote.codigo}</Link></>}
                        </div>
                        {r.observacoes && <div className="text-xs text-muted-foreground italic mt-0.5">{r.observacoes}</div>}
                      </div>
                      <div className="text-sm font-semibold tabular-nums text-right">
                        {fmtBRL(r.custoUnitarioCalculado * r.pesoRetornado)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Form de retorno */}
          {podeRetornar && (
            <FormRetorno remessaId={remessa.id} custoTotalRemessa={custoTotal} pesoEnviado={pesoEnviado} tipos={tipos} localizacoes={localizacoes.map((l) => l.nome)} />
          )}
        </div>

        <aside className="space-y-3">
          <div className="bg-card rounded-xl border p-4 md:p-6 sticky top-20 space-y-2">
            <h2 className="font-semibold">Resumo financeiro</h2>
            <Row label="Custo dos lotes" value={fmtBRL(custoLotes)} />
            <Row label="Industrialização" value={fmtBRL(remessa.custoIndustrializacao)} />
            <Row label="Frete ida" value={fmtBRL(remessa.freteIda)} />
            <Row label="Frete volta" value={fmtBRL(remessa.freteVolta)} />
            <Row label="Outros" value={fmtBRL(remessa.outrosCustos)} />
            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
              <span>Custo total</span>
              <span>{fmtBRL(custoTotal)}</span>
            </div>
            <div className="border-t pt-2 space-y-1">
              <Row label="Peso enviado" value={fmtKg(pesoEnviado)} />
              {remessa.retornos.length > 0 && (
                <>
                  <Row label="Peso retornado" value={fmtKg(pesoRetornado)} />
                  <Row label="Aproveitável" value={fmtKg(pesoAproveitavel)} />
                  <Row label="Perda total" value={fmtKg(perdaTotal)} />
                  {pesoAproveitavel > 0 && (
                    <div className="bg-primary/10 rounded-md p-2 mt-2 text-xs">
                      <div className="text-muted-foreground">Novo custo unitário</div>
                      <div className="font-semibold text-sm">{fmtBRL(custoTotal / pesoAproveitavel)}/kg</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
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

function CustosRemessa({ remessa, canEdit }: { remessa: ReturnType<typeof useStore<{ remessas: import("@/lib/store").Remessa[] }>>["remessas"][number]; canEdit: boolean }) {
  const [edit, setEdit] = useState(false);
  const [custoInd, setCustoInd] = useState(String(remessa.custoIndustrializacao));
  const [freteIda, setFreteIda] = useState(String(remessa.freteIda));
  const [freteVolta, setFreteVolta] = useState(String(remessa.freteVolta));
  const [outros, setOutros] = useState(String(remessa.outrosCustos));
  const [obs, setObs] = useState(remessa.observacoes);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await actions.editarCustosRemessa(remessa.id, {
        custoIndustrializacao: parseFloat(custoInd) || 0,
        freteIda: parseFloat(freteIda) || 0,
        freteVolta: parseFloat(freteVolta) || 0,
        outrosCustos: parseFloat(outros) || 0,
        observacoes: obs,
      });
      toast.success("Custos atualizados");
      setEdit(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card rounded-xl border p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Custos da industrialização</h2>
        {canEdit && remessa.status !== "encerrada" && !edit && (
          <button className={btnSecondary + " h-8 text-xs"} onClick={() => setEdit(true)}>Editar</button>
        )}
      </div>
      {edit ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Industrialização"><input type="number" step="0.01" className={inputCls} value={custoInd} onChange={(e) => setCustoInd(e.target.value)} /></Field>
            <Field label="Frete ida"><input type="number" step="0.01" className={inputCls} value={freteIda} onChange={(e) => setFreteIda(e.target.value)} /></Field>
            <Field label="Frete volta"><input type="number" step="0.01" className={inputCls} value={freteVolta} onChange={(e) => setFreteVolta(e.target.value)} /></Field>
            <Field label="Outros"><input type="number" step="0.01" className={inputCls} value={outros} onChange={(e) => setOutros(e.target.value)} /></Field>
          </div>
          <Field label="Observações">
            <textarea className={inputCls + " min-h-[64px] py-2"} value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className={btnPrimary}><Save className="h-4 w-4" /> Salvar</button>
            <button onClick={() => setEdit(false)} className={btnSecondary}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <Row label="Industrialização" value={fmtBRL(remessa.custoIndustrializacao)} />
          <Row label="Frete ida" value={fmtBRL(remessa.freteIda)} />
          <Row label="Frete volta" value={fmtBRL(remessa.freteVolta)} />
          <Row label="Outros" value={fmtBRL(remessa.outrosCustos)} />
          {remessa.observacoes && (
            <div className="sm:col-span-2 text-xs text-muted-foreground italic border-t pt-2">{remessa.observacoes}</div>
          )}
        </div>
      )}
    </section>
  );
}

type RetItem = { materialId: string; descricao: string; peso: string; aproveitavel: boolean; localizacao: string; observacoes: string };

function FormRetorno({
  remessaId,
  custoTotalRemessa,
  pesoEnviado,
  tipos,
  localizacoes,
}: {
  remessaId: string;
  custoTotalRemessa: number;
  pesoEnviado: number;
  tipos: { id: string; nome: string }[];
  localizacoes: string[];
}) {
  const [itens, setItens] = useState<RetItem[]>([
    { materialId: "", descricao: "", peso: "", aproveitavel: true, localizacao: localizacoes[0] ?? "Galpão", observacoes: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: Partial<RetItem>) => {
    setItens((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  };
  const add = () => setItens((arr) => [...arr, { materialId: "", descricao: "", peso: "", aproveitavel: true, localizacao: localizacoes[0] ?? "Galpão", observacoes: "" }]);
  const remove = (i: number) => setItens((arr) => arr.filter((_, j) => j !== i));

  const pesoAprov = itens.filter((i) => i.aproveitavel).reduce((a, i) => a + (parseFloat(i.peso) || 0), 0);
  const novoCustoUnit = pesoAprov > 0 ? custoTotalRemessa / pesoAprov : 0;
  const pesoTotalRet = itens.reduce((a, i) => a + (parseFloat(i.peso) || 0), 0);

  const submit = async () => {
    const validos = itens
      .filter((i) => (parseFloat(i.peso) || 0) > 0 && i.descricao.trim())
      .map((i) => ({
        materialId: i.materialId || null,
        descricao: i.descricao.trim(),
        pesoRetornado: parseFloat(i.peso) || 0,
        aproveitavel: i.aproveitavel,
        localizacao: i.localizacao,
        observacoes: i.observacoes,
      }));
    if (!validos.length) { toast.error("Adicione ao menos um produto retornado válido"); return; }
    if (pesoTotalRet > pesoEnviado + 0.001) {
      if (!confirm(`Peso retornado (${fmtKg(pesoTotalRet)}) é maior que o enviado (${fmtKg(pesoEnviado)}). Continuar?`)) return;
    }
    setSaving(true);
    try {
      await actions.registrarRetornoRemessa(remessaId, validos);
      toast.success("Retorno registrado e lotes gerados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar retorno");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card rounded-xl border p-4 md:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Registrar retorno</h2>
        <button onClick={add} className={btnSecondary + " h-8 text-xs"}><PackagePlus className="h-3 w-3" /> Adicionar produto</button>
      </div>

      <div className="space-y-3">
        {itens.map((it, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Material (lote a gerar)">
                <select className={inputCls} value={it.materialId} onChange={(e) => update(i, { materialId: e.target.value })}>
                  <option value="">— Sem lote (apenas registrar)</option>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
              <Field label="Descrição *">
                <input className={inputCls} value={it.descricao} onChange={(e) => update(i, { descricao: e.target.value })} placeholder="Ex.: Lingote, Escória" />
              </Field>
              <Field label="Peso retornado (kg) *">
                <input type="number" step="0.1" min="0" className={inputCls} value={it.peso} onChange={(e) => update(i, { peso: e.target.value })} />
              </Field>
              <Field label="Localização">
                <input className={inputCls} value={it.localizacao} onChange={(e) => update(i, { localizacao: e.target.value })} list={`locs-${i}`} />
                <datalist id={`locs-${i}`}>{localizacoes.map((l) => <option key={l} value={l} />)}</datalist>
              </Field>
            </div>
            <Field label="Observações">
              <input className={inputCls} value={it.observacoes} onChange={(e) => update(i, { observacoes: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={it.aproveitavel} onChange={(e) => update(i, { aproveitavel: e.target.checked })} />
                Aproveitável (rateia o custo da remessa)
              </label>
              {itens.length > 1 && (
                <button onClick={() => remove(i)} className="text-xs text-destructive hover:underline">Remover</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {pesoAprov > 0 && (
        <div className="bg-primary/10 rounded-md p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Peso aproveitável</span>
            <span className="font-medium">{fmtKg(pesoAprov)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t mt-1 pt-1">
            <span>Novo custo unitário</span>
            <span>{fmtBRL(novoCustoUnit)}/kg</span>
          </div>
        </div>
      )}

      <button onClick={submit} disabled={saving} className={btnPrimary + " w-full"}>
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Registrar retorno e gerar lotes"}
      </button>
    </section>
  );
}
