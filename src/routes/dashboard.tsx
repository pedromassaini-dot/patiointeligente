import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatCard, LoteCard } from "@/components/ui-bits";
import { LoteDrawer } from "@/components/LoteDrawer";
import {
  useStore,
  fmtBRL,
  fmtKg,
  custoTotalCompra,
  custoFinalKg,
  perdaKg as perdaKgFn,
  perdaPercentual,
  margemEstimada,
  type Lote,
} from "@/lib/store";
import { Boxes, DollarSign, TrendingUp, TriangleAlert as AlertTriangle, Scale, Percent, Clock, Archive, GitFork, PackageSearch } from "lucide-react";
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
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { lotes, tipos, fornecedores } = useStore((s) => ({
    lotes: s.lotes,
    tipos: s.tipos,
    fornecedores: s.fornecedores,
  }));

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // emEstoque: available lots only — exclude consumed parents (split) and fully sold
  const emEstoque = lotes.filter((l) => !l.consumido && l.status !== "vendido" && l.status !== "vendido_parcial");
  const estoqueInicial = emEstoque.filter((l) => l.isEstoqueInicial);
  const lotesProprios = emEstoque.filter((l) => !l.isEstoqueInicial);

  // Peso total em estoque — use pesoDisponivel to reflect partial sales/consumption
  const pesoTotal = emEstoque.reduce((a, l) => a + l.pesoDisponivel, 0);
  const pesoInicial = estoqueInicial.reduce((a, l) => a + l.pesoDisponivel, 0);

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

  // Traceability indicators
  const sublotes = lotes.filter((l) => l.loteTipo === "sublote");
  const expedicoes = lotes.filter((l) => l.loteTipo === "expedicao" && l.status !== "vendido");
  const consumidos = lotes.filter((l) => l.consumido);

  // Margem por fornecedor (vendidos)
  const margemPorFornecedor = fornecedores
    .map((f) => {
      const ls = vendidos.filter((l) => l.fornecedorId === f.id);
      if (ls.length === 0) return null;
      const receita = ls.reduce((a, l) => a + l.pesoAtual * (l.precoVenda ?? 0), 0);
      const custo = ls.reduce((a, l) => a + custoFinalKg(l) * l.pesoAtual, 0);
      const margem = receita - custo;
      const pct = receita > 0 ? (margem / receita) * 100 : 0;
      return { nome: f.nome, margem: +margem.toFixed(2), pct: +pct.toFixed(1) };
    })
    .filter((x): x is { nome: string; margem: number; pct: number } => !!x)
    .sort((a, b) => b.pct - a.pct);

  // Rendimento (peso saída / peso entrada) por lote pai que gerou sublotes
  const rendimentoSplits = lotes
    .filter((l) => l.loteTipo === "normal" && l.consumido)
    .map((l) => {
      const filhos = lotes.filter((x) => x.sublotePaiId === l.id);
      const pesoOut = filhos.reduce((a, x) => a + x.pesoEntrada, 0);
      const rend = l.pesoEntrada > 0 ? (pesoOut / l.pesoEntrada) * 100 : 0;
      return { nome: l.codigo, rendimento: +rend.toFixed(1) };
    })
    .filter((x) => x.rendimento > 0);

  // Estoque por tipo
  const porTipo = tipos.map((t) => {
    const lotesT = emEstoque.filter((l) => l.tipoMaterialId === t.id);
    return {
      nome: t.nome.replace("Alumínio ", ""),
      peso: lotesT.reduce((a, l) => a + l.pesoDisponivel, 0),
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
          hint={`${emEstoque.length} lotes${estoqueInicial.length > 0 ? ` · ${estoqueInicial.length} iniciais` : ""}`}
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
        <StatCard
          label="Sublotes gerados"
          value={String(sublotes.length)}
          hint={`${consumidos.length} lotes consumidos`}
          icon={GitFork}
          tone="primary"
        />
        <StatCard
          label="Lotes de expedição"
          value={String(expedicoes.length)}
          hint={expedicoes.length > 0 ? `${fmtKg(expedicoes.reduce((a, l) => a + l.pesoAtual, 0))} disponível` : "Nenhum em estoque"}
          icon={PackageSearch}
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

      {/* Traceability charts */}
      {(margemPorFornecedor.length > 0 || rendimentoSplits.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {margemPorFornecedor.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <h3 className="text-sm font-semibold mb-1">Margem por fornecedor</h3>
              <p className="text-xs text-muted-foreground mb-3">% margem sobre receita (lotes vendidos)</p>
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart data={margemPorFornecedor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit="%" />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={110} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="pct" fill="var(--chart-4)" radius={[0, 6, 6, 0]} name="Margem %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {rendimentoSplits.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <h3 className="text-sm font-semibold mb-1">Rendimento por split</h3>
              <p className="text-xs text-muted-foreground mb-3">% peso recuperado após divisão em sublotes</p>
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart data={rendimentoSplits}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="rendimento" fill="var(--chart-5)" radius={[6, 6, 0, 0]} name="Rendimento %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      <Scale className="hidden" />

      {estoqueInicial.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
              Estoque Inicial — {fmtKg(pesoInicial)} em {estoqueInicial.length} {estoqueInicial.length === 1 ? "lote" : "lotes"}
            </h3>
            <div className="h-px flex-1 bg-sky-200/50 dark:bg-sky-800/30" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {estoqueInicial.slice(0, 4).map((l) => (
              <LoteCard
                key={l.id}
                lote={l}
                tipo={tipos.find((t) => t.id === l.tipoMaterialId)}
                fornecedor={undefined}
                onClick={() => setSelectedId(l.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">
          {estoqueInicial.length > 0 ? "Lotes comprados recentes" : "Lotes recentes"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {lotesProprios.slice(0, 8).map((l) => (
            <LoteCard
              key={l.id}
              lote={l}
              tipo={tipos.find((t) => t.id === l.tipoMaterialId)}
              fornecedor={fornecedores.find((f) => f.id === l.fornecedorId)}
              onClick={() => setSelectedId(l.id)}
            />
          ))}
        </div>
      </div>

      <LoteDrawer loteId={selectedId} onClose={() => setSelectedId(null)} />
    </AppLayout>
  );
}
