import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui-bits";
import { useStore, actions, fmtBRL } from "@/lib/store";
import { useState, useRef } from "react";
import { Camera, X, Save, Archive } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/novo-estoque-inicial")({
  component: NovoEstoqueInicialPage,
});

const LOCALIZACOES_PADRAO = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "Doca"];

function NovoEstoqueInicialPage() {
  const navigate = useNavigate();
  const { tipos, localizacoes } = useStore((s) => ({
    tipos: s.tipos,
    localizacoes: s.localizacoes,
  }));

  const opcoesLoc = localizacoes.length > 0 ? localizacoes.map((l) => l.nome) : LOCALIZACOES_PADRAO;

  const [tipoId, setTipoId] = useState("");
  const [peso, setPeso] = useState("");
  const [custo, setCusto] = useState("");
  const [loc, setLoc] = useState(opcoesLoc[0] ?? "");
  const [dataRef, setDataRef] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pesoNum = parseFloat(peso);
  const custoNum = parseFloat(custo);
  const valorTotal = pesoNum > 0 && custoNum > 0 ? pesoNum * custoNum : 0;

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6 - fotos.length);
    setFotos((p) => [...p, ...arr]);
    setPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  };

  const removeFoto = (i: number) => {
    setFotos((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => {
      URL.revokeObjectURL(p[i]);
      return p.filter((_, j) => j !== i);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId) { toast.error("Selecione o tipo de material."); return; }
    if (!pesoNum || pesoNum <= 0) { toast.error("Informe o peso atual."); return; }
    if (!custoNum || custoNum <= 0) { toast.error("Informe o custo médio estimado por kg."); return; }
    if (!loc) { toast.error("Informe a localização no pátio."); return; }
    if (!dataRef) { toast.error("Informe a data de referência."); return; }

    setSaving(true);
    try {
      const lote = await actions.addEstoqueInicial({
        tipoMaterialId: tipoId,
        pesoAtual: pesoNum,
        custoEstimado: custoNum,
        localizacao: loc,
        dataReferencia: dataRef,
        fotos,
        observacoes: obs || undefined,
      });
      toast.success(`Estoque inicial ${lote.codigo} cadastrado!`);
      navigate({ to: "/lote/$id", params: { id: lote.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar estoque inicial");
    } finally {
      setSaving(false);
    }
  };

  if (tipos.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Estoque Inicial" description="Cadastrar material já existente no galpão" />
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground space-y-2">
          <p>É preciso cadastrar pelo menos um tipo de material antes de registrar estoque inicial.</p>
          <div className="flex justify-center gap-2 pt-2">
            <button className={btnSecondary} onClick={() => navigate({ to: "/tipos" })}>
              Cadastrar tipo
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Estoque Inicial"
        description="Cadastrar material já existente no galpão antes do início do sistema"
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-300/50 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800/40 p-4">
        <Archive className="h-5 w-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
        <div className="text-sm text-sky-800 dark:text-sky-300">
          <span className="font-semibold">Estoque Inicial</span> — use este formulário para registrar
          materiais que já estavam no galpão antes de começar a usar o sistema. Fornecedor não é
          obrigatório. O lote será marcado visualmente como "Estoque Inicial" e incluído nos totais de
          peso e valor do dashboard.
        </div>
      </div>

      <form onSubmit={submit} className="bg-card rounded-xl border p-4 md:p-6 max-w-3xl space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tipo de material *">
            <select
              className={inputCls}
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </Field>

          <Field label="Peso atual no galpão (kg) *">
            <input
              className={inputCls}
              type="number"
              step="0.1"
              min="0"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="Ex: 1200"
            />
          </Field>

          <Field label="Custo médio estimado (R$/kg) *">
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
              placeholder="Ex: 6.50"
            />
          </Field>

          <Field label="Localização no pátio *">
            <select className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)}>
              {opcoesLoc.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>

          <Field label="Data de referência *" hint="Data em que este material já estava no galpão">
            <input
              className={inputCls}
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
            />
          </Field>
        </div>

        {valorTotal > 0 && (
          <div className="rounded-md p-3 bg-sky-500/10 border border-sky-400/30 text-sm flex justify-between">
            <span className="text-muted-foreground">Valor total estimado</span>
            <span className="font-semibold">{fmtBRL(valorTotal)}</span>
          </div>
        )}

        <Field label="Observações">
          <textarea
            className={inputCls + " h-20 py-2"}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Condição do material, localização anterior, contaminação, etc."
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fotos do material (opcional)</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={btnSecondary + " h-9 text-xs"}
            >
              <Camera className="h-4 w-4" /> Adicionar foto
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
                    onClick={() => removeFoto(i)}
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
              Nenhuma foto adicionada (opcional)
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <button type="submit" disabled={saving} className={btnPrimary}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Cadastrar estoque inicial"}
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
