import {
  buildCoins,
  buildHouses,
  buildObstacles,
  DEFAULT_LAYOUT,
  spawnAtHouse,
  type Coin,
  type House,
  type Layout,
  type Obstacle,
} from "./sim/world";
import { createBody, exitSpot, summonCarSpot, type Body } from "./sim/motion";
import { useGame } from "./store";

/** Per-frame game state. Lives outside React; the scene only reads it. */
export interface Runtime {
  layout: Layout;
  houses: House[];
  coins: Coin[];
  obstacles: Obstacle[];
  player: Body;
  car: Body;
  carSummonedAt: number;
  input: { x: number; y: number; jumpQueued: boolean };
  keys: Set<string>;
  time: number;
}

export function createRuntime(myHouse: number): Runtime {
  const spawn = spawnAtHouse(myHouse);
  return {
    layout: DEFAULT_LAYOUT,
    houses: buildHouses([], DEFAULT_LAYOUT.rows),
    coins: buildCoins(DEFAULT_LAYOUT),
    obstacles: buildObstacles(buildHouses([], DEFAULT_LAYOUT.rows)),
    player: createBody(spawn.x, spawn.z),
    car: createBody(0, -100),
    carSummonedAt: -10,
    input: { x: 0, y: 0, jumpQueued: false },
    keys: new Set(),
    time: 0,
  };
}

/** Keep the simulation in step with the street size and house owners. */
export function applyCity(rt: Runtime, layout: Layout, houses: House[]) {
  if (layout.rows !== rt.layout.rows) {
    rt.coins = buildCoins(layout);
    rt.obstacles = buildObstacles(houses);
  }
  rt.layout = layout;
  rt.houses = houses;
}

/** Side car button: summon → get in (when close) → get out. */
export function pressCarButton(rt: Runtime) {
  const ui = useGame.getState();
  const endZ = rt.layout.walkEndZ;
  if (ui.carState === "driving") {
    const spot = exitSpot(rt.car, endZ);
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
  const spot = summonCarSpot(rt.player, endZ);
  Object.assign(rt.car, createBody(spot.x, spot.z, Math.PI));
  rt.carSummonedAt = rt.time;
  ui.setCarState("parked");
}
