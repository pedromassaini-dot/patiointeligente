import { useEffect, useMemo, useRef, useState } from "react";
import {
  useStore,
  actions,
  fmtBRL,
  fmtKg,
  fmtDate,
  fmtDateTime,
  custoTotalCompra,
  custoFinalKg,
  perdaKg as perdaKgFn,
  perdaPercentual,
  margemEstimada,
  type StatusLote,
} from "@/lib/store";
import { StatusBadge, inputCls, btnPrimary, btnSecondary, Field } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { X, Pencil, Trash2, Archive, Tag, Truck, MapPin, Package, Scale, ShoppingCart, CircleCheck as CheckCircle2, TrendingUp, Camera, ImageOff, ArrowRight, Save, History, Eye } from "lucide-react";
import { toast } from "sonner";

const LOCALIZACOES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

const STATUS_OPTIONS: { value: StatusLote; label: string }[] = [
  { value: "estoque", label: "Em estoque" },
  { value: "estoque_inicial", label: "Estoque Inicial" },
  { value: "beneficiamento", label: "Beneficiamento" },
  { value: "vendido_parcial", label: "Venda parcial" },
  { value: "vendido", label: "Vendido (total)" },
];

type DrawerTab = "info" | "historico" | "fotos";

export function LoteDrawer({
  loteId,
  onClose,
}: {
  loteId: string | null;
  onClose: () => void;
}) {
  const { lotes, tipos, fornecedores, userRole, allHistorico } = useStore((s) => ({
    lotes: s.lotes,
    tipos: s.tipos,
    fornecedores: s.fornecedores,
    userRole: s.user?.role,
    allHistorico: s.historico,
  }));

  const lote = useMemo(() => lotes.find((x) => x.id === loteId), [lotes, loteId]);
  const tipo = useMemo(() => lote ? tipos.find((t) => t.id === lote.tipoMaterialId) : undefined, [lote, tipos]);
  const fornecedor = useMemo(
    () => lote && lote.fornecedorId ? fornecedores.find((f) => f.id === lote.fornecedorId) : undefined,
    [lote, fornecedores]
  );
  const historico = useMemo(
    () => lote ? allHistorico.filter((h) => h.loteId === lote.id || h.loteCodigo === lote.codigo) : [],
    [lote, allHistorico]
  );
  const lotePai = useMemo(
    () => lote?.sublotePaiId ? lotes.find((x) => x.id === lote.sublotePaiId) : undefined,
    [lote, lotes]
  );
  const sublotesFilhos = useMemo(
    () => loteId ? lotes.filter((x) => x.sublotePaiId === loteId) : [],
    [lotes, loteId]
  );

  const isGestor = userRole === "gestor";
  const [tab, setTab] = useState<DrawerTab>("info");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // edit state
  const [editTipo, setEditTipo] = useState("");
  const [editForn, setEditForn] = useState("");
  const [editCusto, setEditCusto] = useState("");
  const [editPeso, setEditPeso] = useState("");
  const [editStatus, setEditStatus] = useState<StatusLote>("estoque");
  const [editLoc, setEditLoc] = useState("");
  const [editObs, setEditObs] = useState("");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Reset tab when lote changes
  useEffect(() => { setTab("info"); setShowEdit(false); }, [loteId]);

  if (!loteId) return null;

  if (!lote) {
    return (
      <DrawerShell onClose={onClose}>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Lote não encontrado.
        </div>
      </DrawerShell>
    );
  }

  const custoCompra = custoTotalCompra(lote);
  const custoFinal = custoFinalKg(lote);
  const valorTotal = lote.pesoAtual * custoFinal;
  const perda = perdaKgFn(lote);
  const perdaPct = perdaPercentual(lote);
  const precoRef = lote.precoVenda ?? tipo?.precoMedioVenda ?? 0;
  const margem = margemEstimada(lote.pesoAtual, precoRef, custoFinal);
  const vendido = lote.status === "vendido";

  const movs = lote.movimentacoes.slice().sort((a, b) => +new Date(b.data) - +new Date(a.data));

  const openEdit = () => {
    setEditTipo(lote.tipoMaterialId);
    setEditForn(lote.fornecedorId ?? "");
    setEditCusto(String(lote.custoUnitario));
    setEditPeso(String(lote.pesoEntrada));
    setEditStatus(lote.status);
    setEditLoc(lote.localizacao);
    setEditObs(lote.observacoes ?? "");
    setShowEdit(true);
  };

  const handleSave = async () => {
    const custo = parseFloat(editCusto);
    const peso = parseFloat(editPeso);
    if (!custo || custo <= 0) { toast.error("Custo inválido."); return; }
    if (!peso || peso <= 0) { toast.error("Peso inválido."); return; }
    setSaving(true);
    try {
      await actions.editLote(lote.id, {
        tipoMaterialId: editTipo,
        fornecedorId: editForn || null,
        custoUnitario: custo,
        peso,
        status: editStatus,
        localizacao: editLoc,
        observacoes: editObs,
      });
      toast.success("Lote atualizado.");
      setShowEdit(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Excluir o lote ${lote.codigo}? Esta ação não pode ser desfeita.`)) return;
    try {
      await actions.deleteLote(lote.id);
      toast.success(`Lote ${lote.codigo} excluído.`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  const onFotos = async (files: FileList | null) => {
    if (!files) return;
    try {
      await actions.addFotos(lote.id, Array.from(files).slice(0, 6));
      toast.success("Foto(s) adicionada(s).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar fotos");
    }
  };

  return (
    <DrawerShell onClose={onClose}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-extrabold tracking-tight">{lote.codigo}</span>
            <StatusBadge status={lote.status} />
            {lote.isEstoqueInicial && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700">
                <Archive className="h-3 w-3" /> Estoque Inicial
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {tipo?.nome ?? "—"}</span>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {lote.isEstoqueInicial ? <em>Sem fornecedor</em> : (fornecedor?.nome ?? "—")}
            </span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {lote.localizacao || "—"}</span>
            <span>
              {lote.isEstoqueInicial ? "Ref.: " : "Entrada: "}
              {fmtDate(lote.dataReferencia ?? lote.dataEntrada)}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="h-8 w-8 shrink-0 rounded-md hover:bg-muted flex items-center justify-center mt-0.5" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Role notice */}
      {!isGestor && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-muted bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Apenas gestores podem editar ou excluir lotes.
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pt-4">
        <MetricTile icon={Package} label="Peso inicial" value={fmtKg(lote.pesoEntrada)} />
        <MetricTile icon={Scale} label="Peso atual" value={fmtKg(lote.pesoAtual)} accent />
        <MetricTile icon={ShoppingCart} label="Custo/kg" value={fmtBRL(lote.custoUnitario)} hint={fmtBRL(custoCompra)} />
        <MetricTile icon={CheckCircle2} label="Valor total" value={fmtBRL(valorTotal)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mx-5 mt-4 overflow-x-auto">
        {(["info", "fotos", "historico"] as DrawerTab[]).map((t) => {
          const labels: Record<DrawerTab, string> = {
            info: "Detalhes",
            fotos: `Fotos (${lote.fotos.length})`,
            historico: `Histórico (${movs.length})`,
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {tab === "info" && !showEdit && (
          <>
            {/* Financial summary */}
            <section className="bg-muted/30 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
                <TrendingUp className="h-3.5 w-3.5" /> Resumo financeiro
              </h4>
              <InfoRow label="Peso entrada" value={fmtKg(lote.pesoEntrada)} />
              <InfoRow label="Peso atual" value={fmtKg(lote.pesoAtual)} />
              {perda > 0 && <InfoRow label="Perda" value={`−${fmtKg(perda)} (${perdaPct.toFixed(1)}%)`} tone="warning" />}
              <div className="border-t my-1" />
              <InfoRow label="Custo compra" value={`${fmtBRL(lote.custoUnitario)}/kg`} hint={fmtBRL(custoCompra)} />
              {lote.custoBeneficiamento > 0 && <InfoRow label="Custo benef." value={fmtBRL(lote.custoBeneficiamento)} />}
              <InfoRow label="Custo final" value={`${fmtBRL(custoFinalKg(lote))}/kg`} hint={fmtBRL(valorTotal)} />
              {lote.precoVenda && <InfoRow label="Preço venda" value={`${fmtBRL(lote.precoVenda)}/kg`} />}
              <div className="border-t my-1" />
              <InfoRow
                label={lote.precoVenda ? "Margem realizada" : "Margem estimada"}
                value={fmtBRL(margem)}
                tone={margem >= 0 ? "success" : "destructive"}
                strong
              />
            </section>

            {/* Status & location */}
            <section className="bg-muted/30 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Status & localização</h4>
              <InfoRow label="Status" value={<StatusBadge status={lote.status} />} />
              <InfoRow label="Localização" value={lote.localizacao || "—"} />
              {lote.dataSaida && <InfoRow label="Data saída" value={fmtDate(lote.dataSaida)} />}
            </section>

            {/* Observations */}
            {lote.observacoes && (
              <section className="bg-muted/30 rounded-xl p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Observações</h4>
                <p className="text-sm whitespace-pre-wrap">{lote.observacoes}</p>
              </section>
            )}

            {/* Traceability */}
            {(lotePai || sublotesFilhos.length > 0 || lote.composicao.length > 0) && (
              <section className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rastreabilidade</h4>
                {lotePai && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">LOTE PAI</div>
                    <div className="text-sm font-medium">{lotePai.codigo}
                      <span className="text-xs text-muted-foreground ml-2">
                        {tipos.find((t) => t.id === lotePai.tipoMaterialId)?.nome} · {fmtKg(lotePai.pesoAtual)}
                      </span>
                    </div>
                  </div>
                )}
                {sublotesFilhos.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">SUBLOTES GERADOS ({sublotesFilhos.length})</div>
                    {sublotesFilhos.map((s) => (
                      <div key={s.id} className="text-sm">
                        <span className="font-medium">{s.codigo}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {tipos.find((t) => t.id === s.tipoMaterialId)?.nome} · {fmtKg(s.pesoAtual)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {lote.composicao.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">COMPOSIÇÃO ({lote.composicao.length} origens)</div>
                    {lote.composicao.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="font-medium">{c.origemLoteCodigo}</span>
                        <span className="text-muted-foreground">{fmtKg(c.pesoUsado)} · {fmtBRL(c.custoProporcional)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {tab === "info" && showEdit && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Editar lote</h4>
              <button onClick={() => setShowEdit(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Material">
                <select className={inputCls} value={editTipo} onChange={(e) => setEditTipo(e.target.value)}>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
              <Field label="Fornecedor">
                <select className={inputCls} value={editForn} onChange={(e) => setEditForn(e.target.value)}>
                  <option value="">Sem fornecedor</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </Field>
              <Field label="Peso (kg)">
                <input className={inputCls} type="number" step="0.1" min="0.1" value={editPeso} onChange={(e) => setEditPeso(e.target.value)} />
              </Field>
              <Field label="Custo (R$/kg)">
                <input className={inputCls} type="number" step="0.01" min="0" value={editCusto} onChange={(e) => setEditCusto(e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={editStatus} onChange={(e) => setEditStatus(e.target.value as StatusLote)}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Localização">
                <select className={inputCls} value={editLoc} onChange={(e) => setEditLoc(e.target.value)}>
                  {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Observações">
              <textarea className={inputCls + " h-16 py-2"} value={editObs} onChange={(e) => setEditObs(e.target.value)} />
            </Field>
            {parseFloat(editPeso) > 0 && parseFloat(editCusto) > 0 && (
              <div className="rounded-md p-3 bg-primary/10 border border-primary/30 text-sm flex justify-between">
                <span className="text-muted-foreground">Valor estimado</span>
                <span className="font-semibold">{fmtBRL(parseFloat(editPeso) * parseFloat(editCusto))}</span>
              </div>
            )}
            <button className={btnPrimary + " w-full"} disabled={saving} onClick={handleSave}>
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </section>
        )}

        {tab === "fotos" && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Fotos ({lote.fotos.length})</span>
              <button onClick={() => fileRef.current?.click()} className={btnSecondary + " h-8 text-xs"}>
                <Camera className="h-3.5 w-3.5" /> Adicionar
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
                onChange={(e) => { onFotos(e.target.files); e.target.value = ""; }} />
            </div>
            {lote.fotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {lote.fotos.map((foto, i) => (
                  <div key={foto.id} className="relative aspect-square rounded-md overflow-hidden border bg-muted group">
                    <button onClick={() => setLightbox(foto.url)} className="block w-full h-full">
                      <img src={foto.url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => actions.removeFoto(lote.id, foto.id)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground gap-2 hover:bg-muted/70 transition text-xs"
              >
                <ImageOff className="h-7 w-7" />
                Toque para adicionar a primeira foto
              </button>
            )}
          </section>
        )}

        {tab === "historico" && (
          <section>
            {movs.length > 0 ? (
              <ol className="space-y-3">
                {movs.map((m) => {
                  const dotCls =
                    m.tipo === "entrada" ? "bg-primary" :
                    m.tipo === "beneficiamento" ? "bg-warning" :
                    m.tipo === "saida" ? "bg-success" : "bg-muted-foreground";
                  return (
                    <li key={m.id} className="flex gap-3 text-sm">
                      <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", dotCls)} />
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-1">
                          {m.descricao}
                          {m.tipo === "movimentacao" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{fmtDateTime(m.data)}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">Nenhuma movimentação registrada.</div>
            )}

            {historico.length > 0 && (
              <>
                <div className="border-t my-4" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Auditoria
                </h4>
                <ol className="space-y-3">
                  {historico.map((h) => {
                    const dotCls =
                      h.acao.startsWith("Exclus") ? "bg-destructive" :
                      h.acao.startsWith("Edi") ? "bg-warning" : "bg-primary";
                    return (
                      <li key={h.id} className="flex gap-3 text-sm">
                        <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", dotCls)} />
                        <div className="flex-1">
                          <div className="font-medium">{h.acao}</div>
                          <div className="text-xs text-muted-foreground">{fmtDateTime(h.criadoEm)} · {h.usuarioNome}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t px-5 py-4 flex flex-wrap gap-2 shrink-0 bg-card">
        {isGestor && !showEdit && (
          <>
            <button onClick={openEdit} className={btnSecondary + " flex-1 sm:flex-none"}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </>
        )}
        {isGestor && showEdit && (
          <button onClick={() => setShowEdit(false)} className={btnSecondary + " flex-1 sm:flex-none"}>
            Cancelar edição
          </button>
        )}
        <button onClick={onClose} className={btnSecondary + " ml-auto"}>
          Fechar
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto ampliada" className="max-h-full max-w-full rounded-md" />
          <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </DrawerShell>
  );
}

function DrawerShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col bg-card shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {children}
      </div>
    </>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-2.5", accent ? "bg-primary/10 border-primary/30" : "bg-muted/40")}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-base font-bold mt-0.5 leading-tight">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function InfoRow({
  label,
  value,
  hint,
  tone = "default",
  strong,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive";
  strong?: boolean;
}) {
  const toneCls = {
    default: "",
    success: "text-success",
    warning: "text-warning-foreground",
    destructive: "text-destructive",
  }[tone];
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right", strong ? "font-bold" : "font-medium", toneCls)}>
        {value}
        {hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

