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

// ===== Types =====
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

export type StatusLote = "estoque" | "beneficiamento" | "vendido" | "vendido_parcial" | "estoque_inicial";
type DBStatus = Database["public"]["Enums"]["status_lote"];

function mapStatus(s: DBStatus): StatusLote {
  if (s === "em_beneficiamento") return "beneficiamento";
  if (s === "vendido_total") return "vendido";
  if (s === "vendido_parcial") return "vendido_parcial";
  if (s === "estoque_inicial") return "estoque_inicial";
  return "estoque";
}

export type Foto = { id: string; url: string };

export type HistoricoLote = {
  id: string;
  loteId: string | null;
  loteCodigo: string;
  usuarioNome: string;
  acao: string;
  detalhes?: Record<string, unknown>;
  criadoEm: string;
};

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

export type LoteTipo = "normal" | "sublote" | "expedicao";

export type ComposicaoItem = {
  id: string;
  origemLoteId: string | null;
  origemLoteCodigo: string;
  pesoUsado: number;
  custoProporcional: number;
  fornecedorId: string | null;
  materialId: string | null;
};

export type Lote = {
  id: string;
  codigo: string;
  tipoMaterialId: string;
  fornecedorId: string | null;
  pesoEntrada: number;
  pesoAtual: number;
  pesoDisponivel: number;
  consumido: boolean;
  custoUnitario: number;
  custoBeneficiamento: number;
  localizacao: string;
  localizacaoId: string | null;
  status: StatusLote;
  loteTipo: LoteTipo;
  sublotePaiId: string | null;
  isEstoqueInicial: boolean;
  dataReferencia?: string;
  fotos: Foto[];
  observacoes?: string;
  dataEntrada: string;
  dataSaida?: string;
  precoVenda?: number;
  movimentacoes: Movimentacao[];
  composicao: ComposicaoItem[];
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
  historico: HistoricoLote[];
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
  historico: [],
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

// ===== Financial helpers =====
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

// ===== Data loading =====
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
      { data: hist },
      { data: composicoes },
    ] = await Promise.all([
      supabase.from("materiais").select("*").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("*").order("nome"),
      supabase.from("localizacoes_patio").select("*").eq("ativo", true).order("nome"),
      supabase.from("lotes").select("*").order("data_entrada", { ascending: false }),
      supabase.from("fotos_lote").select("*"),
      supabase.from("beneficiamentos").select("*").order("criado_em"),
      supabase.from("vendas").select("*").order("data_venda"),
      supabase.from("movimentacoes").select("*").order("criado_em"),
      supabase.from("historico_lotes").select("*").order("criado_em", { ascending: false }).limit(200),
      supabase.from("composicao_lotes").select("*").then((r) => ({ data: r.data ?? [], error: null as null })),
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
      // Only use peso_depois when > 0; split records peso_depois=0 (consumed) which is not the display weight
      const pesoAtual =
        ultBenef && Number(ultBenef.peso_depois) > 0
          ? Number(ultBenef.peso_depois)
          : Number(l.peso_bruto);
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

      const lComposicao: ComposicaoItem[] = (composicoes ?? [])
        .filter((c) => c.expedicao_lote_id === l.id)
        .map((c) => ({
          id: c.id,
          origemLoteId: c.origem_lote_id,
          origemLoteCodigo: c.origem_lote_codigo,
          pesoUsado: Number(c.peso_usado),
          custoProporcional: Number(c.custo_proporcional),
          fornecedorId: c.fornecedor_id,
          materialId: c.material_id,
        }));

      const pesoDisp = l.peso_disponivel != null ? Number(l.peso_disponivel) : pesoAtual;

      return {
        id: l.id,
        codigo: l.codigo_lote,
        tipoMaterialId: l.material_id,
        fornecedorId: l.fornecedor_id ?? null,
        pesoEntrada: Number(l.peso_bruto),
        pesoAtual,
        pesoDisponivel: pesoDisp,
        consumido: l.consumido ?? false,
        custoUnitario: Number(l.preco_kg_compra),
        custoBeneficiamento: custoBenef,
        localizacao: locById.get(l.localizacao_id ?? "") ?? "—",
        localizacaoId: l.localizacao_id,
        status: mapStatus(l.status),
        loteTipo: (l.lote_tipo ?? "normal") as LoteTipo,
        sublotePaiId: l.sublote_pai_id ?? null,
        isEstoqueInicial: l.status === "estoque_inicial",
        dataReferencia: (l as { data_referencia?: string | null }).data_referencia ?? undefined,
        fotos: lFotos,
        observacoes: l.observacoes ?? undefined,
        dataEntrada: l.data_entrada,
        dataSaida: ultVenda?.data_venda,
        precoVenda: ultVenda ? Number(ultVenda.preco_kg_venda) : undefined,
        movimentacoes,
        composicao: lComposicao,
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
      historico: (hist ?? []).map((h) => ({
        id: h.id,
        loteId: h.lote_id,
        loteCodigo: h.lote_codigo,
        usuarioNome: h.usuario_nome,
        acao: h.acao,
        detalhes: h.detalhes as Record<string, unknown> | undefined,
        criadoEm: h.criado_em,
      })),
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
// Fetches user profile from `usuarios` by auth user id, with email fallback.
// Never defaults to operador — if no profile exists, returns a clear error.
async function fetchUserProfile(userId: string, userEmail?: string): Promise<{ user: User } | { error: string }> {
  // Primary: look up by id (matches RLS USING auth.uid() = id)
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, nome, perfil")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { error: `Erro ao buscar perfil: ${error.message} (código: ${(error as { code?: string }).code ?? "?"})` };
  }

  if (data) {
    return {
      user: {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.perfil as Role,
      },
    };
  }

  // Fallback: try to find by email (handles cases where id was not propagated)
  if (userEmail) {
    const { data: byEmail, error: emailErr } = await supabase
      .from("usuarios")
      .select("id, email, nome, perfil")
      .eq("email", userEmail)
      .maybeSingle();

    if (!emailErr && byEmail) {
      return {
        user: {
          id: byEmail.id,
          email: byEmail.email,
          nome: byEmail.nome,
          role: byEmail.perfil as Role,
        },
      };
    }
  }

  return {
    error:
      "Usuário autenticado, mas sem perfil cadastrado. " +
      "Faça logout e login novamente, ou solicite ao gestor que verifique seu cadastro em 'Usuários'.",
  };
}

// Tracks whether the auth state listener is already registered to avoid duplicates.
let authListenerRegistered = false;

async function applySession(userId: string, userEmail?: string) {
  const result = await fetchUserProfile(userId, userEmail);

  if ("error" in result) {
    setState((s) => ({ ...s, user: null, authError: result.error, authChecked: true }));
    return;
  }

  setState((s) => ({ ...s, user: result.user, authError: null, authChecked: true }));
  setupRealtime();
  void loadAll();
}

export async function initAuth() {
  // Always re-check the session; do not cache this across page loads.
  setState((s) => ({ ...s, authChecked: false }));

  const { data: sessData } = await supabase.auth.getSession();
  if (sessData.session) {
    await applySession(sessData.session.user.id, sessData.session.user.email);
  } else {
    setState((s) => ({ ...s, authChecked: true, authError: null }));
  }

  // Register the listener only once per browser session.
  if (!authListenerRegistered) {
    authListenerRegistered = true;
    supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION — we already handled it via getSession() above.
      if (event === "INITIAL_SESSION") return;

      if (session) {
        void applySession(session.user.id, session.user.email);
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
}

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

async function nextCodigo(prefix: "LOT" | "EST" | "EXP"): Promise<string> {
  // Find the highest sequence already used for this prefix to avoid reuse after deletions
  const { data } = await supabase
    .from("lotes")
    .select("codigo_lote")
    .like("codigo_lote", `${prefix}-%`)
    .order("codigo_lote", { ascending: false });

  let max = 0;
  for (const row of data ?? []) {
    // Match e.g. "LOT-0042" or "EST-0007-A" — extract the numeric part right after the prefix dash
    const m = row.codigo_lote.match(new RegExp(`^${prefix}-(\\d+)`));
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }

  const next = max + 1;
  const padded = String(next).padStart(4, "0");
  return `${prefix}-${padded}`;
}

// Keep a legacy wrapper used by callers that previously used nextCodigoLote()
async function nextCodigoLote(): Promise<string> {
  return nextCodigo("LOT");
}

async function logAudit(loteId: string, loteCodigo: string, acao: string, detalhes?: Record<string, unknown>) {
  const user = state.user;
  await supabase.from("historico_lotes").insert({
    lote_id: loteId,
    lote_codigo: loteCodigo,
    usuario_id: user?.id ?? null,
    usuario_nome: user?.nome ?? "Sistema",
    acao,
    detalhes: (detalhes ?? null) as never,
  });
}


// ===== Actions =====
export const actions = {
  async loginEmail(email: string, password: string) {
    setState((s) => ({ ...s, authError: null, authChecked: false }));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((s) => ({ ...s, user: null, authError: error.message, authChecked: true }));
      throw error;
    }
    const sessionUser = data.user ?? data.session?.user;
    if (!sessionUser) {
      const message = "Login concluído, mas não foi possível identificar o usuário.";
      setState((s) => ({ ...s, user: null, authError: message, authChecked: true }));
      throw new Error(message);
    }
    await applySession(sessionUser.id, sessionUser.email ?? email);
  },

  async signupEmail(email: string, password: string, nome: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome },
      },
    });
    if (error) throw error;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async refreshProfile() {
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) {
      await applySession(sess.session.user.id, sess.session.user.email);
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
        status: "recebido" as const,
        observacoes: input.observacoes ?? null,
        criado_por: userId,
        lote_tipo: "normal",
        peso_disponivel: input.pesoEntrada,
        consumido: false,
      })
      .select()
      .single();
    if (error) throw new Error(`Erro ao salvar lote: ${error.message}`);

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
    await logAudit(data.id, data.codigo_lote, "Cadastro de lote");
    return l;
  },

  async addEstoqueInicial(input: {
    tipoMaterialId: string;
    pesoAtual: number;
    custoEstimado: number;
    localizacao: string;
    dataReferencia: string;
    fotos: File[];
    observacoes?: string;
  }): Promise<Lote> {
    const localizacaoId = await ensureLocalizacao(input.localizacao);
    const codigo = await nextCodigo("EST");
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data, error } = await supabase
      .from("lotes")
      .insert({
        codigo_lote: codigo,
        material_id: input.tipoMaterialId,
        fornecedor_id: null,
        peso_bruto: input.pesoAtual,
        preco_kg_compra: input.custoEstimado,
        localizacao_id: localizacaoId,
        status: "estoque_inicial" as const,
        observacoes: input.observacoes ?? null,
        criado_por: userId,
        data_entrada: input.dataReferencia,
        data_referencia: input.dataReferencia,
        lote_tipo: "normal",
        peso_disponivel: input.pesoAtual,
        consumido: false,
      })
      .select()
      .single();
    if (error) throw new Error(`Erro ao salvar lote: ${error.message}`);

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
    await logAudit(data.id, data.codigo_lote, "Cadastro de estoque inicial");
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

  async venderLote(loteId: string, precoVenda: number, comprador = "Comprador", pesoVendido?: number) {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");

    const peso = pesoVendido ?? lote.pesoDisponivel;

    if (peso <= 0) throw new Error("Peso de venda deve ser maior que zero.");
    if (peso > lote.pesoDisponivel + 0.001) {
      throw new Error(
        `Peso solicitado (${fmtKg(peso)}) excede o disponível (${fmtKg(lote.pesoDisponivel)}).`
      );
    }

    const { error: e1 } = await supabase.from("vendas").insert({
      lote_id: loteId,
      comprador,
      peso_vendido: peso,
      preco_kg_venda: precoVenda,
    });
    if (e1) throw e1;

    const novoDisp = Math.max(0, lote.pesoDisponivel - peso);
    const isTotal = novoDisp <= 0.001;
    const novoStatus: DBStatus = isTotal ? "vendido_total" : "vendido_parcial";

    const { error: e2 } = await supabase
      .from("lotes")
      .update({
        status: novoStatus,
        peso_disponivel: novoDisp,
        consumido: isTotal,
      })
      .eq("id", loteId);
    if (e2) throw e2;

    await logAudit(loteId, lote.codigo, isTotal ? "Venda total" : "Venda parcial", {
      pesoVendido: peso,
      precoVenda,
      pesoRestante: novoDisp,
    });

    await loadAll();
  },

  async addFotos(loteId: string, files: File[]) {
    if (!files.length) return;
    await uploadFotos(loteId, files);
  },

  async removeFoto(loteId: string, fotoId: string) {
    const lote = state.lotes.find((l) => l.id === loteId);
    const foto = lote?.fotos.find((f) => f.id === fotoId);
    if (foto) {
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
      fornecedorId: string | null;
      custoUnitario: number;
      peso: number;
      status: StatusLote;
      localizacao: string;
      observacoes: string;
    }>
  ) {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");

    const update: Database["public"]["Tables"]["lotes"]["Update"] = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (patch.tipoMaterialId && patch.tipoMaterialId !== lote.tipoMaterialId) {
      before.material_id = lote.tipoMaterialId;
      after.material_id = patch.tipoMaterialId;
      update.material_id = patch.tipoMaterialId;
    }
    if (patch.fornecedorId !== undefined && patch.fornecedorId !== lote.fornecedorId) {
      before.fornecedor_id = lote.fornecedorId;
      after.fornecedor_id = patch.fornecedorId;
      update.fornecedor_id = patch.fornecedorId;
    }
    if (patch.custoUnitario !== undefined && patch.custoUnitario !== lote.custoUnitario) {
      before.preco_kg_compra = lote.custoUnitario;
      after.preco_kg_compra = patch.custoUnitario;
      update.preco_kg_compra = patch.custoUnitario;
    }
    if (patch.peso !== undefined && patch.peso !== lote.pesoEntrada) {
      before.peso_bruto = lote.pesoEntrada;
      after.peso_bruto = patch.peso;
      update.peso_bruto = patch.peso;
    }
    if (patch.status !== undefined) {
      const dbStatus = ((): DBStatus => {
        if (patch.status === "beneficiamento") return "em_beneficiamento";
        if (patch.status === "vendido") return "vendido_total";
        if (patch.status === "vendido_parcial") return "vendido_parcial";
        if (patch.status === "estoque_inicial") return "estoque_inicial";
        return "recebido";
      })();
      if (dbStatus !== lote.status) {
        before.status = lote.status;
        after.status = patch.status;
        update.status = dbStatus;
      }
    }
    if (patch.observacoes !== undefined && patch.observacoes !== lote.observacoes) {
      before.observacoes = lote.observacoes;
      after.observacoes = patch.observacoes;
      update.observacoes = patch.observacoes;
    }
    if (patch.localizacao && patch.localizacao !== lote.localizacao) {
      before.localizacao = lote.localizacao;
      after.localizacao = patch.localizacao;
      update.localizacao_id = await ensureLocalizacao(patch.localizacao);
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from("lotes").update(update).eq("id", loteId);
      if (error) throw error;
      await logAudit(loteId, lote.codigo, "Edição", { antes: before, depois: after });
      await loadAll();
    }
  },

  async deleteLote(loteId: string) {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");

    await logAudit(loteId, lote.codigo, "Exclusão", { material: lote.tipoMaterialId, peso: lote.pesoAtual });

    // Remove storage files for photos (fotos_lote rows are cascade-deleted by DB)
    for (const foto of lote.fotos) {
      const m = foto.url.match(/\/fotos-lote\/(.+)$/);
      if (m) {
        await supabase.storage.from("fotos-lote").remove([m[1]]);
      }
    }

    // Delete child rows that have NO ACTION foreign keys (order matters)
    const { error: eVendas } = await supabase.from("vendas").delete().eq("lote_id", loteId);
    if (eVendas) throw eVendas;

    const { error: eBenefs } = await supabase.from("beneficiamentos").delete().eq("lote_id", loteId);
    if (eBenefs) throw eBenefs;

    const { error: eMovs } = await supabase.from("movimentacoes").delete().eq("lote_id", loteId);
    if (eMovs) throw eMovs;

    const { error } = await supabase.from("lotes").delete().eq("id", loteId);
    if (error) throw error;

    await loadAll();
  },

  // Split a lot into sublots after beneficiamento.
  // sublotes: array of { tipoMaterialId, peso, custoEstimado, localizacao, observacoes? }
  // custoBenef: processing cost shared across all sublots
  async splitLote(
    loteId: string,
    custoBenef: number,
    sublotes: { tipoMaterialId: string; peso: number; custoEstimado: number; localizacao: string; observacoes?: string }[]
  ): Promise<void> {
    const lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) throw new Error("Lote não encontrado");

    const pesoTotal = sublotes.reduce((a, s) => a + s.peso, 0);
    if (pesoTotal > lote.pesoDisponivel + 0.001) {
      throw new Error(`Peso total dos sublotes (${pesoTotal.toFixed(1)} kg) excede o disponível (${lote.pesoDisponivel.toFixed(1)} kg)`);
    }

    const custoFinalPai = custoFinalKg(lote);
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

    // Register beneficiamento record on parent
    const { error: eBenef } = await supabase.from("beneficiamentos").insert({
      lote_id: loteId,
      peso_antes: lote.pesoAtual,
      peso_depois: 0,
      custo_beneficiamento: custoBenef,
      observacoes: `Split em ${sublotes.length} sublotes`,
    });
    if (eBenef) throw eBenef;

    // Create each sublote
    for (let i = 0; i < sublotes.length; i++) {
      const s = sublotes[i];
      const locId = await ensureLocalizacao(s.localizacao);
      const sufixo = String.fromCharCode(65 + i); // A, B, C...
      const codigo = `${lote.codigo}-${sufixo}`;
      const custoProporcional = custoFinalPai * s.peso + (custoBenef / pesoTotal) * s.peso;

      const { error: eIns } = await supabase.from("lotes").insert({
        codigo_lote: codigo,
        material_id: s.tipoMaterialId,
        fornecedor_id: lote.fornecedorId,
        peso_bruto: s.peso,
        preco_kg_compra: custoProporcional / s.peso,
        localizacao_id: locId,
        status: "recebido",
        observacoes: s.observacoes ?? null,
        criado_por: userId,
        sublote_pai_id: loteId,
        lote_tipo: "sublote",
        peso_disponivel: s.peso,
        consumido: false,
      });
      if (eIns) throw eIns;
    }

    // Mark parent as consumed / update its peso_disponivel to 0
    const { error: eUpd } = await supabase
      .from("lotes")
      .update({ peso_disponivel: 0, consumido: true, status: "em_beneficiamento" })
      .eq("id", loteId);
    if (eUpd) throw eUpd;

    await logAudit(loteId, lote.codigo, "Split em sublotes", {
      sublotes: sublotes.length,
      pesoTotal,
      custoBenef,
    });
    await loadAll();
  },

  // Compose an expedition lot from multiple source lots.
  // itens: array of { loteId, pesoUsado }
  async formarExpedicao(
    localizacao: string,
    observacoes: string | undefined,
    itens: { loteId: string; pesoUsado: number }[]
  ): Promise<string> {
    // Validate availability
    for (const item of itens) {
      const l = state.lotes.find((x) => x.id === item.loteId);
      if (!l) throw new Error(`Lote ${item.loteId} não encontrado`);
      if (item.pesoUsado <= 0) throw new Error(`Peso inválido para lote ${l.codigo}`);
      if (item.pesoUsado > l.pesoDisponivel + 0.001) {
        throw new Error(`Peso solicitado (${item.pesoUsado.toFixed(1)} kg) excede disponível (${l.pesoDisponivel.toFixed(1)} kg) no lote ${l.codigo}`);
      }
    }

    const pesoTotal = itens.reduce((a, i) => a + i.pesoUsado, 0);
    const custoTotal = itens.reduce((a, item) => {
      const l = state.lotes.find((x) => x.id === item.loteId)!;
      return a + custoFinalKg(l) * item.pesoUsado;
    }, 0);
    const custoPorKg = pesoTotal > 0 ? custoTotal / pesoTotal : 0;

    const locId = await ensureLocalizacao(localizacao);
    const codigo = await nextCodigo("EXP");
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

    // Create the expedition lot
    const { data: expLote, error: eExp } = await supabase
      .from("lotes")
      .insert({
        codigo_lote: codigo,
        material_id: state.lotes.find((l) => l.id === itens[0].loteId)!.tipoMaterialId,
        fornecedor_id: null,
        peso_bruto: pesoTotal,
        preco_kg_compra: custoPorKg,
        localizacao_id: locId,
        status: "recebido",
        observacoes: observacoes ?? null,
        criado_por: userId,
        lote_tipo: "expedicao",
        peso_disponivel: pesoTotal,
        consumido: false,
      })
      .select()
      .single();
    if (eExp) throw eExp;

    // Insert composicao_lotes rows and reduce source lots
    for (const item of itens) {
      const l = state.lotes.find((x) => x.id === item.loteId)!;
      const custoProp = custoFinalKg(l) * item.pesoUsado;

      const { error: eComp } = await supabase.from("composicao_lotes").insert({
        expedicao_lote_id: expLote.id,
        origem_lote_id: item.loteId,
        origem_lote_codigo: l.codigo,
        peso_usado: item.pesoUsado,
        custo_proporcional: custoProp,
        fornecedor_id: l.fornecedorId,
        material_id: l.tipoMaterialId,
      });
      if (eComp) throw eComp;

      const novoDisp = l.pesoDisponivel - item.pesoUsado;
      const { error: eUpd } = await supabase
        .from("lotes")
        .update({
          peso_disponivel: novoDisp,
          consumido: novoDisp <= 0.001,
        })
        .eq("id", item.loteId);
      if (eUpd) throw eUpd;
    }

    await logAudit(expLote.id, codigo, "Formação de lote de expedição", {
      itens: itens.length,
      pesoTotal,
      custoTotal,
    });
    await loadAll();
    return expLote.id;
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
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function fmtKg(n: number) {
  if (!Number.isFinite(n)) return "— kg";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}
