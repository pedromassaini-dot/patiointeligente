import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui-bits";
import { useStore, actions, type Industrializador } from "@/lib/store";
import { useState } from "react";
import { Plus, Save, X, Factory } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/industrializadores")({
  component: IndustrializadoresPage,
});

function IndustrializadoresPage() {
  const { industrializadores, user } = useStore((s) => ({
    industrializadores: s.industrializadores,
    user: s.user,
  }));
  const isGestor = user?.role === "gestor";
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Industrializador | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Industrializadores"
        description="Fundições e prestadores de industrialização de terceiros"
        action={
          isGestor && (
            <button className={btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Novo industrializador
            </button>
          )
        }
      />

      {showForm && (
        <FormIndustrializador
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="bg-card rounded-xl border divide-y">
        {industrializadores.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum industrializador cadastrado.
          </div>
        )}
        {industrializadores.map((i) => (
          <div key={i.id} className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Factory className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{i.nome} {!i.ativo && <span className="text-xs text-muted-foreground">(inativo)</span>}</div>
              <div className="text-xs text-muted-foreground">
                {[i.cidade, i.cpfCnpj, i.telefone].filter(Boolean).join(" · ") || "—"}
              </div>
              {i.observacoes && <div className="text-xs text-muted-foreground mt-1 italic">{i.observacoes}</div>}
            </div>
            {isGestor && (
              <button
                className={btnSecondary + " h-8 text-xs"}
                onClick={() => { setEditing(i); setShowForm(true); }}
              >
                Editar
              </button>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

function FormIndustrializador({ initial, onClose }: { initial: Industrializador | null; onClose: () => void }) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(initial?.cpfCnpj ?? "");
  const [cidade, setCidade] = useState(initial?.cidade ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (initial) {
        await actions.updateIndustrializador(initial.id, { nome, cpfCnpj, cidade, telefone, observacoes, ativo });
      } else {
        await actions.addIndustrializador({ nome, cpfCnpj, cidade, telefone, observacoes });
      }
      toast.success("Salvo");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{initial ? "Editar" : "Novo"} industrializador</h2>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome *"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
        <Field label="CPF / CNPJ"><input className={inputCls} value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} /></Field>
        <Field label="Cidade"><input className={inputCls} value={cidade} onChange={(e) => setCidade(e.target.value)} /></Field>
        <Field label="Telefone"><input className={inputCls} value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Field>
      </div>
      <Field label="Observações">
        <textarea className={inputCls + " min-h-[64px] py-2"} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </Field>
      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
      )}
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
}
