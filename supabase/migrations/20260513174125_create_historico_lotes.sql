/*
  # Create historico_lotes (audit log for lote changes)

  ## New Tables
  - `historico_lotes`
    - `id` (uuid, pk)
    - `lote_id` (uuid, FK → lotes.id, nullable — kept after deletion)
    - `lote_codigo` (text) — stored at write time so it survives deletion
    - `usuario_id` (uuid, FK → usuarios.id, nullable)
    - `usuario_nome` (text) — stored at write time
    - `acao` (text) — e.g. "Edição", "Exclusão", "Cadastro de estoque inicial"
    - `detalhes` (jsonb) — optional before/after payload
    - `criado_em` (timestamptz, default now())

  ## Security
  - RLS enabled
  - Authenticated users can INSERT (app writes the log)
  - Authenticated users can SELECT their own org's data
    (since there's no multi-tenant model yet, all authenticated users may read)
  - Nobody can UPDATE or DELETE audit rows (immutable)
*/

CREATE TABLE IF NOT EXISTS public.historico_lotes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id      uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  lote_codigo  text NOT NULL DEFAULT '',
  usuario_id   uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  usuario_nome text NOT NULL DEFAULT '',
  acao         text NOT NULL,
  detalhes     jsonb,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert audit rows"
  ON public.historico_lotes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read audit rows"
  ON public.historico_lotes FOR SELECT
  TO authenticated
  USING (true);
