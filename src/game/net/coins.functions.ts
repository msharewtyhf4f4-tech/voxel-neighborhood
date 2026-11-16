import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildCityMap } from "../sim/map";
import { makeLayout, MIN_STREETS } from "../sim/world";

export const MAX_PICKS_PER_SAVE = 60;

export const coinSpotKey = (x: number, z: number) => `${Math.round(x * 100)}:${Math.round(z * 100)}`;

// Coin spots for each possible number of streets (pure, deterministic).
const spotsByStreets = new Map<number, Map<string, { x: number; z: number }>>();
function spotsFor(streets: number) {
  let m = spotsByStreets.get(streets);
  if (!m) {
    m = new Map();
    for (const c of buildCityMap({ streets }).coinSpots) m.set(coinSpotKey(c.x, c.z), c);
    spotsByStreets.set(streets, m);
  }
  return m;
}

/** Checks picked-up coins against the real map; the database awards only valid, reachable, respawned coins. */
export const saveCoinPicks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        picks: z
          .array(z.object({ x: z.number().finite(), z: z.number().finite() }))
          .max(MAX_PICKS_PER_SAVE),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ total: number }> => {
    const { data: residents, error: listError } = await context.supabase.rpc("city_residents");
    if (listError) throw new Error("Could not load the city");
    const maxHouse = (residents ?? []).reduce((m, r) => Math.max(m, r.house_number), 0);
    const streets = makeLayout(maxHouse).streets;

    const spots: string[] = [];
    const xs: number[] = [];
    const zs: number[] = [];
    for (const p of data.picks) {
      const key = coinSpotKey(p.x, p.z);
      for (let s = MIN_STREETS; s <= streets; s++) {
        const spot = spotsFor(s).get(key);
        if (spot) {
          spots.push(key);
          xs.push(spot.x);
          zs.push(spot.z);
          break;
        }
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: total, error } = await supabaseAdmin.rpc("award_coin_pickups", {
      p_user: context.userId,
      p_spots: spots,
      p_xs: xs,
      p_zs: zs,
    });
    if (error || typeof total !== "number") {
      console.error("saveCoinPicks failed", error);
      throw new Error("Could not save coins");
    }
    return { total };
  });
