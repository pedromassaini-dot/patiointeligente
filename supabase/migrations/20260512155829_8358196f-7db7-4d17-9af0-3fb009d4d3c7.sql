
-- Drop existing policies on usuarios
DROP POLICY IF EXISTS "Usuario ve proprio registro" ON public.usuarios;
DROP POLICY IF EXISTS "Usuario atualiza proprio nome" ON public.usuarios;
DROP POLICY IF EXISTS "Gestor gerencia usuarios" ON public.usuarios;

-- Security definer function to check gestor role without recursion
CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = _user_id AND perfil = 'gestor' AND ativo = true
  )
$$;

-- SELECT: user sees own row, gestor sees all
CREATE POLICY "Usuario le proprio registro"
ON public.usuarios FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Gestor le todos usuarios"
ON public.usuarios FOR SELECT
TO authenticated
USING (public.is_gestor(auth.uid()));

-- INSERT: user can insert own row (id must match auth.uid())
CREATE POLICY "Usuario insere proprio registro"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: user updates own row but cannot change own perfil
CREATE POLICY "Usuario atualiza proprio registro"
ON public.usuarios FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND perfil = (SELECT perfil FROM public.usuarios WHERE id = auth.uid())
);

-- Gestor can manage all users (update perfil, ativo)
CREATE POLICY "Gestor atualiza usuarios"
ON public.usuarios FOR UPDATE
TO authenticated
USING (public.is_gestor(auth.uid()))
WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "Gestor exclui usuarios"
ON public.usuarios FOR DELETE
TO authenticated
USING (public.is_gestor(auth.uid()));
