
-- ===== Enum: status da remessa =====
CREATE TYPE public.status_remessa AS ENUM ('aberta', 'em_industrializacao', 'retornada', 'encerrada');

-- ===== Adiciona valor ao enum status_lote =====
ALTER TYPE public.status_lote ADD VALUE IF NOT EXISTS 'em_industrializacao';

-- ===== Tabela: industrializadores =====
CREATE TABLE public.industrializadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf_cnpj text,
  cidade text,
  telefone text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.industrializadores TO authenticated;
GRANT ALL ON public.industrializadores TO service_role;
ALTER TABLE public.industrializadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read industrializadores" ON public.industrializadores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestor write industrializadores" ON public.industrializadores
  FOR ALL TO authenticated
  USING (public.is_gestor(auth.uid()))
  WITH CHECK (public.is_gestor(auth.uid()));

-- ===== Tabela: remessas_industrializacao =====
CREATE TABLE public.remessas_industrializacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  data_envio date NOT NULL DEFAULT CURRENT_DATE,
  data_retorno date,
  industrializador_id uuid NOT NULL REFERENCES public.industrializadores(id) ON DELETE RESTRICT,
  observacoes text,
  status public.status_remessa NOT NULL DEFAULT 'aberta',
  custo_industrializacao numeric(18,2) NOT NULL DEFAULT 0,
  frete_ida numeric(18,2) NOT NULL DEFAULT 0,
  frete_volta numeric(18,2) NOT NULL DEFAULT 0,
  outros_custos numeric(18,2) NOT NULL DEFAULT 0,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remessas_industrializacao TO authenticated;
GRANT ALL ON public.remessas_industrializacao TO service_role;
ALTER TABLE public.remessas_industrializacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read remessas" ON public.remessas_industrializacao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert remessas" ON public.remessas_industrializacao
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update remessas" ON public.remessas_industrializacao
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "gestor delete remessas" ON public.remessas_industrializacao
  FOR DELETE TO authenticated USING (public.is_gestor(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_remessa_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_remessa_touch BEFORE UPDATE ON public.remessas_industrializacao
  FOR EACH ROW EXECUTE FUNCTION public.touch_remessa_updated();

-- ===== Tabela junção: remessa_lotes (lotes enviados) =====
CREATE TABLE public.remessa_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remessa_id uuid NOT NULL REFERENCES public.remessas_industrializacao(id) ON DELETE CASCADE,
  lote_id uuid NOT NULL REFERENCES public.lotes(id) ON DELETE RESTRICT,
  peso_enviado numeric(18,3) NOT NULL,
  custo_proporcional numeric(18,2) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (remessa_id, lote_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remessa_lotes TO authenticated;
GRANT ALL ON public.remessa_lotes TO service_role;
ALTER TABLE public.remessa_lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all remessa_lotes" ON public.remessa_lotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== Tabela: remessa_retornos (produtos retornados) =====
CREATE TABLE public.remessa_retornos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remessa_id uuid NOT NULL REFERENCES public.remessas_industrializacao(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materiais(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  peso_retornado numeric(18,3) NOT NULL,
  aproveitavel boolean NOT NULL DEFAULT true,
  custo_unitario_calculado numeric(18,6) NOT NULL DEFAULT 0,
  lote_gerado_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remessa_retornos TO authenticated;
GRANT ALL ON public.remessa_retornos TO service_role;
ALTER TABLE public.remessa_retornos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all remessa_retornos" ON public.remessa_retornos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== Coluna em lotes: vínculo com remessa de origem (retorno) =====
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS remessa_origem_id uuid REFERENCES public.remessas_industrializacao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_remessa_lotes_remessa ON public.remessa_lotes(remessa_id);
CREATE INDEX IF NOT EXISTS idx_remessa_lotes_lote ON public.remessa_lotes(lote_id);
CREATE INDEX IF NOT EXISTS idx_remessa_retornos_remessa ON public.remessa_retornos(remessa_id);
CREATE INDEX IF NOT EXISTS idx_lotes_remessa_origem ON public.lotes(remessa_origem_id);
