
-- Add estoque_inicial to status enum
ALTER TYPE public.status_lote ADD VALUE IF NOT EXISTS 'estoque_inicial';

-- Add missing columns to lotes
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS peso_disponivel numeric(12,3),
  ADD COLUMN IF NOT EXISTS consumido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lote_tipo text NOT NULL DEFAULT 'compra',
  ADD COLUMN IF NOT EXISTS sublote_pai_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_referencia timestamptz;

ALTER TABLE public.lotes ALTER COLUMN fornecedor_id DROP NOT NULL;

UPDATE public.lotes SET peso_disponivel = peso_bruto WHERE peso_disponivel IS NULL;

-- historico_lotes table
CREATE TABLE IF NOT EXISTS public.historico_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  lote_codigo text NOT NULL DEFAULT '',
  usuario_id uuid,
  usuario_nome text NOT NULL DEFAULT 'Sistema',
  acao text NOT NULL,
  detalhes jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_lotes TO authenticated;
GRANT ALL ON public.historico_lotes TO service_role;

ALTER TABLE public.historico_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read historico" ON public.historico_lotes;
CREATE POLICY "Authenticated can read historico" ON public.historico_lotes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert historico" ON public.historico_lotes;
CREATE POLICY "Authenticated can insert historico" ON public.historico_lotes FOR INSERT TO authenticated WITH CHECK (true);

-- composicao_lotes table
CREATE TABLE IF NOT EXISTS public.composicao_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expedicao_lote_id uuid REFERENCES public.lotes(id) ON DELETE CASCADE,
  origem_lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  origem_lote_codigo text NOT NULL DEFAULT '',
  peso_usado numeric(12,3) NOT NULL,
  custo_proporcional numeric(14,2) NOT NULL DEFAULT 0,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materiais(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composicao_lotes TO authenticated;
GRANT ALL ON public.composicao_lotes TO service_role;

ALTER TABLE public.composicao_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read composicao" ON public.composicao_lotes;
CREATE POLICY "Authenticated can read composicao" ON public.composicao_lotes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert composicao" ON public.composicao_lotes;
CREATE POLICY "Authenticated can insert composicao" ON public.composicao_lotes FOR INSERT TO authenticated WITH CHECK (true);
