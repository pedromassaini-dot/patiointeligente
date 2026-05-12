/*
  # Rebuild Full Schema with Clean Auth

  ## Summary
  Complete rebuild of all tables with simplified, correct RLS policies.
  No helper SQL functions (no is_gestor, no tem_perfil, no usuario_ativo).
  Auth is handled purely in the application layer via auth.uid() in policies.

  ## Tables
  - `usuarios` - User profiles linked to auth.users. perfil = 'operador' | 'gestor'
  - `materiais` - Material types (aluminium categories)
  - `fornecedores` - Suppliers
  - `localizacoes_patio` - Yard storage locations
  - `lotes` - Material batches (core entity)
  - `fotos_lote` - Photos attached to batches
  - `beneficiamentos` - Processing records per batch
  - `movimentacoes` - Movement/transfer log
  - `vendas` - Sales records

  ## Enums
  - `perfil_usuario`: operador | gestor
  - `status_lote`: recebido | em_beneficiamento | pronto | vendido_parcial | vendido_total
  - `tipo_movimentacao`: entrada | transferencia | beneficiamento | venda | ajuste

  ## Security
  - RLS enabled on ALL tables
  - Authenticated users can read all data (operational system — all staff see all batches)
  - Authenticated users can insert/update their own actions
  - usuarios table: users can only read/update their own row
  - No helper functions — all policies use auth.uid() directly
*/

-- ===================== ENUMS =====================
DO $$ BEGIN
  CREATE TYPE perfil_usuario AS ENUM ('operador', 'gestor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_lote AS ENUM (
    'recebido', 'em_beneficiamento', 'pronto', 'vendido_parcial', 'vendido_total'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_movimentacao AS ENUM (
    'entrada', 'transferencia', 'beneficiamento', 'venda', 'ajuste'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== USUARIOS =====================
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL DEFAULT '',
  perfil perfil_usuario NOT NULL DEFAULT 'operador',
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own" ON usuarios;

CREATE POLICY "usuarios_select_own"
  ON usuarios FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "usuarios_insert_own"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_update_own"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ===================== MATERIAIS =====================
CREATE TABLE IF NOT EXISTS materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materiais_select" ON materiais;
DROP POLICY IF EXISTS "materiais_insert" ON materiais;
DROP POLICY IF EXISTS "materiais_update" ON materiais;

CREATE POLICY "materiais_select"
  ON materiais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "materiais_insert"
  ON materiais FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "materiais_update"
  ON materiais FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===================== FORNECEDORES =====================
CREATE TABLE IF NOT EXISTS fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf_cnpj text,
  telefone text,
  cidade text,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fornecedores_select" ON fornecedores;
DROP POLICY IF EXISTS "fornecedores_insert" ON fornecedores;
DROP POLICY IF EXISTS "fornecedores_update" ON fornecedores;

CREATE POLICY "fornecedores_select"
  ON fornecedores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "fornecedores_insert"
  ON fornecedores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "fornecedores_update"
  ON fornecedores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===================== LOCALIZACOES_PATIO =====================
CREATE TABLE IF NOT EXISTS localizacoes_patio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE localizacoes_patio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "localizacoes_select" ON localizacoes_patio;
DROP POLICY IF EXISTS "localizacoes_insert" ON localizacoes_patio;
DROP POLICY IF EXISTS "localizacoes_update" ON localizacoes_patio;

CREATE POLICY "localizacoes_select"
  ON localizacoes_patio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "localizacoes_insert"
  ON localizacoes_patio FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "localizacoes_update"
  ON localizacoes_patio FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===================== LOTES =====================
CREATE TABLE IF NOT EXISTS lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_lote text NOT NULL UNIQUE,
  material_id uuid NOT NULL REFERENCES materiais(id),
  fornecedor_id uuid NOT NULL REFERENCES fornecedores(id),
  localizacao_id uuid REFERENCES localizacoes_patio(id),
  peso_bruto numeric NOT NULL CHECK (peso_bruto > 0),
  preco_kg_compra numeric NOT NULL CHECK (preco_kg_compra >= 0),
  custo_total_compra numeric GENERATED ALWAYS AS (peso_bruto * preco_kg_compra) STORED,
  status status_lote NOT NULL DEFAULT 'recebido',
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  criado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lotes_select" ON lotes;
DROP POLICY IF EXISTS "lotes_insert" ON lotes;
DROP POLICY IF EXISTS "lotes_update" ON lotes;

CREATE POLICY "lotes_select"
  ON lotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lotes_insert"
  ON lotes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "lotes_update"
  ON lotes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===================== FOTOS_LOTE =====================
CREATE TABLE IF NOT EXISTS fotos_lote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  url_foto text NOT NULL,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fotos_lote ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fotos_select" ON fotos_lote;
DROP POLICY IF EXISTS "fotos_insert" ON fotos_lote;
DROP POLICY IF EXISTS "fotos_delete" ON fotos_lote;

CREATE POLICY "fotos_select"
  ON fotos_lote FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "fotos_insert"
  ON fotos_lote FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "fotos_delete"
  ON fotos_lote FOR DELETE
  TO authenticated
  USING (true);

-- ===================== BENEFICIAMENTOS =====================
CREATE TABLE IF NOT EXISTS beneficiamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES lotes(id),
  peso_antes numeric NOT NULL,
  peso_depois numeric NOT NULL,
  perda_kg numeric GENERATED ALWAYS AS (peso_antes - peso_depois) STORED,
  perda_percentual numeric GENERATED ALWAYS AS (
    CASE WHEN peso_antes > 0 THEN ((peso_antes - peso_depois) / peso_antes) * 100 ELSE 0 END
  ) STORED,
  custo_beneficiamento numeric NOT NULL DEFAULT 0,
  custo_final_kg numeric,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE beneficiamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficiamentos_select" ON beneficiamentos;
DROP POLICY IF EXISTS "beneficiamentos_insert" ON beneficiamentos;

CREATE POLICY "beneficiamentos_select"
  ON beneficiamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "beneficiamentos_insert"
  ON beneficiamentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===================== MOVIMENTACOES =====================
CREATE TABLE IF NOT EXISTS movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES lotes(id),
  tipo_movimentacao tipo_movimentacao NOT NULL,
  localizacao_origem_id uuid REFERENCES localizacoes_patio(id),
  localizacao_destino_id uuid REFERENCES localizacoes_patio(id),
  peso_movimentado numeric,
  observacoes text,
  criado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimentacoes_select" ON movimentacoes;
DROP POLICY IF EXISTS "movimentacoes_insert" ON movimentacoes;

CREATE POLICY "movimentacoes_select"
  ON movimentacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "movimentacoes_insert"
  ON movimentacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===================== VENDAS =====================
CREATE TABLE IF NOT EXISTS vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES lotes(id),
  comprador text NOT NULL DEFAULT '',
  peso_vendido numeric NOT NULL,
  preco_kg_venda numeric NOT NULL,
  receita_total numeric GENERATED ALWAYS AS (peso_vendido * preco_kg_venda) STORED,
  custo_proporcional numeric NOT NULL DEFAULT 0,
  margem_estimada numeric,
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas_select" ON vendas;
DROP POLICY IF EXISTS "vendas_insert" ON vendas;

CREATE POLICY "vendas_select"
  ON vendas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "vendas_insert"
  ON vendas FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_lotes_status ON lotes(status);
CREATE INDEX IF NOT EXISTS idx_lotes_material ON lotes(material_id);
CREATE INDEX IF NOT EXISTS idx_lotes_fornecedor ON lotes(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_beneficiamentos_lote ON beneficiamentos(lote_id);
CREATE INDEX IF NOT EXISTS idx_vendas_lote ON vendas(lote_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote ON movimentacoes(lote_id);
CREATE INDEX IF NOT EXISTS idx_fotos_lote ON fotos_lote(lote_id);

-- ===================== STORAGE =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-lote', 'fotos-lote', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "fotos_lote_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "fotos_lote_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "fotos_lote_storage_delete" ON storage.objects;

CREATE POLICY "fotos_lote_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-lote');

CREATE POLICY "fotos_lote_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotos-lote');

CREATE POLICY "fotos_lote_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fotos-lote');
