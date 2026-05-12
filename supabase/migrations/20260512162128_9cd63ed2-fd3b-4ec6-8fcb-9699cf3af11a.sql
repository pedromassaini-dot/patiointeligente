CREATE OR REPLACE FUNCTION public.usuario_ativo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE ativo = true
      AND (
        id = _user_id
        OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.tem_perfil(_user_id uuid, _perfil perfil_usuario)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE perfil = _perfil
      AND ativo = true
      AND (
        id = _user_id
        OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE perfil = 'gestor'
      AND ativo = true
      AND (
        id = _user_id
        OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$function$;

DROP POLICY IF EXISTS "Usuario le registro pelo proprio email" ON public.usuarios;
CREATE POLICY "Usuario le registro pelo proprio email"
ON public.usuarios
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "Usuario atualiza proprio registro" ON public.usuarios;
CREATE POLICY "Usuario atualiza proprio registro"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());