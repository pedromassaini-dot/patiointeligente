import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui-bits";
import { useStore, actions } from "@/lib/store";
import { useState, useRef } from "react";
import { Camera, X, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/novo-lote")({
  component: NovoLotePage,
});

const LOCALIZACOES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

function NovoLotePage() {
  const navigate = useNavigate();
  const { tipos, fornecedores } = useStore((s) => ({
    tipos: s.tipos,
    fornecedores: s.fornecedores,
  }));

  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? "");
  const [fornId, setFornId] = useState(fornecedores[0]?.id ?? "");
  const [peso, setPeso] = useState("");
  const [custo, setCusto] = useState("");
  const [loc, setLoc] = useState(LOCALIZACOES[0]);
  const [obs, setObs] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const tipoSel = tipos.find((t) => t.id === tipoId);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr: string[] = [];
    for (const f of Array.from(files).slice(0, 5)) {
      const dataURL = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      });
      arr.push(dataURL);
    }
    setFotos((p) => [...p, ...arr].slice(0, 6));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(peso);
    const c = parseFloat(custo);
    if (!tipoId || !fornId || !p || p <= 0 || !c || c <= 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const lote = actions.addLote({
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
  };

  return (
    <AppLayout>
      <PageHeader
        title="Novo Lote"
        description="Registrar entrada de material no pátio"
      />

      <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 max-w-3xl space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo de material *">
            <select className={inputCls} value={tipoId} onChange={(e) => {
              setTipoId(e.target.value);
              const t = tipos.find((x) => x.id === e.target.value);
              if (t && !custo) setCusto(String(t.precoMedioCompra));
            }}>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>

          <Field label="Fornecedor *">
            <select className={inputCls} value={fornId} onChange={(e) => setFornId(e.target.value)}>
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
            hint={tipoSel ? `Sugerido: R$ ${tipoSel.precoMedioCompra.toFixed(2)}` : undefined}
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
              {LOCALIZACOES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>

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
          {fotos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {fotos.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                  <img src={src} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((p) => p.filter((_, j) => j !== i))}
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
          <button type="submit" className={btnPrimary}>
            <Save className="h-4 w-4" /> Cadastrar lote
          </button>
          <button type="button" className={btnSecondary} onClick={() => navigate({ to: "/estoque" })}>
            Cancelar
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
