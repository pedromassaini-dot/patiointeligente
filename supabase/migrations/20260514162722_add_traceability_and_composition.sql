/*
  # Rastreabilidade e Composição de Lotes

  ## Summary
  Adds full traceability for lot splitting (beneficiamento with sublot generation)
  and lot composition for shipping/expedition.

  ## New columns on lotes
  - `sublote_pai_id` (uuid, nullable FK → lotes.id SET NULL on delete)
    Identifies the parent lot when this lot was generated as a sublot.
  - `lote_tipo` (text, default 'normal')
    'normal' | 'sublote' | 'expedicao'
    Marks whether this is a regular purchased lot, a sublot from splitting,
    or a composed expedition lot.
  - `peso_disponivel` (numeric, nullable)
    Tracks the remaining weight available for composition/sale.
    NULL means use pesoAtual logic. Set explicitly when weight is partially consumed.
  - `consumido` (boolean, default false)
    Marked true when peso_disponivel reaches zero.

  ## New table: composicao_lotes
  Records which source lots contributed weight to an expedition/composed lot.
  - id, expedicao_lote_id → lotes.id, origem_lote_id → lotes.id (SET NULL)
  - peso_usado, custo_proporcional, fornecedor_id, material_id (denormalized for reporting)

  ## Security
  - RLS enabled on composicao_lotes
  - SELECT/INSERT for authenticated users
  - DELETE for authenticated users (needed when expedition lot is deleted)
*/

-- Add traceability columns to lotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lotes' AND column_name = 'sublote_pai_id'
  ) THEN
    ALTER TABLE lotes ADD COLUMN sublote_pai_id uuid REFERENCES lotes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lotes' AND column_name = 'lote_tipo'
  ) THEN
    ALTER TABLE lotes ADD COLUMN lote_tipo text NOT NULL DEFAULT 'normal';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lotes' AND column_name = 'peso_disponivel'
  ) THEN
    ALTER TABLE lotes ADD COLUMN peso_disponivel numeric(10,3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lotes' AND column_name = 'consumido'
  ) THEN
    ALTER TABLE lotes ADD COLUMN consumido boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create composicao_lotes table
CREATE TABLE IF NOT EXISTS composicao_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expedicao_lote_id uuid REFERENCES lotes(id) ON DELETE CASCADE,
  origem_lote_id uuid REFERENCES lotes(id) ON DELETE SET NULL,
  origem_lote_codigo text NOT NULL DEFAULT '',
  peso_usado numeric(10,3) NOT NULL,
  custo_proporcional numeric(12,2) NOT NULL DEFAULT 0,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE SET NULL,
  material_id uuid REFERENCES materiais(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE composicao_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "composicao_select"
  ON composicao_lotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "composicao_insert"
  ON composicao_lotes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "composicao_delete"
  ON composicao_lotes FOR DELETE
  TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_lotes_sublote_pai ON lotes(sublote_pai_id) WHERE sublote_pai_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_composicao_expedicao ON composicao_lotes(expedicao_lote_id);
CREATE INDEX IF NOT EXISTS idx_composicao_origem ON composicao_lotes(origem_lote_id);
