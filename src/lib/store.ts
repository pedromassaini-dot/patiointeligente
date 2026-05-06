import { useSyncExternalStore } from "react";

export type Role = "operador" | "gestor";
export type User = { id: string; nome: string; role: Role };

export type TipoMaterial = {
  id: string;
  nome: string;
  precoMedioCompra: number; // R$/kg
  precoMedioVenda: number; // R$/kg
};

export type Fornecedor = {
  id: string;
  nome: string;
  documento: string;
  cidade: string;
};

export type StatusLote = "estoque" | "beneficiamento" | "vendido";

export type Movimentacao = {
  id: string;
  data: string;
  tipo: "entrada" | "movimentacao" | "beneficiamento" | "saida";
  descricao: string;
  pesoAntes?: number;
  pesoDepois?: number;
  localizacaoAntes?: string;
  localizacaoDepois?: string;
  operador: string;
};

export type Lote = {
  id: string;
  codigo: string;
  tipoMaterialId: string;
  fornecedorId: string;
  pesoEntrada: number;
  pesoAtual: number;
  custoUnitario: number; // R$/kg (preço de compra)
  custoBeneficiamento: number; // R$ total
  localizacao: string;
  status: StatusLote;
  fotos: string[]; // dataURLs
  observacoes?: string;
  dataEntrada: string;
  dataSaida?: string;
  precoVenda?: number; // R$/kg
  movimentacoes: Movimentacao[];
};

// ===== Cálculos automáticos =====
export function custoTotalCompra(l: Pick<Lote, "pesoEntrada" | "custoUnitario">) {
  return l.pesoEntrada * l.custoUnitario;
}
export function perdaKg(l: Pick<Lote, "pesoEntrada" | "pesoAtual">) {
  return Math.max(0, l.pesoEntrada - l.pesoAtual);
}
export function perdaPercentual(l: Pick<Lote, "pesoEntrada" | "pesoAtual">) {
  return l.pesoEntrada > 0 ? (perdaKg(l) / l.pesoEntrada) * 100 : 0;
}
export function custoFinalKg(l: Lote) {
  if (l.pesoAtual <= 0) return l.custoUnitario;
  return (custoTotalCompra(l) + (l.custoBeneficiamento || 0)) / l.pesoAtual;
}
export function receitaTotal(pesoVendido: number, precoKgVenda: number) {
  return pesoVendido * precoKgVenda;
}
export function custoProporcional(pesoVendido: number, custoFinal: number) {
  return pesoVendido * custoFinal;
}
export function margemEstimada(pesoVendido: number, precoKgVenda: number, custoFinal: number) {
  return receitaTotal(pesoVendido, precoKgVenda) - custoProporcional(pesoVendido, custoFinal);
}

type State = {
  user: User | null;
  tipos: TipoMaterial[];
  fornecedores: Fornecedor[];
  lotes: Lote[];
};

const STORAGE_KEY = "patio-inteligente-v1";

const seed: State = {
  user: null,
  tipos: [
    { id: "t1", nome: "Alumínio Perfil", precoMedioCompra: 7.5, precoMedioVenda: 11.2 },
    { id: "t2", nome: "Alumínio Bloco", precoMedioCompra: 6.2, precoMedioVenda: 9.5 },
    { id: "t3", nome: "Alumínio Lata", precoMedioCompra: 4.8, precoMedioVenda: 7.8 },
    { id: "t4", nome: "Alumínio Cavaco", precoMedioCompra: 5.5, precoMedioVenda: 8.6 },
    { id: "t5", nome: "Alumínio Chaparia", precoMedioCompra: 6.8, precoMedioVenda: 10.1 },
  ],
  fornecedores: [
    { id: "f1", nome: "Sucatas Silva ME", documento: "12.345.678/0001-90", cidade: "São Paulo" },
    { id: "f2", nome: "Reciclagem Boa Vista", documento: "98.765.432/0001-10", cidade: "Guarulhos" },
    { id: "f3", nome: "Metais do Vale", documento: "11.222.333/0001-44", cidade: "Campinas" },
  ],
  lotes: [],
};

function generateSeedLotes(): Lote[] {
  const now = Date.now();
  const day = 86400000;
  const lotes: Lote[] = [];
  const tipos = seed.tipos;
  const forns = seed.fornecedores;
  for (let i = 0; i < 8; i++) {
    const tipo = tipos[i % tipos.length];
    const forn = forns[i % forns.length];
    const peso = 200 + Math.round(Math.random() * 800);
    const dataEntrada = new Date(now - (i * 3 + 1) * day).toISOString();
    const localizacoes = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const status: StatusLote =
      i === 1 ? "beneficiamento" : i === 7 ? "vendido" : "estoque";
    const pesoAtual = status === "beneficiamento" ? peso * 0.92 : peso;
    lotes.push({
      custoBeneficiamento: 0,
      id: `l${i + 1}`,
      codigo: `LT-${String(1000 + i)}`,
      tipoMaterialId: tipo.id,
      fornecedorId: forn.id,
      pesoEntrada: peso,
      pesoAtual,
      custoUnitario: tipo.precoMedioCompra * (0.95 + Math.random() * 0.1),
      localizacao: localizacoes[i % localizacoes.length],
      status,
      fotos: [],
      dataEntrada,
      dataSaida: status === "vendido" ? new Date(now - day).toISOString() : undefined,
      precoVenda: status === "vendido" ? tipo.precoMedioVenda : undefined,
      movimentacoes: [
        {
          id: `m${i}-1`,
          data: dataEntrada,
          tipo: "entrada",
          descricao: `Entrada de ${peso} kg`,
          operador: "Sistema",
        },
      ],
    });
  }
  return lotes;
}

let state: State = (() => {
  if (typeof window === "undefined") return { ...seed, lotes: generateSeedLotes() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  return { ...seed, lotes: generateSeedLotes() };
})();

const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
}

function setState(updater: (s: State) => State) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState() {
  return state;
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state)
  );
}

// --- actions ---
export const actions = {
  login(role: Role) {
    setState((s) => ({
      ...s,
      user: {
        id: role === "gestor" ? "u1" : "u2",
        nome: role === "gestor" ? "Ana Gestora" : "Carlos Operador",
        role,
      },
    }));
  },
  logout() {
    setState((s) => ({ ...s, user: null }));
  },
  addLote(input: {
    tipoMaterialId: string;
    fornecedorId: string;
    pesoEntrada: number;
    custoUnitario: number;
    localizacao: string;
    fotos: string[];
    observacoes?: string;
  }) {
    const id = `l${Date.now()}`;
    const codigo = `LT-${String(1000 + state.lotes.length + 1)}`;
    const dataEntrada = new Date().toISOString();
    const lote: Lote = {
      custoBeneficiamento: 0,
      id,
      codigo,
      tipoMaterialId: input.tipoMaterialId,
      fornecedorId: input.fornecedorId,
      pesoEntrada: input.pesoEntrada,
      pesoAtual: input.pesoEntrada,
      custoUnitario: input.custoUnitario,
      localizacao: input.localizacao,
      status: "estoque",
      fotos: input.fotos,
      observacoes: input.observacoes,
      dataEntrada,
      movimentacoes: [
        {
          id: `m${Date.now()}`,
          data: dataEntrada,
          tipo: "entrada",
          descricao: `Entrada de ${input.pesoEntrada} kg`,
          operador: state.user?.nome ?? "Operador",
        },
      ],
    };
    setState((s) => ({ ...s, lotes: [lote, ...s.lotes] }));
    return lote;
  },
  movimentarLote(loteId: string, novaLocalizacao: string) {
    setState((s) => ({
      ...s,
      lotes: s.lotes.map((l) =>
        l.id === loteId
          ? {
              ...l,
              localizacao: novaLocalizacao,
              movimentacoes: [
                ...l.movimentacoes,
                {
                  id: `m${Date.now()}`,
                  data: new Date().toISOString(),
                  tipo: "movimentacao",
                  descricao: `Movido de ${l.localizacao} para ${novaLocalizacao}`,
                  localizacaoAntes: l.localizacao,
                  localizacaoDepois: novaLocalizacao,
                  operador: state.user?.nome ?? "Operador",
                },
              ],
            }
          : l
      ),
    }));
  },
  beneficiarLote(loteId: string, novoPeso: number, custoBenef: number = 0, observacao?: string) {
    setState((s) => ({
      ...s,
      lotes: s.lotes.map((l) =>
        l.id === loteId
          ? {
              ...l,
              pesoAtual: novoPeso,
              custoBeneficiamento: (l.custoBeneficiamento || 0) + (custoBenef || 0),
              status: "beneficiamento" as StatusLote,
              movimentacoes: [
                ...l.movimentacoes,
                {
                  id: `m${Date.now()}`,
                  data: new Date().toISOString(),
                  tipo: "beneficiamento",
                  descricao:
                    `Beneficiamento: ${l.pesoAtual.toFixed(1)} → ${novoPeso.toFixed(1)} kg` +
                    (custoBenef ? ` · custo R$ ${custoBenef.toFixed(2)}` : "") +
                    (observacao ? ` (${observacao})` : ""),
                  pesoAntes: l.pesoAtual,
                  pesoDepois: novoPeso,
                  operador: state.user?.nome ?? "Operador",
                },
              ],
            }
          : l
      ),
    }));
  },
  venderLote(loteId: string, precoVenda: number) {
    setState((s) => ({
      ...s,
      lotes: s.lotes.map((l) =>
        l.id === loteId
          ? {
              ...l,
              status: "vendido" as StatusLote,
              precoVenda,
              dataSaida: new Date().toISOString(),
              movimentacoes: [
                ...l.movimentacoes,
                {
                  id: `m${Date.now()}`,
                  data: new Date().toISOString(),
                  tipo: "saida",
                  descricao: `Venda a R$ ${precoVenda.toFixed(2)}/kg`,
                  operador: state.user?.nome ?? "Operador",
                },
              ],
            }
          : l
      ),
    }));
  },
  addFotos(loteId: string, fotos: string[]) {
    if (fotos.length === 0) return;
    setState((s) => ({
      ...s,
      lotes: s.lotes.map((l) =>
        l.id === loteId ? { ...l, fotos: [...l.fotos, ...fotos] } : l
      ),
    }));
  },
  removeFoto(loteId: string, index: number) {
    setState((s) => ({
      ...s,
      lotes: s.lotes.map((l) =>
        l.id === loteId ? { ...l, fotos: l.fotos.filter((_, i) => i !== index) } : l
      ),
    }));
  },
  editLote(loteId: string, patch: Partial<Pick<Lote, "tipoMaterialId" | "fornecedorId" | "custoUnitario" | "localizacao" | "observacoes">>) {
    setState((s) => ({
      ...s,
      lotes: s.lotes.map((l) => (l.id === loteId ? { ...l, ...patch } : l)),
    }));
  },
    setState((s) => ({
      ...s,
      fornecedores: [...s.fornecedores, { ...f, id: `f${Date.now()}` }],
    }));
  },
  addTipo(t: Omit<TipoMaterial, "id">) {
    setState((s) => ({ ...s, tipos: [...s.tipos, { ...t, id: `t${Date.now()}` }] }));
  },
  resetSeed() {
    state = { ...seed, lotes: generateSeedLotes(), user: state.user };
    persist();
    listeners.forEach((l) => l());
  },
};

export function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function fmtKg(n: number) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}
