
REVOKE EXECUTE ON FUNCTION public.tem_perfil(UUID, public.perfil_usuario) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.usuario_ativo(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
