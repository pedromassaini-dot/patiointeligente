import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui-bits";
import { useStore, actions, fmtBRL } from "@/lib/store";
import { useState, useRef } from "react";
import { Camera, X, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/novo-lote")({
  component: NovoLotePage,
});

const LOCALIZACOES_PADRAO = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

function NovoLotePage() {
  const navigate = useNavigate();
  const { tipos, fornecedores, localizacoes } = useStore((s) => ({
    tipos: s.tipos,
    fornecedores: s.fornecedores,
    localizacoes: s.localizacoes,
  }));

  const opcoesLoc = localizacoes.length > 0 ? localizacoes.map((l) => l.nome) : LOCALIZACOES_PADRAO;

  const [tipoId, setTipoId] = useState("");
  const [fornId, setFornId] = useState("");
  const [peso, setPeso] = useState("");
  const [custo, setCusto] = useState("");
  const [loc, setLoc] = useState(opcoesLoc[0] ?? "");
  const [obs, setObs] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tipoSel = tipos.find((t) => t.id === tipoId);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6 - fotos.length);
    setFotos((p) => [...p, ...arr]);
    setPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  };

  const remove = (i: number) => {
    setFotos((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => {
      URL.revokeObjectURL(p[i]);
      return p.filter((_, j) => j !== i);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(peso);
    const c = parseFloat(custo);
    if (!tipoId || !fornId || !p || p <= 0 || !c || c <= 0 || !loc) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const lote = await actions.addLote({
        tipoMaterialId: tipoId,
        fornecedorId: fornId,
        pesoEntrada: p,
        custoUnitario: c,
        localizacao: loc,
        fotos,
        observacoes: obs,
      });
      toast.success(`Lote ${lote.codigo} cadastrado!`);
      navigate({ to: "/lote/$id", params: { id: lote.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar lote");
    } finally {
      setSaving(false);
    }
  };

  if (tipos.length === 0 || fornecedores.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Novo Lote" description="Registrar entrada de material no pátio" />
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground space-y-2">
          <p>É preciso cadastrar pelo menos um tipo de material e um fornecedor antes de criar um lote.</p>
          <div className="flex justify-center gap-2 pt-2">
            <button className={btnSecondary} onClick={() => navigate({ to: "/tipos" })}>
              Cadastrar tipo
            </button>
            <button className={btnSecondary} onClick={() => navigate({ to: "/fornecedores" })}>
              Cadastrar fornecedor
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Novo Lote"
        description="Registrar entrada de material no pátio"
      />

      <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 max-w-3xl space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo de material *">
            <select
              className={inputCls}
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>

          <Field label="Fornecedor *">
            <select className={inputCls} value={fornId} onChange={(e) => setFornId(e.target.value)}>
              <option value="">Selecione...</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>

          <Field label="Peso de entrada (kg) *">
            <input
              className={inputCls}
              type="number"
              step="0.1"
              min="0"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="Ex: 450"
            />
          </Field>

          <Field
            label="Custo unitário (R$/kg) *"
            hint={tipoSel?.precoMedioCompra ? `Sugerido: R$ ${tipoSel.precoMedioCompra.toFixed(2)}` : undefined}
          >
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
              placeholder="Ex: 7.50"
            />
          </Field>

          <Field label="Localização no pátio *">
            <select className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)}>
              {opcoesLoc.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>

        {parseFloat(peso) > 0 && parseFloat(custo) > 0 && (
          <div className="rounded-md p-3 bg-primary/10 border border-primary/30 text-sm flex justify-between">
            <span className="text-muted-foreground">Custo total da compra</span>
            <span className="font-semibold">{fmtBRL(parseFloat(peso) * parseFloat(custo))}</span>
          </div>
        )}

        <Field label="Observações">
          <textarea
            className={inputCls + " h-20 py-2"}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Detalhes do material, condição, contaminação, etc."
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fotos do material</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={btnSecondary + " h-9 text-xs"}
            >
              <Camera className="h-4 w-4" /> Tirar / Enviar foto
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
          {previews.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                  <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground border border-dashed rounded-md p-6 text-center">
              Nenhuma foto adicionada (opcional, mas recomendado)
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <button type="submit" disabled={saving} className={btnPrimary}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Cadastrar lote"}
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => navigate({ to: "/estoque" })}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
