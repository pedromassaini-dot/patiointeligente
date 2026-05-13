/*
  # Add estoque_inicial status to lotes

  ## Changes
  1. Adds new enum value `estoque_inicial` to `status_lote`
  2. Makes `fornecedor_id` nullable on `lotes` so estoque inicial entries
     don't need a supplier
  3. Adds `data_referencia` column to `lotes` for the reference date on
     estoque inicial entries (e.g. the date the material was already on site)

  ## Notes
  - Existing rows are unaffected
  - `fornecedor_id` already had no NOT NULL enforcement in most migrations;
    this migration explicitly makes it nullable and removes the constraint
    if it exists
*/

-- Add new enum value (Postgres requires ALTER TYPE for this)
ALTER TYPE status_lote ADD VALUE IF NOT EXISTS 'estoque_inicial';

-- Make fornecedor_id nullable
ALTER TABLE public.lotes
  ALTER COLUMN fornecedor_id DROP NOT NULL;

-- Add data_referencia column for the reference date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lotes' AND column_name = 'data_referencia'
  ) THEN
    ALTER TABLE public.lotes ADD COLUMN data_referencia date;
  END IF;
END $$;
