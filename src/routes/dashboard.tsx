import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatCard, LoteCard } from "@/components/ui-bits";
import { useStore, fmtBRL, fmtKg } from "@/lib/store";
import { Boxes, DollarSign, TrendingUp, AlertTriangle, Scale, Percent } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { lotes, tipos } = useStore((s) => ({ lotes: s.lotes, tipos: s.tipos }));

  const emEstoque = lotes.filter((l) => l.status !== "vendido");
  const pesoTotal = emEstoque.reduce((a, l) => a + l.pesoAtual, 0);
  const valorEstoque = emEstoque.reduce((a, l) => a + l.pesoAtual * l.custoUnitario, 0);
  const custoMedio = pesoTotal > 0 ? valorEstoque / pesoTotal : 0;

  const vendidos = lotes.filter((l) => l.status === "vendido");
  const receita = vendidos.reduce((a, l) => a + l.pesoAtual * (l.precoVenda ?? 0), 0);
  const custoVendido = vendidos.reduce((a, l) => a + l.pesoAtual * l.custoUnitario, 0);
  const margem = receita - custoVendido;
  const margemPct = receita > 0 ? (margem / receita) * 100 : 0;

  // Perda no beneficiamento
  const perdaKg = lotes.reduce((a, l) => a + (l.pesoEntrada - l.pesoAtual), 0);
  const perdaPct = lotes.reduce((a, l) => a + l.pesoEntrada, 0) > 0
    ? (perdaKg / lotes.reduce((a, l) => a + l.pesoEntrada, 0)) * 100
    : 0;

  // Materiais parados (>14 dias em estoque)
  const agora = Date.now();
  const parados = emEstoque.filter(
    (l) => agora - new Date(l.dataEntrada).getTime() > 14 * 86400000
  );

  // Estoque por tipo
  const porTipo = tipos.map((t) => {
    const lotesT = emEstoque.filter((l) => l.tipoMaterialId === t.id);
    return {
      nome: t.nome.replace("Alumínio ", ""),
      peso: lotesT.reduce((a, l) => a + l.pesoAtual, 0),
      lotes: lotesT.length,
    };
  });

  const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Visão geral em tempo real do pátio"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Estoque total"
          value={fmtKg(pesoTotal)}
          hint={`${emEstoque.length} lotes`}
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label="Valor em estoque"
          value={fmtBRL(valorEstoque)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Custo médio"
          value={`${fmtBRL(custoMedio)}/kg`}
          icon={Scale}
        />
        <StatCard
          label="Margem estimada"
          value={fmtBRL(margem)}
          hint={`${margemPct.toFixed(1)}% sobre receita`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Perda no beneficiamento"
          value={fmtKg(perdaKg)}
          hint={`${perdaPct.toFixed(1)}% do peso de entrada`}
          icon={Percent}
          tone="warning"
        />
        <StatCard
          label="Materiais parados"
          value={String(parados.length)}
          hint="Lotes há mais de 14 dias"
          icon={AlertTriangle}
          tone={parados.length > 0 ? "destructive" : "default"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-4">Estoque por tipo de material (kg)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={porTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="peso" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-4">Distribuição (lotes)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={porTipo.filter((p) => p.lotes > 0)}
                  dataKey="lotes"
                  nameKey="nome"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {porTipo.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Lotes recentes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {lotes.slice(0, 8).map((l) => (
            <LoteCard
              key={l.id}
              lote={l}
              tipo={tipos.find((t) => t.id === l.tipoMaterialId)}
              fornecedor={undefined}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
