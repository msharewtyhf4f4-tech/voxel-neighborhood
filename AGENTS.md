<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Game architecture
- Game rules (layout, movement, coins, car) live in `src/game/sim/` as plain TypeScript with no React/three imports, so they stay unit-testable (`src/game/sim/rules.test.ts`).
- Per-frame state lives in the `Runtime` object (`src/game/runtime.ts`), advanced only by the single `Stepper` useFrame (priority -1); zustand (`src/game/store.ts`) holds only HUD-facing state, updated on change, never every frame.
- Static city scenery is merged into one vertex-colored geometry (`voxelGeometry`) to keep mobile draw calls low; add new scenery to `cityGeometry.ts`, not as separate meshes.
- The game route uses `ssr: false` and lazy-loads `GameCanvas`; the canvas wrapper is `dir="ltr"` (drei Html mispositions under RTL) while the HUD is `dir="rtl"`.
- Subscriber names/residents come from `SUBSCRIBERS` in `src/game/sim/world.ts`.
- Coins are awarded only by the `saveCoinPicks` server function (checks pickups against the real map) calling the service-only `award_coin_pickups` DB function; never let clients send a coin amount.
- Other players' houses are read via the `city_residents()` DB function (public fields only); `profiles` rows are readable only by their owner.
