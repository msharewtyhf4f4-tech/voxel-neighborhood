import { buildCoins, buildHouses, buildObstacles, type Coin, type House, type Obstacle } from "./sim/world";
import { createBody, exitSpot, summonCarSpot, type Body } from "./sim/motion";
import { useGame } from "./store";

/** Per-frame game state. Lives outside React; the scene only reads it. */
export interface Runtime {
  houses: House[];
  coins: Coin[];
  obstacles: Obstacle[];
  player: Body;
  car: Body;
  carSummonedAt: number;
  input: { x: number; y: number; jumpQueued: boolean };
  keys: Set<string>;
  time: number;
  walkPhase: number;
}

export function createRuntime(): Runtime {
  const houses = buildHouses();
  return {
    houses,
    coins: buildCoins(),
    obstacles: buildObstacles(houses),
    player: createBody(0, 4),
    car: createBody(0, -100),
    carSummonedAt: -10,
    input: { x: 0, y: 0, jumpQueued: false },
    keys: new Set(),
    time: 0,
    walkPhase: 0,
  };
}

/** Side car button: summon → get in (when close) → get out. */
export function pressCarButton(rt: Runtime) {
  const ui = useGame.getState();
  if (ui.carState === "driving") {
    const spot = exitSpot(rt.car);
    Object.assign(rt.player, createBody(spot.x, spot.z, rt.car.yaw));
    ui.setCarState("parked");
    ui.setNearCar(true);
    return;
  }
  if (ui.carState === "parked" && ui.nearCar) {
    rt.player.vx = 0;
    rt.player.vz = 0;
    ui.setCarState("driving");
    return;
  }
  const spot = summonCarSpot(rt.player);
  Object.assign(rt.car, createBody(spot.x, spot.z, Math.PI));
  rt.carSummonedAt = rt.time;
  ui.setCarState("parked");
}
