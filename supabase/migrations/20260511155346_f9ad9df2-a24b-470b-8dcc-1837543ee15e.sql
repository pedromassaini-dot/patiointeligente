-- 1) Storage bucket para fotos de lote
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-lote', 'fotos-lote', true)
ON CONFLICT (id) DO NOTHING;

-- Policies storage
DROP POLICY IF EXISTS "fotos lote leitura publica" ON storage.objects;
CREATE POLICY "fotos lote leitura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-lote');

DROP POLICY IF EXISTS "fotos lote insert autenticado" ON storage.objects;
CREATE POLICY "fotos lote insert autenticado"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-lote');

DROP POLICY IF EXISTS "fotos lote update autenticado" ON storage.objects;
CREATE POLICY "fotos lote update autenticado"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-lote');

DROP POLICY IF EXISTS "fotos lote delete autenticado" ON storage.objects;
CREATE POLICY "fotos lote delete autenticado"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-lote');

-- 2) Triggers de cálculo automático
CREATE OR REPLACE FUNCTION public.calc_lote()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.custo_total_compra := COALESCE(NEW.peso_bruto, 0) * COALESCE(NEW.preco_kg_compra, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_lote ON public.lotes;
CREATE TRIGGER trg_calc_lote
  BEFORE INSERT OR UPDATE ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.calc_lote();

CREATE OR REPLACE FUNCTION public.calc_beneficiamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_custo_compra numeric;
BEGIN
  NEW.perda_kg := GREATEST(0, COALESCE(NEW.peso_antes,0) - COALESCE(NEW.peso_depois,0));
  NEW.perda_percentual := CASE WHEN COALESCE(NEW.peso_antes,0) > 0
    THEN (NEW.perda_kg / NEW.peso_antes) * 100 ELSE 0 END;
  SELECT custo_total_compra INTO v_custo_compra FROM public.lotes WHERE id = NEW.lote_id;
  NEW.custo_final_kg := CASE WHEN COALESCE(NEW.peso_depois,0) > 0
    THEN (COALESCE(v_custo_compra,0) + COALESCE(NEW.custo_beneficiamento,0)) / NEW.peso_depois
    ELSE NULL END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_beneficiamento ON public.beneficiamentos;
CREATE TRIGGER trg_calc_beneficiamento
  BEFORE INSERT OR UPDATE ON public.beneficiamentos
  FOR EACH ROW EXECUTE FUNCTION public.calc_beneficiamento();

CREATE OR REPLACE FUNCTION public.calc_venda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_custo_final numeric;
  v_custo_compra numeric;
  v_peso_bruto numeric;
BEGIN
  NEW.receita_total := COALESCE(NEW.peso_vendido,0) * COALESCE(NEW.preco_kg_venda,0);
  -- pega último custo final do beneficiamento, senão custo de compra unitário
  SELECT custo_final_kg INTO v_custo_final
    FROM public.beneficiamentos WHERE lote_id = NEW.lote_id
    ORDER BY criado_em DESC LIMIT 1;
  IF v_custo_final IS NULL THEN
    SELECT custo_total_compra, peso_bruto INTO v_custo_compra, v_peso_bruto
      FROM public.lotes WHERE id = NEW.lote_id;
    v_custo_final := CASE WHEN COALESCE(v_peso_bruto,0) > 0
      THEN v_custo_compra / v_peso_bruto ELSE 0 END;
  END IF;
  NEW.custo_proporcional := COALESCE(NEW.peso_vendido,0) * COALESCE(v_custo_final,0);
  NEW.margem_estimada := NEW.receita_total - NEW.custo_proporcional;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_venda ON public.vendas;
CREATE TRIGGER trg_calc_venda
  BEFORE INSERT OR UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.calc_venda();

-- 3) Realtime para todas as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.lotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fotos_lote;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fornecedores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materiais;
ALTER PUBLICATION supabase_realtime ADD TABLE public.localizacoes_patio;