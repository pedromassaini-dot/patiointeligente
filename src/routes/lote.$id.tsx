import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatusBadge, inputCls, btnPrimary, btnSecondary, Field } from "@/components/ui-bits";
import { useStore, fmtBRL, fmtKg, fmtDateTime, actions, custoTotalCompra, custoFinalKg, perdaKg as perdaKgFn, perdaPercentual, margemEstimada } from "@/lib/store";
import { ArrowLeft, MapPin, Hammer, ShoppingCart, ImageOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/lote/$id")({
  component: LoteDetailPage,
});

const LOCALIZACOES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

function LoteDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lote, tipo, fornecedor } = useStore((s) => {
    const l = s.lotes.find((x) => x.id === id);
    return {
      lote: l,
      tipo: l ? s.tipos.find((t) => t.id === l.tipoMaterialId) : undefined,
      fornecedor: l ? s.fornecedores.find((f) => f.id === l.fornecedorId) : undefined,
    };
  });

  const [novaLoc, setNovaLoc] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");

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

  return (
    <AppLayout>
      <button
        onClick={() => navigate({ to: "/estoque" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Estoque
      </button>

      <PageHeader
        title={lote.codigo}
        description={`${tipo?.nome} · ${fornecedor?.nome}`}
        action={<StatusBadge status={lote.status} />}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Fotos */}
          <div className="bg-card rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-3">Fotos</h3>
            {lote.fotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {lote.fotos.map((src, i) => (
                  <div key={i} className="aspect-square rounded-md overflow-hidden border bg-muted">
                    <img src={src} alt={`foto ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-md flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">Sem fotos cadastradas</span>
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="bg-card rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-3">Histórico de movimentações</h3>
            <ol className="space-y-3">
              {lote.movimentacoes.slice().reverse().map((m) => (
                <li key={m.id} className="flex gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{m.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDateTime(m.data)} · {m.operador}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Resumo financeiro</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peso entrada</span>
              <span className="font-medium">{fmtKg(lote.pesoEntrada)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peso atual</span>
              <span className="font-medium">{fmtKg(lote.pesoAtual)}</span>
            </div>
            {perda > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Perda</span>
                <span className="font-medium text-warning-foreground">−{fmtKg(perda)} ({perdaPct.toFixed(1)}%)</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo compra</span>
              <span className="font-medium">{fmtBRL(lote.custoUnitario)}/kg · {fmtBRL(custoCompra)}</span>
            </div>
            {lote.custoBeneficiamento > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo beneficiamento</span>
                <span className="font-medium">{fmtBRL(lote.custoBeneficiamento)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custo final</span>
              <span className="font-medium">{fmtBRL(custoFinal)}/kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-medium">{fmtBRL(valorTotal)}</span>
            </div>
            {lote.precoVenda && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço venda</span>
                <span className="font-medium">{fmtBRL(lote.precoVenda)}/kg</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">
                {lote.precoVenda ? "Margem realizada" : "Margem estimada"}
              </span>
              <span className={`font-semibold ${margem >= 0 ? "text-success" : "text-destructive"}`}>
                {fmtBRL(margem)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Localização</span>
              <span className="font-medium">📍 {lote.localizacao}</span>
            </div>
          </div>

          {lote.status !== "vendido" && (
            <>
              <div className="bg-card rounded-xl border p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Movimentar
                </h3>
                <Field label="Nova localização">
                  <select className={inputCls} value={novaLoc} onChange={(e) => setNovaLoc(e.target.value)}>
                    <option value="">Selecione...</option>
                    {LOCALIZACOES.filter((l) => l !== lote.localizacao).map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </Field>
                <button
                  className={btnSecondary + " w-full"}
                  disabled={!novaLoc}
                  onClick={() => {
                    actions.movimentarLote(lote.id, novaLoc);
                    toast.success("Lote movimentado");
                    setNovaLoc("");
                  }}
                >
                  Confirmar movimentação
                </button>
              </div>

              <div className="bg-card rounded-xl border p-4 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Hammer className="h-4 w-4" /> Beneficiamento
                </h3>
                <Link to="/beneficiamento" className={btnSecondary + " w-full"}>
                  Ir para beneficiamento
                </Link>
              </div>

              <div className="bg-card rounded-xl border p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Registrar venda
                </h3>
                <Field
                  label="Preço de venda (R$/kg)"
                  hint={tipo ? `Sugerido: R$ ${tipo.precoMedioVenda.toFixed(2)}` : undefined}
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
                <button
                  className={btnPrimary + " w-full"}
                  disabled={!precoVenda || parseFloat(precoVenda) <= 0}
                  onClick={() => {
                    actions.venderLote(lote.id, parseFloat(precoVenda));
                    toast.success("Venda registrada");
                    setPrecoVenda("");
                  }}
                >
                  Confirmar venda
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
