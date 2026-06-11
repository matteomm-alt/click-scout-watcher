-- Fix: permetti agli utenti non autenticati di verificare i token di invito
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO authenticated;