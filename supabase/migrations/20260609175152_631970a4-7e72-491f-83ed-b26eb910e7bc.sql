ALTER TABLE public.vendas DROP COLUMN receita_total;
ALTER TABLE public.vendas DROP COLUMN margem_estimada;
ALTER TABLE public.lotes DROP COLUMN custo_total_compra;
ALTER TABLE public.vendas ALTER COLUMN preco_kg_venda TYPE numeric(18,6);
ALTER TABLE public.lotes ALTER COLUMN preco_kg_compra TYPE numeric(18,6);
ALTER TABLE public.lotes ADD COLUMN custo_total_compra numeric(18,2) GENERATED ALWAYS AS (round(peso_bruto * preco_kg_compra, 2)) STORED;
ALTER TABLE public.vendas ADD COLUMN receita_total numeric(18,2) GENERATED ALWAYS AS (round(peso_vendido * preco_kg_venda, 2)) STORED;
ALTER TABLE public.vendas ADD COLUMN margem_estimada numeric(18,2) GENERATED ALWAYS AS (round(peso_vendido * preco_kg_venda, 2) - custo_proporcional) STORED;