import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary } from "@/components/ui-bits";
import { useStore, actions, fmtKg } from "@/lib/store";
import { useEffect, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tipos")({
  component: TiposPage,
});

function TiposPage() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const { tipos, lotes } = useStore((s) => ({ tipos: s.tipos, lotes: s.lotes }));
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "gestor") {
      void navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  if (!user || user.role !== "gestor") {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome.");
    setSaving(true);
    try {
      await actions.addTipo({ nome: nome.trim(), categoria: categoria.trim() || undefined });
      toast.success("Material cadastrado");
      setNome("");
      setCategoria("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
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
        <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 mb-4 grid sm:grid-cols-2 gap-3">
          <Field label="Nome *">
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Alumínio Cabo"
            />
          </Field>
          <Field label="Categoria">
            <input
              className={inputCls}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Alumínio"
            />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {tipos.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground">
          Nenhum tipo de material cadastrado ainda.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tipos.map((t) => {
            const lotesT = lotes.filter((l) => l.tipoMaterialId === t.id && l.status !== "vendido");
            const peso = lotesT.reduce((a, l) => a + l.pesoAtual, 0);
            return (
              <div key={t.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-accent/20 text-accent-foreground flex items-center justify-center">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{t.nome}</div>
                    {t.categoria && (
                      <div className="text-xs text-muted-foreground">{t.categoria}</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  {lotesT.length} lote{lotesT.length !== 1 ? "s" : ""} em estoque · {fmtKg(peso)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
