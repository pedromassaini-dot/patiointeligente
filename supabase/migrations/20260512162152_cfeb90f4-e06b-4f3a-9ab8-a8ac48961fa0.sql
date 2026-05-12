REVOKE EXECUTE ON FUNCTION public.usuario_ativo(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tem_perfil(uuid, public.perfil_usuario) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_gestor(uuid) FROM PUBLIC, anon, authenticated;