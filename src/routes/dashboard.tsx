import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatCard, LoteCard } from "@/components/ui-bits";
import {
  useStore,
  fmtBRL,
  fmtKg,
  custoTotalCompra,
  custoFinalKg,
  perdaKg as perdaKgFn,
  perdaPercentual,
  margemEstimada,
} from "@/lib/store";
import { Boxes, DollarSign, TrendingUp, AlertTriangle, Scale, Percent, Clock } from "lucide-react";
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
  const { lotes, tipos, fornecedores } = useStore((s) => ({
    lotes: s.lotes,
    tipos: s.tipos,
    fornecedores: s.fornecedores,
  }));

  const emEstoque = lotes.filter((l) => l.status !== "vendido");

  // Peso total em estoque
  const pesoTotal = emEstoque.reduce((a, l) => a + l.pesoAtual, 0);

  // Valor total investido (custo de compra de todos os lotes em estoque)
  const valorInvestido = emEstoque.reduce((a, l) => a + custoTotalCompra(l) + (l.custoBeneficiamento || 0), 0);
  const custoMedio = pesoTotal > 0 ? valorInvestido / pesoTotal : 0;

  // Valor parado há mais de 30 dias
  const agora = Date.now();
  const parados30 = emEstoque.filter(
    (l) => agora - new Date(l.dataEntrada).getTime() > 30 * 86400000
  );
  const valorParado30 = parados30.reduce((a, l) => a + custoTotalCompra(l) + (l.custoBeneficiamento || 0), 0);

  // Margem estimada total (vendidos)
  const vendidos = lotes.filter((l) => l.status === "vendido");
  const margemTotal = vendidos.reduce(
    (a, l) => a + margemEstimada(l.pesoAtual, l.precoVenda ?? 0, custoFinalKg(l)),
    0
  );
  const receitaTotal = vendidos.reduce((a, l) => a + l.pesoAtual * (l.precoVenda ?? 0), 0);
  const margemPct = receitaTotal > 0 ? (margemTotal / receitaTotal) * 100 : 0;

  // Perda no beneficiamento
  const perdaTotalKg = lotes.reduce((a, l) => a + perdaKgFn(l), 0);
  const pesoEntradaTotal = lotes.reduce((a, l) => a + l.pesoEntrada, 0);
  const perdaPct = pesoEntradaTotal > 0 ? (perdaTotalKg / pesoEntradaTotal) * 100 : 0;

  // Perda média por fornecedor
  const perdaPorFornecedor = fornecedores
    .map((f) => {
      const ls = lotes.filter((l) => l.fornecedorId === f.id && l.pesoEntrada > 0);
      if (ls.length === 0) return null;
      const media = ls.reduce((a, l) => a + perdaPercentual(l), 0) / ls.length;
      return { nome: f.nome, perda: +media.toFixed(2) };
    })
    .filter((x): x is { nome: string; perda: number } => !!x);

  // Perda média por material
  const perdaPorMaterial = tipos
    .map((t) => {
      const ls = lotes.filter((l) => l.tipoMaterialId === t.id && l.pesoEntrada > 0);
      if (ls.length === 0) return null;
      const media = ls.reduce((a, l) => a + perdaPercentual(l), 0) / ls.length;
      return { nome: t.nome.replace("Alumínio ", ""), perda: +media.toFixed(2) };
    })
    .filter((x): x is { nome: string; perda: number } => !!x);

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
          label="Peso total em estoque"
          value={fmtKg(pesoTotal)}
          hint={`${emEstoque.length} lotes`}
          icon={Boxes}
          tone="primary"
        />
        <StatCard
          label="Valor total investido"
          value={fmtBRL(valorInvestido)}
          hint={`Custo médio ${fmtBRL(custoMedio)}/kg`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Parado há +30 dias"
          value={fmtBRL(valorParado30)}
          hint={`${parados30.length} lotes`}
          icon={Clock}
          tone={parados30.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Margem estimada total"
          value={fmtBRL(margemTotal)}
          hint={`${margemPct.toFixed(1)}% sobre receita`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Perda no beneficiamento"
          value={fmtKg(perdaTotalKg)}
          hint={`${perdaPct.toFixed(1)}% do peso de entrada`}
          icon={Percent}
          tone="warning"
        />
        <StatCard
          label="Lotes parados (>14d)"
          value={String(emEstoque.filter((l) => agora - new Date(l.dataEntrada).getTime() > 14 * 86400000).length)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-1">Perda média por fornecedor</h3>
          <p className="text-xs text-muted-foreground mb-3">Percentual médio de perda em beneficiamento</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={perdaPorFornecedor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit="%" />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={110} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="perda" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-1">Perda média por material</h3>
          <p className="text-xs text-muted-foreground mb-3">Percentual médio de perda em beneficiamento</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={perdaPorMaterial}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit="%" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="perda" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
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
                <Pie data={porTipo.filter((p) => p.lotes > 0)} dataKey="lotes" nameKey="nome" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Scale className="hidden" />

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
