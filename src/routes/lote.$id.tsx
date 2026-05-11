import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge, inputCls, btnPrimary, btnSecondary, Field } from "@/components/ui-bits";
import {
  useStore,
  fmtBRL,
  fmtKg,
  fmtDate,
  fmtDateTime,
  actions,
  custoTotalCompra,
  custoFinalKg,
  perdaKg as perdaKgFn,
  perdaPercentual,
  margemEstimada,
} from "@/lib/store";
import {
  ArrowLeft,
  MapPin,
  Hammer,
  ShoppingCart,
  ImageOff,
  Camera,
  Pencil,
  X,
  Save,
  TrendingUp,
  ArrowRight,
  Truck,
  Tag,
  Scale,
  Package,
  CheckCircle2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/lote/$id")({
  component: LoteDetailPage,
});

const LOCALIZACOES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

type Tab = "movimentacoes" | "beneficiamentos" | "vendas";

function LoteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lote, tipo, fornecedor, tipos, fornecedores } = useStore((s) => {
    const l = s.lotes.find((x) => x.id === id);
    return {
      lote: l,
      tipo: l ? s.tipos.find((t) => t.id === l.tipoMaterialId) : undefined,
      fornecedor: l ? s.fornecedores.find((f) => f.id === l.fornecedorId) : undefined,
      tipos: s.tipos,
      fornecedores: s.fornecedores,
    };
  });

  const [tab, setTab] = useState<Tab>("movimentacoes");
  const [showMover, setShowMover] = useState(false);
  const [showBenef, setShowBenef] = useState(false);
  const [showVenda, setShowVenda] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [novaLoc, setNovaLoc] = useState("");
  const [pesoBenef, setPesoBenef] = useState("");
  const [custoBenef, setCustoBenef] = useState("");
  const [obsBenef, setObsBenef] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");

  const [editTipo, setEditTipo] = useState("");
  const [editForn, setEditForn] = useState("");
  const [editCusto, setEditCusto] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editObs, setEditObs] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!lote) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">
          Lote não encontrado.
          <div className="mt-4">
            <Link to="/estoque" className={btnSecondary}>Voltar ao estoque</Link>
          </div>
        </div>
      </AppLayout>
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
  const benefs = movs.filter((m) => m.tipo === "beneficiamento");
  const vendas = movs.filter((m) => m.tipo === "saida");

  const onFotos = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6);
    try {
      await actions.addFotos(lote.id, arr);
      toast.success(`${arr.length} foto(s) adicionada(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar fotos");
    }
  };

  const openEdit = () => {
    setEditTipo(lote.tipoMaterialId);
    setEditForn(lote.fornecedorId);
    setEditCusto(String(lote.custoUnitario));
    setEditLoc(lote.localizacao);
    setEditObs(lote.observacoes ?? "");
    setShowEdit(true);
  };

  return (
    <AppLayout>
      <button
        onClick={() => navigate({ to: "/estoque" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Estoque
      </button>

      {/* Cabeçalho com código em destaque */}
      <div className="bg-gradient-to-br from-primary/15 via-card to-card border rounded-2xl p-5 md:p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{lote.codigo}</h1>
              <StatusBadge status={lote.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {tipo?.nome ?? "—"}</span>
              <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {fornecedor?.nome ?? "—"}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lote.localizacao}</span>
              <span>Entrada: {fmtDate(lote.dataEntrada)}</span>
            </div>
          </div>
          <button onClick={openEdit} className={btnSecondary + " h-9 text-xs"}>
            <Pencil className="h-3.5 w-3.5" /> Editar lote
          </button>
        </div>

        {/* Métricas chave */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Metric icon={Package} label="Peso inicial" value={fmtKg(lote.pesoEntrada)} />
          <Metric icon={Scale} label="Peso atual" value={fmtKg(lote.pesoAtual)} accent />
          <Metric icon={ShoppingCart} label="Custo compra" value={`${fmtBRL(lote.custoUnitario)}/kg`} hint={fmtBRL(custoCompra)} />
          <Metric icon={CheckCircle2} label="Custo final" value={`${fmtBRL(custoFinal)}/kg`} hint={fmtBRL(valorTotal)} />
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => fileRef.current?.click()} className={btnSecondary}>
          <Camera className="h-4 w-4" /> Adicionar foto
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            onFotos(e.target.files);
            e.target.value = "";
          }}
        />
        {!vendido && (
          <>
            <button onClick={() => setShowMover((v) => !v)} className={btnSecondary}>
              <MapPin className="h-4 w-4" /> Movimentar lote
            </button>
            <button onClick={() => setShowBenef((v) => !v)} className={btnSecondary}>
              <Hammer className="h-4 w-4" /> Registrar beneficiamento
            </button>
            <button onClick={() => setShowVenda((v) => !v)} className={btnPrimary}>
              <ShoppingCart className="h-4 w-4" /> Registrar venda
            </button>
          </>
        )}
      </div>

      {/* Painéis ação inline */}
      {!vendido && showMover && (
        <ActionPanel title="Movimentar lote" onClose={() => setShowMover(false)}>
          <Field label="Nova localização">
            <select className={inputCls} value={novaLoc} onChange={(e) => setNovaLoc(e.target.value)}>
              <option value="">Selecione...</option>
              {LOCALIZACOES.filter((l) => l !== lote.localizacao).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
          <button
            className={btnPrimary + " w-full sm:w-auto"}
            disabled={!novaLoc}
            onClick={() => {
              actions.movimentarLote(lote.id, novaLoc);
              toast.success("Lote movimentado");
              setNovaLoc("");
              setShowMover(false);
            }}
          >
            Confirmar movimentação
          </button>
        </ActionPanel>
      )}

      {!vendido && showBenef && (
        <ActionPanel title="Registrar beneficiamento" onClose={() => setShowBenef(false)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Peso após beneficiamento (kg) *">
              <input
                className={inputCls}
                type="number"
                step="0.1"
                min="0"
                value={pesoBenef}
                onChange={(e) => setPesoBenef(e.target.value)}
                placeholder={`Atual: ${lote.pesoAtual.toFixed(1)}`}
              />
            </Field>
            <Field label="Custo do beneficiamento (R$)">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={custoBenef}
                onChange={(e) => setCustoBenef(e.target.value)}
                placeholder="Ex: 50.00"
              />
            </Field>
          </div>
          <Field label="Observações">
            <textarea
              className={inputCls + " h-16 py-2"}
              value={obsBenef}
              onChange={(e) => setObsBenef(e.target.value)}
            />
          </Field>
          <button
            className={btnPrimary + " w-full sm:w-auto"}
            onClick={() => {
              const p = parseFloat(pesoBenef);
              const c = parseFloat(custoBenef) || 0;
              if (!p || p <= 0 || p > lote.pesoAtual) {
                toast.error("Peso inválido (deve ser ≤ peso atual).");
                return;
              }
              actions.beneficiarLote(lote.id, p, c, obsBenef);
              toast.success("Beneficiamento registrado");
              setPesoBenef("");
              setCustoBenef("");
              setObsBenef("");
              setShowBenef(false);
            }}
          >
            Confirmar beneficiamento
          </button>
        </ActionPanel>
      )}

      {!vendido && showVenda && (
        <ActionPanel title="Registrar venda" onClose={() => setShowVenda(false)}>
          <Field
            label="Preço de venda (R$/kg) *"
            hint={tipo?.precoMedioVenda ? `Sugerido: R$ ${tipo.precoMedioVenda.toFixed(2)}` : undefined}
          >
            <input
              className={inputCls}
              type="number"
              step="0.01"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              placeholder="Ex: 11.50"
            />
          </Field>
          {parseFloat(precoVenda) > 0 && (
            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <Row label="Receita" value={fmtBRL(lote.pesoAtual * parseFloat(precoVenda))} />
              <Row label="Custo proporcional" value={fmtBRL(lote.pesoAtual * custoFinal)} />
              <Row
                label="Margem"
                value={fmtBRL(lote.pesoAtual * (parseFloat(precoVenda) - custoFinal))}
                tone={parseFloat(precoVenda) >= custoFinal ? "success" : "destructive"}
              />
            </div>
          )}
          <button
            className={btnPrimary + " w-full sm:w-auto"}
            disabled={!precoVenda || parseFloat(precoVenda) <= 0}
            onClick={() => {
              actions.venderLote(lote.id, parseFloat(precoVenda));
              toast.success("Venda registrada");
              setPrecoVenda("");
              setShowVenda(false);
            }}
          >
            Confirmar venda
          </button>
        </ActionPanel>
      )}

      {showEdit && (
        <ActionPanel title="Editar lote" onClose={() => setShowEdit(false)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tipo de material">
              <select className={inputCls} value={editTipo} onChange={(e) => setEditTipo(e.target.value)}>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor">
              <select className={inputCls} value={editForn} onChange={(e) => setEditForn(e.target.value)}>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
            <Field label="Custo unitário (R$/kg)">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                value={editCusto}
                onChange={(e) => setEditCusto(e.target.value)}
              />
            </Field>
            <Field label="Localização">
              <select className={inputCls} value={editLoc} onChange={(e) => setEditLoc(e.target.value)}>
                {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Observações">
            <textarea
              className={inputCls + " h-20 py-2"}
              value={editObs}
              onChange={(e) => setEditObs(e.target.value)}
            />
          </Field>
          <button
            className={btnPrimary + " w-full sm:w-auto"}
            onClick={() => {
              actions.editLote(lote.id, {
                tipoMaterialId: editTipo,
                fornecedorId: editForn,
                custoUnitario: parseFloat(editCusto) || lote.custoUnitario,
                localizacao: editLoc,
                observacoes: editObs,
              });
              toast.success("Lote atualizado");
              setShowEdit(false);
            }}
          >
            <Save className="h-4 w-4" /> Salvar alterações
          </button>
        </ActionPanel>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Fotos */}
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Fotos do material</h3>
              <span className="text-xs text-muted-foreground">{lote.fotos.length} foto(s)</span>
            </div>
            {lote.fotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {lote.fotos.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border bg-muted group">
                    <button onClick={() => setLightbox(src)} className="block w-full h-full">
                      <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => actions.removeFoto(lote.id, i)}
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
                className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground gap-2 hover:bg-muted/70 transition"
              >
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">Toque para adicionar a primeira foto</span>
              </button>
            )}
          </div>

          {/* Histórico (abas) */}
          <div className="bg-card rounded-xl border p-4">
            <div className="flex gap-1 border-b mb-3 -mx-4 px-4 overflow-x-auto">
              <TabBtn active={tab === "movimentacoes"} onClick={() => setTab("movimentacoes")}>
                Movimentações ({movs.length})
              </TabBtn>
              <TabBtn active={tab === "beneficiamentos"} onClick={() => setTab("beneficiamentos")}>
                Beneficiamentos ({benefs.length})
              </TabBtn>
              <TabBtn active={tab === "vendas"} onClick={() => setTab("vendas")}>
                Vendas ({vendas.length})
              </TabBtn>
            </div>
            <div>
              {tab === "movimentacoes" && <Timeline items={movs} empty="Nenhuma movimentação." />}
              {tab === "beneficiamentos" && <Timeline items={benefs} empty="Nenhum beneficiamento registrado." />}
              {tab === "vendas" && <Timeline items={vendas} empty="Nenhuma venda registrada." />}
            </div>
          </div>

          {/* Observações */}
          <div className="bg-card rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-2">Observações</h3>
            {lote.observacoes ? (
              <p className="text-sm whitespace-pre-wrap">{lote.observacoes}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma observação registrada.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Resumo financeiro */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Resumo financeiro
            </h3>
            <Row label="Peso entrada" value={fmtKg(lote.pesoEntrada)} />
            <Row label="Peso atual" value={fmtKg(lote.pesoAtual)} />
            {perda > 0 && (
              <Row
                label="Perda"
                value={`−${fmtKg(perda)} (${perdaPct.toFixed(1)}%)`}
                tone="warning"
              />
            )}
            <div className="border-t pt-2" />
            <Row label="Custo compra" value={`${fmtBRL(lote.custoUnitario)}/kg`} hint={fmtBRL(custoCompra)} />
            {lote.custoBeneficiamento > 0 && (
              <Row label="Custo benef." value={fmtBRL(lote.custoBeneficiamento)} />
            )}
            <Row label="Custo final" value={`${fmtBRL(custoFinal)}/kg`} hint={fmtBRL(valorTotal)} />
            {lote.precoVenda && <Row label="Preço venda" value={`${fmtBRL(lote.precoVenda)}/kg`} />}
            <div className="border-t pt-2" />
            <Row
              label={lote.precoVenda ? "Margem realizada" : "Margem estimada"}
              value={fmtBRL(margem)}
              tone={margem >= 0 ? "success" : "destructive"}
              strong
            />
          </div>

          {/* Localização e status */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Status & localização</h3>
            <Row label="Status" value={<StatusBadge status={lote.status} />} />
            <Row label="Localização" value={`📍 ${lote.localizacao}`} />
            {lote.dataSaida && <Row label="Saída" value={fmtDate(lote.dataSaida)} />}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="foto ampliada" className="max-h-full max-w-full rounded-md" />
          <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </AppLayout>
  );
}

function Metric({
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
    <div className={`rounded-lg border p-3 ${accent ? "bg-primary/10 border-primary/30" : "bg-card"}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-lg font-bold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Row({
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
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${strong ? "font-bold" : "font-medium"} ${toneCls}`}>
        {value}
        {hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

function ActionPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="bg-card rounded-xl border p-4 mb-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onClose} className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Timeline({
  items,
  empty,
}: {
  items: { id: string; data: string; descricao: string; operador: string; tipo: string }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-6">{empty}</div>;
  }
  const tone = (t: string) =>
    t === "entrada"
      ? "bg-primary"
      : t === "beneficiamento"
      ? "bg-warning"
      : t === "saida"
      ? "bg-success"
      : "bg-muted-foreground";
  return (
    <ol className="space-y-3">
      {items.map((m) => (
        <li key={m.id} className="flex gap-3 text-sm">
          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${tone(m.tipo)}`} />
          <div className="flex-1">
            <div className="font-medium flex items-center gap-1">
              {m.descricao}
              {m.tipo === "movimentacao" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
            <div className="text-xs text-muted-foreground">
              {fmtDateTime(m.data)} · {m.operador}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
