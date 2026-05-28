
REVOKE EXECUTE ON FUNCTION public.is_gestor(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tem_perfil(uuid, public.perfil_usuario) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.usuario_ativo(uuid) FROM anon, PUBLIC;
