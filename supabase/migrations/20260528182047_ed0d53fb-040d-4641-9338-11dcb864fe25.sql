
GRANT EXECUTE ON FUNCTION public.is_gestor(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.tem_perfil(uuid, public.perfil_usuario) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.usuario_ativo(uuid) TO authenticated, anon, service_role;
