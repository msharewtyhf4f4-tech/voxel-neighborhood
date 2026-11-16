-- 1) Coins: no more caller-chosen amounts
REVOKE EXECUTE ON FUNCTION public.add_coins(integer) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.add_coins(integer);

CREATE TABLE public.coin_pickups (
  user_id uuid NOT NULL,
  spot text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot)
);
GRANT ALL ON public.coin_pickups TO service_role;
ALTER TABLE public.coin_pickups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.coin_runs (
  user_id uuid PRIMARY KEY,
  last_x double precision,
  last_z double precision,
  last_at timestamptz
);
GRANT ALL ON public.coin_runs TO service_role;
ALTER TABLE public.coin_runs ENABLE ROW LEVEL SECURITY;

-- Called only by the game server with coin spots it has already checked against the map.
CREATE OR REPLACE FUNCTION public.award_coin_pickups(
  p_user uuid, p_spots text[], p_xs double precision[], p_zs double precision[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_run public.coin_runs%ROWTYPE;
  v_elapsed double precision;
  v_budget double precision;
  v_px double precision;
  v_pz double precision;
  v_n integer := coalesce(array_length(p_spots, 1), 0);
  v_awarded integer := 0;
  v_total integer;
  i integer;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'no player'; END IF;
  IF v_n > 80 OR coalesce(array_length(p_xs, 1), 0) <> v_n OR coalesce(array_length(p_zs, 1), 0) <> v_n THEN
    RAISE EXCEPTION 'invalid pickups';
  END IF;

  INSERT INTO public.coin_runs (user_id) VALUES (p_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_run FROM public.coin_runs WHERE user_id = p_user FOR UPDATE;

  v_elapsed := CASE WHEN v_run.last_at IS NULL THEN 1e9
                    ELSE extract(epoch FROM now() - v_run.last_at) END;
  IF v_elapsed > 30 THEN
    v_elapsed := 30;          -- long gap: start from the first coin
  ELSE
    v_px := v_run.last_x;
    v_pz := v_run.last_z;
  END IF;
  -- fastest car is 18 m/s; small slack for timing jitter
  v_budget := 20 * v_elapsed + 6;

  FOR i IN 1..v_n LOOP
    IF v_px IS NOT NULL THEN
      v_budget := v_budget - sqrt((p_xs[i] - v_px) ^ 2 + (p_zs[i] - v_pz) ^ 2);
      EXIT WHEN v_budget < 0;
    END IF;
    v_px := p_xs[i];
    v_pz := p_zs[i];
    INSERT INTO public.coin_pickups AS cp (user_id, spot, taken_at)
    VALUES (p_user, p_spots[i], now())
    ON CONFLICT (user_id, spot) DO UPDATE SET taken_at = now()
      WHERE cp.taken_at < now() - interval '25 seconds';
    IF FOUND THEN v_awarded := v_awarded + 1; END IF;
  END LOOP;

  UPDATE public.coin_runs
     SET last_at = now(), last_x = coalesce(v_px, last_x), last_z = coalesce(v_pz, last_z)
   WHERE user_id = p_user;

  UPDATE public.profiles
     SET coins = coins + v_awarded * 10,
         coins_saved_at = CASE WHEN v_awarded > 0 THEN now() ELSE coins_saved_at END
   WHERE id = p_user
  RETURNING coins INTO v_total;
  IF v_total IS NULL THEN RAISE EXCEPTION 'no player profile'; END IF;
  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_coin_pickups(uuid, text[], double precision[], double precision[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_coin_pickups(uuid, text[], double precision[], double precision[]) TO service_role;

-- 2) Profiles: own row only; the shared house list exposes public fields only
DROP POLICY "Signed-in players can see every house" ON public.profiles;
CREATE POLICY "Players can read their own profile"
  ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.city_residents()
RETURNS TABLE (id uuid, display_name text, house_number integer, coins integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.house_number, p.coins
    FROM public.profiles p
   WHERE auth.uid() IS NOT NULL
   ORDER BY p.house_number
$$;

REVOKE EXECUTE ON FUNCTION public.city_residents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.city_residents() TO authenticated, service_role;