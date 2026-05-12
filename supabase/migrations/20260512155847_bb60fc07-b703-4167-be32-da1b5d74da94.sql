
REVOKE EXECUTE ON FUNCTION public.is_gestor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor(uuid) TO authenticated;
