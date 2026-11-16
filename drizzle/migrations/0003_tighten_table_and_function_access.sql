REVOKE ALL ON public.profiles, public.chat_messages, public.coin_pickups, public.coin_runs FROM anon, authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT INSERT (user_id, body) ON public.chat_messages TO authenticated;

GRANT ALL ON public.profiles, public.chat_messages, public.coin_pickups, public.coin_runs TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_player() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prepare_chat_message() FROM PUBLIC, anon, authenticated;