import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, btnPrimary } from "@/components/ui-bits";
import { useStore, fmtBRL, fmtKg, fmtDate, type StatusRemessa } from "@/lib/store";
import { Plus, Truck, ArrowRight } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/remessas/")({
  component: RemessasPage,
});

const STATUS_LABEL: Record<StatusRemessa, string> = {
  aberta: "Aberta",
  em_industrializacao: "Em Industrialização",
  retornada: "Retornada",
  encerrada: "Encerrada",
};

const STATUS_CLS: Record<StatusRemessa, string> = {
  aberta: "bg-muted text-muted-foreground border-border",
  em_industrializacao: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  retornada: "bg-success/15 text-success border-success/30",
  encerrada: "bg-muted text-muted-foreground border-border opacity-70",
};

function RemessasPage() {
  const { remessas, industrializadores } = useStore((s) => ({
    remessas: s.remessas,
    industrializadores: s.industrializadores,
  }));

  const indById = useMemo(() => new Map(industrializadores.map((i) => [i.id, i.nome])), [industrializadores]);

  return (
    <AppLayout>
      <PageHeader
        title="Remessas para Industrialização"
        description={`${remessas.length} remessa(s)`}
        action={
          <Link to="/remessas/nova" className={btnPrimary}>
            <Plus className="h-4 w-4" /> Nova remessa
          </Link>
        }
      />

      {remessas.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-sm text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhuma remessa registrada.
        </div>
      ) : (
        <div className="bg-card rounded-xl border divide-y">
          {remessas.map((r) => {
            const pesoTotal = r.lotesEnviados.reduce((a, l) => a + l.pesoEnviado, 0);
            const custoLotes = r.lotesEnviados.reduce((a, l) => a + l.custoProporcional, 0);
            const custoTotal = custoLotes + r.custoIndustrializacao + r.freteIda + r.freteVolta + r.outrosCustos;
            return (
              <Link
                key={r.id}
                to="/remessas/$id"
                params={{ id: r.id }}
                className="block p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.codigo}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${STATUS_CLS[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {indById.get(r.industrializadorId) ?? "—"} · enviada em {fmtDate(r.dataEnvio)}
                      {r.dataRetorno && <> · retornada em {fmtDate(r.dataRetorno)}</>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.lotesEnviados.length} lote(s) · {fmtKg(pesoTotal)} enviados
                      {r.retornos.length > 0 && <> · {r.retornos.length} produto(s) retornado(s)</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Custo total</div>
                    <div className="font-semibold">{fmtBRL(custoTotal)}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
