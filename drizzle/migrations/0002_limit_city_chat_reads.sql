DROP POLICY "Signed-in players can read the city chat" ON public.chat_messages;

CREATE POLICY "City residents can read recent chat"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    created_at > now() - interval '7 days'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid())
  );