/*
  # Add DELETE RLS policies for lote deletion

  ## Summary
  The delete operation on lotes was silently blocked because no DELETE RLS policies
  existed on lotes, beneficiamentos, movimentacoes, or vendas tables.

  ## Changes
  - Add DELETE policy on lotes (authenticated users)
  - Add DELETE policy on beneficiamentos (authenticated users)
  - Add DELETE policy on movimentacoes (authenticated users)
  - Add DELETE policy on vendas (authenticated users)

  ## Notes
  Gestor-only enforcement is handled in the frontend. The DB policies allow any
  authenticated user to delete, consistent with the existing INSERT/SELECT/UPDATE
  policies on these tables.
*/

CREATE POLICY "lotes_delete"
  ON lotes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "beneficiamentos_delete"
  ON beneficiamentos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "movimentacoes_delete"
  ON movimentacoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "vendas_delete"
  ON vendas FOR DELETE
  TO authenticated
  USING (true);
