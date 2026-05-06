import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary } from "@/components/ui-bits";
import { useStore, actions } from "@/lib/store";
import { useState } from "react";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/fornecedores")({
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const { fornecedores, lotes } = useStore((s) => ({ fornecedores: s.fornecedores, lotes: s.lotes }));
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [cidade, setCidade] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome.");
    actions.addFornecedor({ nome: nome.trim(), documento: doc.trim(), cidade: cidade.trim() });
    toast.success("Fornecedor cadastrado");
    setNome(""); setDoc(""); setCidade(""); setOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Fornecedores"
        description={`${fornecedores.length} fornecedores cadastrados`}
        action={
          <button onClick={() => setOpen((o) => !o)} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Novo fornecedor
          </button>
        }
      />

      {open && (
        <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 mb-4 grid sm:grid-cols-3 gap-3">
          <Field label="Nome *">
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="CNPJ / CPF">
            <input className={inputCls} value={doc} onChange={(e) => setDoc(e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input className={inputCls} value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Field>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" className={btnPrimary}>Salvar</button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fornecedores.map((f) => {
          const qt = lotes.filter((l) => l.fornecedorId === f.id).length;
          return (
            <div key={f.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{f.nome}</div>
                  <div className="text-xs text-muted-foreground">{f.documento || "—"}</div>
                  <div className="text-xs text-muted-foreground">📍 {f.cidade || "—"}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                {qt} lote{qt !== 1 ? "s" : ""} fornecido{qt !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
