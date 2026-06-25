-- 1. Revoga a permissão de qualquer pessoa não-autenticada (pública) executar a função
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;

-- 2. Revoga a permissão de usuários logados comuns executarem a função
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- 3. (Opcional, mas recomendado) Garante que apenas a role de serviço (seu backend seguro) ou o admin possam rodar
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
