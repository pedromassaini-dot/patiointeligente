import { Link } from "@tanstack/react-router";
import type { Lote, TipoMaterial, Fornecedor, StatusLote } from "@/lib/store";
import { fmtKg, fmtBRL, fmtDate } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ImageOff, Archive } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass = {
    default: "bg-card",
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/15",
    destructive: "bg-destructive/10",
  }[tone];
  const iconTone = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4", toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        {Icon && (
          <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", iconTone)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: StatusLote }) {
  const map: Record<StatusLote, string> = {
    estoque: "bg-success/15 text-success border-success/30",
    beneficiamento: "bg-warning/20 text-warning-foreground border-warning/40",
    vendido: "bg-muted text-muted-foreground border-border",
    vendido_parcial: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
    estoque_inicial: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300",
  };
  const label: Record<StatusLote, string> = {
    estoque: "Em estoque",
    beneficiamento: "Beneficiamento",
    vendido: "Vendido",
    vendido_parcial: "Venda parcial",
    estoque_inicial: "Estoque Inicial",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        map[status]
      )}
    >
      {label[status]}
    </span>
  );
}

export function LoteCard({
  lote,
  tipo,
  fornecedor,
  onClick,
}: {
  lote: Lote;
  tipo?: TipoMaterial;
  fornecedor?: Fornecedor;
  onClick?: () => void;
}) {
  const cls = "block bg-card rounded-xl border hover:border-primary hover:shadow-md transition-all overflow-hidden";

  const inner = (
    <>
      <div className="aspect-video bg-muted relative overflow-hidden">
        {lote.fotos[0] ? (
          <img src={lote.fotos[0].url} alt={lote.codigo} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {lote.isEstoqueInicial ? (
              <Archive className="h-8 w-8 text-sky-500/60" />
            ) : (
              <ImageOff className="h-8 w-8" />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={lote.status} />
        </div>
        {lote.isEstoqueInicial && (
          <div className="absolute bottom-0 left-0 right-0 bg-sky-600/80 text-white text-[10px] font-semibold text-center py-0.5 tracking-wide">
            ESTOQUE INICIAL
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{lote.codigo}</span>
          <span className="text-xs text-muted-foreground">📍 {lote.localizacao}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{tipo?.nome}</div>
        <div className="text-xs text-muted-foreground truncate">
          {lote.isEstoqueInicial ? (
            <span className="italic">Sem fornecedor (estoque inicial)</span>
          ) : (
            fornecedor?.nome
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold text-sm">{fmtKg(lote.pesoAtual)}</span>
          <span className="text-xs text-muted-foreground">{fmtBRL(lote.custoUnitario)}/kg</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {lote.isEstoqueInicial ? "Ref.: " : "Entrada: "}
          {fmtDate(lote.dataReferencia ?? lote.dataEntrada)}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "text-left w-full")}>
        {inner}
      </button>
    );
  }

  return (
    <Link to="/lote/$id" params={{ id: lote.id }} className={cls}>
      {inner}
    </Link>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition";

export const btnAccent =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition";
