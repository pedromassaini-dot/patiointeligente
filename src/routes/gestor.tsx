import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader, StatCard, StatusBadge, inputCls } from "@/components/ui-bits";
import {
  useStore,
  fmtBRL,
  fmtKg,
  fmtDate,
  custoTotalCompra,
  custoFinalKg,
  perdaPercentual,
  margemEstimada,
  type Lote,
} from "@/lib/store";
import {
  DollarSign,
  Boxes,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Camera,
  ArrowDown,
  ArrowUp,
  MapPin,
  Filter,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/gestor")({
  component: GestorPage,
});

function GestorPage() {
  const { lotes, tipos, fornecedores } = useStore((s) => ({
    lotes: s.lotes,
    tipos: s.tipos,
    fornecedores: s.fornecedores,
  }));

  // ===== Filtros =====
  const [periodo, setPeriodo] = useState<"7" | "30" | "90" | "365" | "all">("all");
  const [fornecedorId, setFornecedorId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [localizacao, setLocalizacao] = useState("");

  const localizacoes = useMemo(
    () => Array.from(new Set(lotes.map((l) => l.localizacao))).sort(),
    [lotes]
  );

  const filtrados = useMemo(() => {
    const agora = Date.now();
    const dias = periodo === "all" ? Infinity : Number(periodo);
    return lotes.filter((l) => {
      if (fornecedorId && l.fornecedorId !== fornecedorId) return false;
      if (materialId && l.tipoMaterialId !== materialId) return false;
      if (localizacao && l.localizacao !== localizacao) return false;
      if (dias !== Infinity && agora - new Date(l.dataEntrada).getTime() > dias * 86400000)
        return false;
      return true;
    });
  }, [lotes, periodo, fornecedorId, materialId, localizacao]);

  const limparFiltros = () => {
    setPeriodo("all");
    setFornecedorId("");
    setMaterialId("");
    setLocalizacao("");
  };

  const tipoNome = (id: string) => tipos.find((t) => t.id === id)?.nome ?? "—";
  const fornNome = (id: string) => fornecedores.find((f) => f.id === id)?.nome ?? "—";

  // ===== Métricas financeiras =====
  const emEstoque = filtrados.filter((l) => l.status !== "vendido");
  const vendidos = filtrados.filter((l) => l.status === "vendido");

  const pesoEstoque = emEstoque.reduce((a, l) => a + l.pesoAtual, 0);
  const investido = emEstoque.reduce(
    (a, l) => a + custoTotalCompra(l) + (l.custoBeneficiamento || 0),
    0
  );
  const receita = vendidos.reduce((a, l) => a + l.pesoAtual * (l.precoVenda ?? 0), 0);
  const margemTotal = vendidos.reduce(
    (a, l) => a + margemEstimada(l.pesoAtual, l.precoVenda ?? 0, custoFinalKg(l)),
    0
  );
  const margemPct = receita > 0 ? (margemTotal / receita) * 100 : 0;

  const agora = Date.now();
  const parados30 = emEstoque.filter(
    (l) => agora - new Date(l.dataEntrada).getTime() > 30 * 86400000
  );
  const valorParado30 = parados30.reduce(
    (a, l) => a + custoTotalCompra(l) + (l.custoBeneficiamento || 0),
    0
  );

  const margemNegativa = vendidos.filter(
    (l) => margemEstimada(l.pesoAtual, l.precoVenda ?? 0, custoFinalKg(l)) < 0
  );

  // ===== Estoque por material =====
  const porMaterial = tipos
    .map((t) => {
      const ls = emEstoque.filter((l) => l.tipoMaterialId === t.id);
      return {
        nome: t.nome.replace("Alumínio ", ""),
        peso: +ls.reduce((a, l) => a + l.pesoAtual, 0).toFixed(0),
        valor: ls.reduce((a, l) => a + custoTotalCompra(l), 0),
        lotes: ls.length,
      };
    })
    .filter((x) => x.lotes > 0);

  // ===== Estoque por localização =====
  const porLocalizacao = localizacoes
    .map((loc) => {
      const ls = emEstoque.filter((l) => l.localizacao === loc);
      return {
        nome: loc,
        peso: +ls.reduce((a, l) => a + l.pesoAtual, 0).toFixed(0),
        lotes: ls.length,
      };
    })
    .filter((x) => x.lotes > 0);

  // ===== Ranking fornecedores por perda média =====
  const rankingFornecedores = fornecedores
    .map((f) => {
      const ls = filtrados.filter((l) => l.fornecedorId === f.id && l.pesoEntrada > 0);
      if (ls.length === 0) return null;
      const media = ls.reduce((a, l) => a + perdaPercentual(l), 0) / ls.length;
      const peso = ls.reduce((a, l) => a + l.pesoEntrada, 0);
      return { id: f.id, nome: f.nome, perda: +media.toFixed(2), lotes: ls.length, peso };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.perda - a.perda);

  // ===== Últimas entradas com foto =====
  const ultimasEntradasFoto = [...filtrados]
    .filter((l) => l.fotos.length > 0)
    .sort((a, b) => +new Date(b.dataEntrada) - +new Date(a.dataEntrada))
    .slice(0, 6);

  // ===== Últimas saídas =====
  const ultimasSaidas = [...vendidos]
    .filter((l) => l.dataSaida)
    .sort((a, b) => +new Date(b.dataSaida!) - +new Date(a.dataSaida!))
    .slice(0, 6);

  return (
    <AppLayout>
      <PageHeader
        title="Modo Gestor"
        description="Visão consolidada do escritório com filtros e indicadores financeiros"
      />

      {/* Filtros */}
      <div className="bg-card rounded-xl border p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros</span>
          <button
            onClick={limparFiltros}
            className="ml-auto text-xs text-primary hover:underline"
          >
            Limpar
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select className={inputCls} value={periodo} onChange={(e) => setPeriodo(e.target.value as typeof periodo)}>
            <option value="all">Todo o período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
          <select className={inputCls} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
            <option value="">Todos os fornecedores</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          <select className={inputCls} value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            <option value="">Todos os materiais</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
          <select className={inputCls} value={localizacao} onChange={(e) => setLocalizacao(e.target.value)}>
            <option value="">Todas as localizações</option>
            {localizacoes.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard financeiro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Valor investido" value={fmtBRL(investido)} hint={`${emEstoque.length} lotes em estoque`} icon={DollarSign} tone="primary" />
        <StatCard label="Receita realizada" value={fmtBRL(receita)} hint={`${vendidos.length} vendas`} icon={TrendingUp} tone="success" />
        <StatCard label="Margem total" value={fmtBRL(margemTotal)} hint={`${margemPct.toFixed(1)}% sobre receita`} icon={TrendingUp} tone={margemTotal >= 0 ? "success" : "warning"} />
        <StatCard label="Peso em estoque" value={fmtKg(pesoEstoque)} icon={Boxes} />
        <StatCard label="Parado +30 dias" value={fmtBRL(valorParado30)} hint={`${parados30.length} lotes`} icon={Clock} tone={parados30.length > 0 ? "warning" : "default"} />
        <StatCard label="Lotes margem negativa" value={String(margemNegativa.length)} hint={margemNegativa.length > 0 ? "Atenção!" : "Nenhum"} icon={TrendingDown} tone={margemNegativa.length > 0 ? "warning" : "default"} />
        <StatCard label="Materiais ativos" value={String(porMaterial.length)} hint={`de ${tipos.length}`} icon={Boxes} />
        <StatCard label="Localizações em uso" value={String(porLocalizacao.length)} icon={MapPin} />
      </div>

      {/* Estoque por material e localização */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <CardSecao titulo="Estoque por material" subtitulo="Peso atual em kg">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={porMaterial}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="peso" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 text-xs space-y-1">
            {porMaterial.map((m) => (
              <li key={m.nome} className="flex justify-between">
                <span className="text-muted-foreground">{m.nome} · {m.lotes} lotes</span>
                <span className="font-medium">{fmtKg(m.peso)} · {fmtBRL(m.valor)}</span>
              </li>
            ))}
            {porMaterial.length === 0 && <li className="text-muted-foreground text-center py-4">Sem dados</li>}
          </ul>
        </CardSecao>

        <CardSecao titulo="Estoque por localização" subtitulo="Distribuição no pátio">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={porLocalizacao} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={50} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="peso" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 text-xs space-y-1">
            {porLocalizacao.map((l) => (
              <li key={l.nome} className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{l.nome} · {l.lotes} lotes</span>
                <span className="font-medium">{fmtKg(l.peso)}</span>
              </li>
            ))}
            {porLocalizacao.length === 0 && <li className="text-muted-foreground text-center py-4">Sem dados</li>}
          </ul>
        </CardSecao>
      </div>

      {/* Ranking fornecedores e alertas */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <CardSecao titulo="Ranking de fornecedores por perda média" subtitulo="Maior perda primeiro">
          {rankingFornecedores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>
          ) : (
            <ol className="divide-y">
              {rankingFornecedores.map((f, i) => (
                <li key={f.id} className="py-2 flex items-center gap-3">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">{f.lotes} lotes · {fmtKg(f.peso)}</div>
                  </div>
                  <div className={`text-sm font-semibold ${f.perda > 8 ? "text-warning-foreground" : ""}`}>
                    {f.perda.toFixed(1)}%
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardSecao>

        <CardSecao titulo="Atenção" subtitulo="Lotes que precisam de ação">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-warning-foreground" />
                <span className="text-sm font-semibold">Parados há mais de 30 dias</span>
                <span className="ml-auto text-xs text-muted-foreground">{parados30.length}</span>
              </div>
              {parados30.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6">Nenhum lote parado.</p>
              ) : (
                <ul className="space-y-1">
                  {parados30.slice(0, 5).map((l) => (
                    <LinhaLote key={l.id} l={l} extra={`${Math.floor((agora - new Date(l.dataEntrada).getTime()) / 86400000)}d`} tipo={tipoNome(l.tipoMaterialId)} />
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold">Margem negativa</span>
                <span className="ml-auto text-xs text-muted-foreground">{margemNegativa.length}</span>
              </div>
              {margemNegativa.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6">Nenhum lote com prejuízo.</p>
              ) : (
                <ul className="space-y-1">
                  {margemNegativa.slice(0, 5).map((l) => {
                    const m = margemEstimada(l.pesoAtual, l.precoVenda ?? 0, custoFinalKg(l));
                    return <LinhaLote key={l.id} l={l} extra={fmtBRL(m)} tipo={tipoNome(l.tipoMaterialId)} negativo />;
                  })}
                </ul>
              )}
            </div>
          </div>
        </CardSecao>
      </div>

      {/* Últimas entradas com foto + últimas saídas */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <CardSecao titulo="Últimas entradas com foto" subtitulo="Registros recentes do galpão">
          {ultimasEntradasFoto.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrada com foto.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ultimasEntradasFoto.map((l) => (
                <Link
                  key={l.id}
                  to="/lote/$id"
                  params={{ id: l.id }}
                  className="group rounded-lg overflow-hidden border bg-card hover:border-primary transition"
                >
                  <div className="aspect-square bg-muted relative">
                    <img src={l.fotos[0]} alt={l.codigo} className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-card/90 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Camera className="h-2.5 w-2.5" />{l.fotos.length}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate">{l.codigo}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{tipoNome(l.tipoMaterialId)}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtDate(l.dataEntrada)} · {fmtKg(l.pesoAtual)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardSecao>

        <CardSecao titulo="Últimas saídas" subtitulo="Vendas mais recentes">
          {ultimasSaidas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda registrada.</p>
          ) : (
            <ul className="divide-y">
              {ultimasSaidas.map((l) => {
                const m = margemEstimada(l.pesoAtual, l.precoVenda ?? 0, custoFinalKg(l));
                return (
                  <li key={l.id} className="py-2 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-success/15 text-success flex items-center justify-center shrink-0">
                      <ArrowUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to="/lote/$id" params={{ id: l.id }} className="text-sm font-medium hover:underline">
                        {l.codigo}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">
                        {tipoNome(l.tipoMaterialId)} · {fmtDate(l.dataSaida!)} · {fmtKg(l.pesoAtual)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">{fmtBRL((l.precoVenda ?? 0) * l.pesoAtual)}</div>
                      <div className={`text-[11px] ${m >= 0 ? "text-success" : "text-destructive"}`}>
                        {m >= 0 ? "+" : ""}{fmtBRL(m)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardSecao>
      </div>
    </AppLayout>
  );
}

function CardSecao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {subtitulo && <p className="text-xs text-muted-foreground mb-3">{subtitulo}</p>}
      {children}
    </div>
  );
}

function LinhaLote({ l, extra, tipo, negativo }: { l: Lote; extra: string; tipo: string; negativo?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <ArrowDown className="h-3 w-3 text-muted-foreground shrink-0" />
      <Link to="/lote/$id" params={{ id: l.id }} className="font-medium hover:underline">
        {l.codigo}
      </Link>
      <span className="text-muted-foreground truncate flex-1">{tipo}</span>
      <StatusBadge status={l.status} />
      <span className={`font-semibold shrink-0 ${negativo ? "text-destructive" : "text-warning-foreground"}`}>{extra}</span>
    </li>
  );
}
