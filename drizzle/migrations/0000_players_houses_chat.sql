-- Players: one house per player
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  house_number integer NOT NULL UNIQUE,
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  coins_saved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_len CHECK (char_length(display_name) BETWEEN 2 AND 20)
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in players can see every house"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Create the player's house once the account is confirmed
CREATE OR REPLACE FUNCTION public.handle_new_player()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_num integer;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  v_name := left(btrim(coalesce(NEW.raw_user_meta_data->>'display_name', '')), 20);
  IF char_length(v_name) < 2 THEN
    v_name := 'لاعب';
  END IF;
  LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
  SELECT coalesce(max(house_number), 0) + 1 INTO v_num FROM public.profiles;
  INSERT INTO public.profiles (id, username, display_name, house_number)
  VALUES (NEW.id, lower(coalesce(NEW.raw_user_meta_data->>'username', NEW.id::text)), v_name, v_num);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_player_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_player();

CREATE TRIGGER on_auth_user_player_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_player();

-- Coins: bounded increments, at most one save every 2 seconds
CREATE OR REPLACE FUNCTION public.add_coins(p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 200 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;
  UPDATE public.profiles
     SET coins = coins + p_amount, coins_saved_at = now()
   WHERE id = auth.uid()
     AND (coins_saved_at IS NULL OR coins_saved_at < now() - interval '2 seconds')
  RETURNING coins INTO v_total;
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'too fast';
  END IF;
  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_coins(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_coins(integer) TO authenticated;

-- City chat
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in players can read the city chat"
  ON public.chat_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Players post as themselves"
  ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX chat_messages_created_at_idx ON public.chat_messages (created_at DESC);

CREATE OR REPLACE FUNCTION public.prepare_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT display_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'no player profile';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.chat_messages
     WHERE user_id = NEW.user_id AND created_at > now() - interval '1 second'
  ) THEN
    RAISE EXCEPTION 'too fast';
  END IF;
  NEW.author_name := v_name;
  NEW.body := btrim(NEW.body);
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_prepare
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.prepare_chat_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;