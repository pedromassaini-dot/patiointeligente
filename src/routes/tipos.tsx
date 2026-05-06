import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary } from "@/components/ui-bits";
import { useStore, actions, fmtBRL, fmtKg } from "@/lib/store";
import { useState } from "react";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tipos")({
  component: TiposPage,
});

function TiposPage() {
  const { tipos, lotes } = useStore((s) => ({ tipos: s.tipos, lotes: s.lotes }));
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [pc, setPc] = useState("");
  const [pv, setPv] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseFloat(pc), v = parseFloat(pv);
    if (!nome.trim() || !c || !v) return toast.error("Preencha todos os campos.");
    actions.addTipo({ nome: nome.trim(), precoMedioCompra: c, precoMedioVenda: v });
    toast.success("Tipo cadastrado");
    setNome(""); setPc(""); setPv(""); setOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Tipos de Material"
        description={`${tipos.length} tipos cadastrados`}
        action={
          <button onClick={() => setOpen((o) => !o)} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Novo tipo
          </button>
        }
      />

      {open && (
        <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 mb-4 grid sm:grid-cols-3 gap-3">
          <Field label="Nome *">
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Alumínio Cabo" />
          </Field>
          <Field label="Preço médio compra (R$/kg) *">
            <input className={inputCls} type="number" step="0.01" value={pc} onChange={(e) => setPc(e.target.value)} />
          </Field>
          <Field label="Preço médio venda (R$/kg) *">
            <input className={inputCls} type="number" step="0.01" value={pv} onChange={(e) => setPv(e.target.value)} />
          </Field>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" className={btnPrimary}>Salvar</button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tipos.map((t) => {
          const lotesT = lotes.filter((l) => l.tipoMaterialId === t.id && l.status !== "vendido");
          const peso = lotesT.reduce((a, l) => a + l.pesoAtual, 0);
          const margem = t.precoMedioVenda - t.precoMedioCompra;
          return (
            <div key={t.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-accent/20 text-accent-foreground flex items-center justify-center">
                  <Tags className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{t.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {lotesT.length} lote{lotesT.length !== 1 ? "s" : ""} · {fmtKg(peso)}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Compra</div>
                  <div className="font-semibold">{fmtBRL(t.precoMedioCompra)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Venda</div>
                  <div className="font-semibold">{fmtBRL(t.precoMedioVenda)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Margem</div>
                  <div className="font-semibold text-success">{fmtBRL(margem)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
