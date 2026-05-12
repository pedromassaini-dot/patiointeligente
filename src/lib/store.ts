import { useSyncExternalStore, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ===== shallow compare to keep useSyncExternalStore stable =====
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

// ===== Types (camelCase, used by UI) =====
export type Role = "operador" | "gestor";
export type User = { id: string; nome: string; role: Role; email: string };

export type TipoMaterial = {
  id: string;
  nome: string;
  categoria?: string;
  precoMedioCompra?: number;
  precoMedioVenda?: number;
};

export type Fornecedor = {
  id: string;
  nome: string;
  documento: string;
  cidade: string;
};

export type Localizacao = { id: string; nome: string };

export type StatusLote = "estoque" | "beneficiamento" | "vendido";
type DBStatus = Database["public"]["Enums"]["status_lote"];

function mapStatus(s: DBStatus): StatusLote {
  if (s === "em_beneficiamento") return "beneficiamento";
  if (s === "vendido_total" || s === "vendido_parcial") return "vendido";
  return "estoque";
}

export type Foto = { id: string; url: string };

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
  custoUnitario: number; // R$/kg compra
  custoBeneficiamento: number; // soma
  localizacao: string; // nome
  localizacaoId: string | null;
  status: StatusLote;
  fotos: Foto[];
  observacoes?: string;
  dataEntrada: string;
  dataSaida?: string;
  precoVenda?: number;
  movimentacoes: Movimentacao[];
};

type State = {
  user: User | null;
  authChecked: boolean;
  authError: string | null;
  loading: boolean;
  error: string | null;
  tipos: TipoMaterial[];
  fornecedores: Fornecedor[];
  localizacoes: Localizacao[];
  lotes: Lote[];
};

let state: State = {
  user: null,
  authChecked: false,
  authError: null,
  loading: false,
  error: null,
  tipos: [],
  fornecedores: [],
  localizacoes: [],
  lotes: [],
};

const listeners = new Set<() => void>();

function setState(updater: (s: State) => State) {
  state = updater(state);
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  const lastRef = useRef<{ has: boolean; value: T }>({ has: false, value: undefined as unknown as T });
  const getSnapshot = () => {
    const next = selector(state);
    if (lastRef.current.has && shallowEqual(lastRef.current.value, next)) {
      return lastRef.current.value;
    }
    lastRef.current = { has: true, value: next };
    return next;
  };
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    getSnapshot
  );
}

// ===== Cálculos automáticos (espelham triggers do banco) =====
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

// ===== Carregamento de dados =====
async function loadAll() {
  setState((s) => ({ ...s, loading: true, error: null }));
  try {
    const [
      { data: materiais, error: e1 },
      { data: fornecedores, error: e2 },
      { data: localizacoes, error: e3 },
      { data: lotes, error: e4 },
      { data: fotos, error: e5 },
      { data: benefs, error: e6 },
      { data: vendas, error: e7 },
      { data: movs, error: e8 },
    ] = await Promise.all([
      supabase.from("materiais").select("*").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("*").order("nome"),
      supabase.from("localizacoes_patio").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").order("data_entrada", { ascending: false }),
      supabase.from("fotos_lote").select("*"),
      supabase.from("beneficiamentos").select("*").order("criado_em"),
      supabase.from("vendas").select("*").order("data_venda"),
      supabase.from("movimentacoes").select("*").order("criado_em"),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8;
    if (err) throw err;

    const locById = new Map((localizacoes ?? []).map((l) => [l.id, l.nome]));

    const lotesAssembled: Lote[] = (lotes ?? []).map((l) => {
      const lFotos: Foto[] = (fotos ?? [])
        .filter((f) => f.lote_id === l.id)
        .map((f) => ({ id: f.id, url: f.url_foto }));
      const lBenefs = (benefs ?? []).filter((b) => b.lote_id === l.id);
      const lVendas = (vendas ?? []).filter((v) => v.lote_id === l.id);
      const lMovs = (movs ?? []).filter((m) => m.lote_id === l.id);

      const ultBenef = lBenefs[lBenefs.length - 1];
      const pesoAtual = ultBenef ? Number(ultBenef.peso_depois) : Number(l.peso_bruto);
      const custoBenef = lBenefs.reduce((a, b) => a + Number(b.custo_beneficiamento || 0), 0);
      const ultVenda = lVendas[lVendas.length - 1];

      const movimentacoes: Movimentacao[] = [
        {
          id: `entrada-${l.id}`,
          data: l.data_entrada,
          tipo: "entrada" as const,
          descricao: `Entrada de ${Number(l.peso_bruto).toFixed(1)} kg`,
          operador: "—",
        },
        ...lMovs.map((m) => ({
          id: m.id,
          data: m.criado_em,
          tipo: "movimentacao" as const,
          descricao:
            `Movido de ${locById.get(m.localizacao_origem_id ?? "") ?? "—"} para ${locById.get(m.localizacao_destino_id ?? "") ?? "—"}` +
            (m.observacoes ? ` (${m.observacoes})` : ""),
          localizacaoAntes: locById.get(m.localizacao_origem_id ?? "") ?? undefined,
          localizacaoDepois: locById.get(m.localizacao_destino_id ?? "") ?? undefined,
          operador: "—",
        })),
        ...lBenefs.map((b) => ({
          id: b.id,
          data: b.criado_em,
          tipo: "beneficiamento" as const,
          descricao:
            `Beneficiamento: ${Number(b.peso_antes).toFixed(1)} → ${Number(b.peso_depois).toFixed(1)} kg` +
            (b.custo_beneficiamento ? ` · custo R$ ${Number(b.custo_beneficiamento).toFixed(2)}` : "") +
            (b.observacoes ? ` (${b.observacoes})` : ""),
          pesoAntes: Number(b.peso_antes),
          pesoDepois: Number(b.peso_depois),
          operador: "—",
        })),
        ...lVendas.map((v) => ({
          id: v.id,
          data: v.data_venda,
          tipo: "saida" as const,
          descricao: `Venda a R$ ${Number(v.preco_kg_venda).toFixed(2)}/kg para ${v.comprador}`,
          operador: "—",
        })),
      ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      return {
        id: l.id,
        codigo: l.codigo_lote,
        tipoMaterialId: l.material_id,
        fornecedorId: l.fornecedor_id,
        pesoEntrada: Number(l.peso_bruto),
        pesoAtual,
        custoUnitario: Number(l.preco_kg_compra),
        custoBeneficiamento: custoBenef,
        localizacao: locById.get(l.localizacao_id ?? "") ?? "—",
        localizacaoId: l.localizacao_id,
        status: mapStatus(l.status),
        fotos: lFotos,
        observacoes: l.observacoes ?? undefined,
        dataEntrada: l.data_entrada,
        dataSaida: ultVenda?.data_venda,
        precoVenda: ultVenda ? Number(ultVenda.preco_kg_venda) : undefined,
        movimentacoes,
      };
    });

    setState((s) => ({
      ...s,
      loading: false,
      tipos: (materiais ?? []).map((m) => ({
        id: m.id,
        nome: m.nome,
        categoria: m.categoria ?? undefined,
      })),
      fornecedores: (fornecedores ?? []).map((f) => ({
        id: f.id,
        nome: f.nome,
        documento: f.cpf_cnpj ?? "",
        cidade: f.cidade ?? "",
      })),
      localizacoes: (localizacoes ?? []).map((l) => ({ id: l.id, nome: l.nome })),
      lotes: lotesAssembled,
    }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar dados";
    setState((s) => ({ ...s, loading: false, error: msg }));
  }
}

// ===== Realtime =====
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    void loadAll();
  }, 250);
}

function setupRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("patio-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "lotes" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "fotos_lote" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "beneficiamentos" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "vendas" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "fornecedores" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "materiais" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "localizacoes_patio" }, scheduleReload)
    .subscribe();
}

function teardownRealtime() {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// ===== Auth =====
type ProfileResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

async function loadUserProfile(userId: string, email: string): Promise<ProfileResult> {
  // 1) Try by id
  const byId = await supabase.from("usuarios").select("*").eq("id", userId).maybeSingle();
  if (byId.error) {
    return { ok: false, error: `Não foi possível ler seu perfil: ${byId.error.message}` };
  }
  if (byId.data) {
    return {
      ok: true,
      user: {
        id: byId.data.id,
        nome: byId.data.nome,
        role: byId.data.perfil as Role,
        email: byId.data.email,
      },
    };
  }

  // 2) Try by email (legacy records that may have a different id)
  if (email) {
    const byEmail = await supabase.from("usuarios").select("*").eq("email", email).maybeSingle();
    if (byEmail.error) {
      return { ok: false, error: `Não foi possível ler seu perfil: ${byEmail.error.message}` };
    }
    if (byEmail.data) {
      return {
        ok: true,
        user: {
          id: byEmail.data.id,
          nome: byEmail.data.nome,
          role: byEmail.data.perfil as Role,
          email: byEmail.data.email,
        },
      };
    }
  }

  // 3) New user: create as operador (default)
  const insert = await supabase
    .from("usuarios")
    .insert({
      id: userId,
      nome: email.split("@")[0] || "Usuário",
      email,
      perfil: "operador",
    })
    .select()
    .maybeSingle();
  if (insert.error || !insert.data) {
    return {
      ok: false,
      error: `Não foi possível criar seu perfil: ${insert.error?.message ?? "erro desconhecido"}`,
    };
  }
  return {
    ok: true,
    user: {
      id: insert.data.id,
      nome: insert.data.nome,
      role: insert.data.perfil as Role,
      email: insert.data.email,
    },
  };
}

async function applySession(userId: string, email: string) {
  const res = await loadUserProfile(userId, email);
  if (res.ok) {
    setState((s) => ({ ...s, user: res.user, authError: null, authChecked: true }));
    setupRealtime();
    void loadAll();
  } else {
    setState((s) => ({ ...s, user: null, authError: res.error, authChecked: true }));
  }
}

export async function initAuth() {
  const { data: sess } = await supabase.auth.getSession();
  if (sess.session) {
    await applySession(sess.session.user.id, sess.session.user.email ?? "");
  } else {
    setState((s) => ({ ...s, authChecked: true, authError: null }));
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      // defer to avoid potential deadlock with supabase client
      setTimeout(() => {
        void applySession(session.user.id, session.user.email ?? "");
      }, 0);
    } else {
      teardownRealtime();
      setState((s) => ({
        ...s,
        user: null,
        authError: null,
        authChecked: true,
        tipos: [],
        fornecedores: [],
        localizacoes: [],
        lotes: [],
      }));
    }
  });
}

// Hook conveniente para garantir init e refetch
export function useAppData() {
  useEffect(() => {
    if (state.user && state.lotes.length === 0 && !state.loading) {
      void loadAll();
    }
  }, []);
}

// ===== Helpers =====
async function ensureLocalizacao(nome: string): Promise<string | null> {
  if (!nome) return null;
  const found = state.localizacoes.find((l) => l.nome.toLowerCase() === nome.toLowerCase());
  if (found) return found.id;
  const { data, error } = await supabase
    .from("localizacoes_patio")
    .insert({ nome, ativo: true })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

async function uploadFotos(loteId: string, files: File[]): Promise<void> {
  if (!files.length) return;
  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${loteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("fotos-lote").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("fotos-lote").getPublicUrl(path);
    const { error: insErr } = await supabase.from("fotos_lote").insert({
      lote_id: loteId,
      url_foto: pub.publicUrl,
    });
    if (insErr) throw insErr;
  }
}

async function nextCodigoLote(): Promise<string> {
  const { count } = await supabase.from("lotes").select("*", { count: "exact", head: true });
  const n = (count ?? 0) + 1;
  return `LT-${String(1000 + n)}`;
}

// ===== Actions =====
export const actions = {
  async loginEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signupEmail(email: string, password: string, nome: string) {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nome, perfil: "operador" },
      },
    });
    if (error) throw error;
  },
  async logout() {
    await supabase.auth.signOut();
    // Clear any cached data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      // Clear any other supabase related keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.')) {
          localStorage.removeItem(key);
        }
      });
    }
  },
  async refreshProfile() {
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) {
      await supabase.auth.refreshSession();
      const u = await loadUserProfile(sess.session.user.id, sess.session.user.email ?? "");
      setState((s) => ({ ...s, user: u }));
    }
  },
  async addLote(input: {
    tipoMaterialId: string;
    fornecedorId: string;
    pesoEntrada: number;
    custoUnitario: number;
    localizacao: string;
    fotos: File[];
    observacoes?: string;
  }): Promise<Lote> {
    const localizacaoId = await ensureLocalizacao(input.localizacao);
    const codigo = await nextCodigoLote();
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data, error } = await supabase
      .from("lotes")
      .insert({
        codigo_lote: codigo,
        material_id: input.tipoMaterialId,
        fornecedor_id: input.fornecedorId,
        peso_bruto: input.pesoEntrada,
        preco_kg_compra: input.custoUnitario,
        localizacao_id: localizacaoId,
        status: "recebido",
        observacoes: input.observacoes,
        criado_por: userId,
      })
      .select()
      .single();
    if (error) throw error;

    if (input.fotos.length) {
      try {
        await uploadFotos(data.id, input.fotos);
      } catch (e) {
        console.error("upload fotos falhou", e);
      }
    }

    await loadAll();
    const l = state.lotes.find((x) => x.id === data.id);
    if (!l) throw new Error("Lote criado mas não encontrado");
    return l;
  },
  async movimentarLote(loteId: string, novaLocalizacao: string) {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");
    const destinoId = await ensureLocalizacao(novaLocalizacao);
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { error: e1 } = await supabase.from("movimentacoes").insert({
      lote_id: loteId,
      tipo_movimentacao: "transferencia",
      localizacao_origem_id: lote.localizacaoId,
      localizacao_destino_id: destinoId,
      criado_por: userId,
    });
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from("lotes")
      .update({ localizacao_id: destinoId })
      .eq("id", loteId);
    if (e2) throw e2;
  },
  async beneficiarLote(loteId: string, novoPeso: number, custoBenef = 0, observacao?: string) {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");
    const { error: e1 } = await supabase.from("beneficiamentos").insert({
      lote_id: loteId,
      peso_antes: lote.pesoAtual,
      peso_depois: novoPeso,
      custo_beneficiamento: custoBenef,
      observacoes: observacao,
    });
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from("lotes")
      .update({ status: "em_beneficiamento" })
      .eq("id", loteId);
    if (e2) throw e2;
  },
  async venderLote(loteId: string, precoVenda: number, comprador = "Comprador") {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");
    const { error: e1 } = await supabase.from("vendas").insert({
      lote_id: loteId,
      comprador,
      peso_vendido: lote.pesoAtual,
      preco_kg_venda: precoVenda,
    });
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from("lotes")
      .update({ status: "vendido_total" })
      .eq("id", loteId);
    if (e2) throw e2;
  },
  async addFotos(loteId: string, files: File[]) {
    if (!files.length) return;
    await uploadFotos(loteId, files);
  },
  async removeFoto(loteId: string, fotoId: string) {
    const lote = state.lotes.find((l) => l.id === loteId);
    const foto = lote?.fotos.find((f) => f.id === fotoId);
    if (foto) {
      // tenta extrair path do bucket: .../fotos-lote/<path>
      const m = foto.url.match(/\/fotos-lote\/(.+)$/);
      if (m) await supabase.storage.from("fotos-lote").remove([m[1]]);
    }
    const { error } = await supabase.from("fotos_lote").delete().eq("id", fotoId);
    if (error) throw error;
  },
  async editLote(
    loteId: string,
    patch: Partial<{
      tipoMaterialId: string;
      fornecedorId: string;
      custoUnitario: number;
      localizacao: string;
      observacoes: string;
    }>
  ) {
    const update: Database["public"]["Tables"]["lotes"]["Update"] = {};
    if (patch.tipoMaterialId) update.material_id = patch.tipoMaterialId;
    if (patch.fornecedorId) update.fornecedor_id = patch.fornecedorId;
    if (patch.custoUnitario !== undefined) update.preco_kg_compra = patch.custoUnitario;
    if (patch.observacoes !== undefined) update.observacoes = patch.observacoes;
    if (patch.localizacao) {
      update.localizacao_id = await ensureLocalizacao(patch.localizacao);
    }
    const { error } = await supabase.from("lotes").update(update).eq("id", loteId);
    if (error) throw error;
  },
  async addFornecedor(f: { nome: string; documento: string; cidade: string }) {
    const { error } = await supabase
      .from("fornecedores")
      .insert({ nome: f.nome, cpf_cnpj: f.documento || null, cidade: f.cidade || null });
    if (error) throw error;
  },
  async addTipo(t: { nome: string; precoMedioCompra?: number; precoMedioVenda?: number; categoria?: string }) {
    const { error } = await supabase
      .from("materiais")
      .insert({ nome: t.nome, categoria: t.categoria ?? null, ativo: true });
    if (error) throw error;
  },
  async refresh() {
    await loadAll();
  },
};

// ===== Format helpers =====
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
