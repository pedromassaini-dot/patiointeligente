
-- ENUMS
CREATE TYPE public.perfil_usuario AS ENUM ('operador', 'gestor');
CREATE TYPE public.status_lote AS ENUM ('recebido', 'em_beneficiamento', 'pronto', 'vendido_parcial', 'vendido_total');
CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada', 'transferencia', 'beneficiamento', 'venda', 'ajuste');

-- USUARIOS (perfil ligado a auth.users)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil public.perfil_usuario NOT NULL DEFAULT 'operador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função SECURITY DEFINER para checagem de perfil (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.tem_perfil(_user_id UUID, _perfil public.perfil_usuario)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = _user_id AND perfil = _perfil AND ativo = true
  )
$$;

CREATE OR REPLACE FUNCTION public.usuario_ativo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND ativo = true)
$$;

-- Trigger para criar usuario automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'perfil')::public.perfil_usuario, 'operador')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FORNECEDORES
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  cidade TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MATERIAIS
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LOCALIZACOES PATIO
CREATE TABLE public.localizacoes_patio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LOTES
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_lote TEXT NOT NULL UNIQUE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE RESTRICT,
  peso_bruto NUMERIC(12,3) NOT NULL CHECK (peso_bruto > 0),
  preco_kg_compra NUMERIC(12,4) NOT NULL CHECK (preco_kg_compra >= 0),
  custo_total_compra NUMERIC(14,2) GENERATED ALWAYS AS (peso_bruto * preco_kg_compra) STORED,
  data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  localizacao_id UUID REFERENCES public.localizacoes_patio(id) ON DELETE SET NULL,
  status public.status_lote NOT NULL DEFAULT 'recebido',
  observacoes TEXT,
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lotes_status ON public.lotes(status);
CREATE INDEX idx_lotes_fornecedor ON public.lotes(fornecedor_id);
CREATE INDEX idx_lotes_material ON public.lotes(material_id);
CREATE INDEX idx_lotes_localizacao ON public.lotes(localizacao_id);
CREATE INDEX idx_lotes_data ON public.lotes(data_entrada DESC);

-- FOTOS LOTE
CREATE TABLE public.fotos_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  url_foto TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fotos_lote ON public.fotos_lote(lote_id);

-- BENEFICIAMENTOS
CREATE TABLE public.beneficiamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  peso_antes NUMERIC(12,3) NOT NULL CHECK (peso_antes > 0),
  peso_depois NUMERIC(12,3) NOT NULL CHECK (peso_depois >= 0),
  perda_kg NUMERIC(12,3) GENERATED ALWAYS AS (peso_antes - peso_depois) STORED,
  perda_percentual NUMERIC(6,3) GENERATED ALWAYS AS (
    CASE WHEN peso_antes > 0 THEN ((peso_antes - peso_depois) / peso_antes) * 100 ELSE 0 END
  ) STORED,
  custo_beneficiamento NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (custo_beneficiamento >= 0),
  custo_final_kg NUMERIC(12,4),
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_beneficiamentos_lote ON public.beneficiamentos(lote_id);

-- MOVIMENTACOES
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  tipo_movimentacao public.tipo_movimentacao NOT NULL,
  localizacao_origem_id UUID REFERENCES public.localizacoes_patio(id) ON DELETE SET NULL,
  localizacao_destino_id UUID REFERENCES public.localizacoes_patio(id) ON DELETE SET NULL,
  peso_movimentado NUMERIC(12,3),
  observacoes TEXT,
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movs_lote ON public.movimentacoes(lote_id);
CREATE INDEX idx_movs_tipo ON public.movimentacoes(tipo_movimentacao);
CREATE INDEX idx_movs_data ON public.movimentacoes(criado_em DESC);

-- VENDAS
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE RESTRICT,
  comprador TEXT NOT NULL,
  peso_vendido NUMERIC(12,3) NOT NULL CHECK (peso_vendido > 0),
  preco_kg_venda NUMERIC(12,4) NOT NULL CHECK (preco_kg_venda >= 0),
  receita_total NUMERIC(14,2) GENERATED ALWAYS AS (peso_vendido * preco_kg_venda) STORED,
  custo_proporcional NUMERIC(14,2) NOT NULL DEFAULT 0,
  margem_estimada NUMERIC(14,2) GENERATED ALWAYS AS ((peso_vendido * preco_kg_venda) - custo_proporcional) STORED,
  data_venda TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendas_lote ON public.vendas(lote_id);
CREATE INDEX idx_vendas_data ON public.vendas(data_venda DESC);

-- ENABLE RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacoes_patio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- POLICIES: USUARIOS
CREATE POLICY "Usuario ve proprio registro" ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Usuario atualiza proprio nome" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND perfil = (SELECT perfil FROM public.usuarios WHERE id = auth.uid()));

CREATE POLICY "Gestor gerencia usuarios" ON public.usuarios
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'gestor'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'gestor'));

-- POLICIES: cadastros base (fornecedores, materiais, localizacoes) — leitura por todos autenticados; escrita por gestor
CREATE POLICY "Autenticado le fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor gerencia fornecedores" ON public.fornecedores FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'gestor')) WITH CHECK (public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Autenticado le materiais" ON public.materiais FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor gerencia materiais" ON public.materiais FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'gestor')) WITH CHECK (public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Autenticado le localizacoes" ON public.localizacoes_patio FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor gerencia localizacoes" ON public.localizacoes_patio FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'gestor')) WITH CHECK (public.tem_perfil(auth.uid(), 'gestor'));

-- POLICIES: operacionais (lotes, fotos, beneficiamentos, movimentacoes, vendas) — operador e gestor podem inserir/atualizar; só gestor exclui
CREATE POLICY "Autenticado le lotes" ON public.lotes FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere lotes" ON public.lotes FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado atualiza lotes" ON public.lotes FOR UPDATE TO authenticated USING (public.usuario_ativo(auth.uid())) WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor exclui lotes" ON public.lotes FOR DELETE TO authenticated USING (public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Autenticado le fotos" ON public.fotos_lote FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere fotos" ON public.fotos_lote FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado atualiza fotos" ON public.fotos_lote FOR UPDATE TO authenticated USING (public.usuario_ativo(auth.uid())) WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor exclui fotos" ON public.fotos_lote FOR DELETE TO authenticated USING (public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Autenticado le beneficiamentos" ON public.beneficiamentos FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere beneficiamentos" ON public.beneficiamentos FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado atualiza beneficiamentos" ON public.beneficiamentos FOR UPDATE TO authenticated USING (public.usuario_ativo(auth.uid())) WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor exclui beneficiamentos" ON public.beneficiamentos FOR DELETE TO authenticated USING (public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Autenticado le movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor gerencia movimentacoes" ON public.movimentacoes FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'gestor')) WITH CHECK (public.tem_perfil(auth.uid(), 'gestor'));

CREATE POLICY "Autenticado le vendas" ON public.vendas FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere vendas" ON public.vendas FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado atualiza vendas" ON public.vendas FOR UPDATE TO authenticated USING (public.usuario_ativo(auth.uid())) WITH CHECK (public.usuario_ativo(auth.uid()));
CREATE POLICY "Gestor exclui vendas" ON public.vendas FOR DELETE TO authenticated USING (public.tem_perfil(auth.uid(), 'gestor'));
