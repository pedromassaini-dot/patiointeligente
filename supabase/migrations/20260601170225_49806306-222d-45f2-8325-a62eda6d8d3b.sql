-- 1) Tighten RLS guard functions (remove email OR branch)
CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = 'gestor' AND ativo = true)
$$;

CREATE OR REPLACE FUNCTION public.tem_perfil(_user_id uuid, _perfil public.perfil_usuario)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = _perfil AND ativo = true)
$$;

CREATE OR REPLACE FUNCTION public.usuario_ativo(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND ativo = true)
$$;

-- 2) Prevent privilege escalation on usuarios
DROP POLICY IF EXISTS "Usuario insere proprio registro" ON public.usuarios;
CREATE POLICY "Usuario insere proprio registro como operador"
ON public.usuarios FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND perfil = 'operador');

-- Trigger blocks self-promotion via UPDATE while keeping the existing
-- "Usuario atualiza proprio registro" policy in place for non-sensitive fields.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.perfil IS DISTINCT FROM OLD.perfil OR NEW.ativo IS DISTINCT FROM OLD.ativo)
     AND NOT public.is_gestor(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas gestores podem alterar perfil ou status do usuario';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_prevent_escalation ON public.usuarios;
CREATE TRIGGER usuarios_prevent_escalation
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 3) Tighten composicao_lotes & historico_lotes (replace permissive true policies)
DROP POLICY IF EXISTS "Authenticated can insert composicao" ON public.composicao_lotes;
DROP POLICY IF EXISTS "Authenticated can read composicao" ON public.composicao_lotes;
CREATE POLICY "Autenticado le composicao" ON public.composicao_lotes
  FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere composicao" ON public.composicao_lotes
  FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert historico" ON public.historico_lotes;
DROP POLICY IF EXISTS "Authenticated can read historico" ON public.historico_lotes;
CREATE POLICY "Autenticado le historico" ON public.historico_lotes
  FOR SELECT TO authenticated USING (public.usuario_ativo(auth.uid()));
CREATE POLICY "Autenticado insere historico" ON public.historico_lotes
  FOR INSERT TO authenticated WITH CHECK (public.usuario_ativo(auth.uid()));

-- 4) Make fotos-lote bucket private + add SELECT policy for active users
UPDATE storage.buckets SET public = false WHERE id = 'fotos-lote';

DROP POLICY IF EXISTS "Autenticado ativo le fotos-lote" ON storage.objects;
CREATE POLICY "Autenticado ativo le fotos-lote"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fotos-lote' AND public.usuario_ativo(auth.uid()));

-- 5) Realtime: restrict subscriptions to active authenticated users
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticado ativo recebe realtime" ON realtime.messages;
CREATE POLICY "Autenticado ativo recebe realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (public.usuario_ativo(auth.uid()));
