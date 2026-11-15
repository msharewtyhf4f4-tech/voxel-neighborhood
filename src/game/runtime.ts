import { buildCityMap, type CityMap } from "./sim/map";
import { buildHouses, makeLayout, spawnAtHouse, type Coin, type House, type Layout } from "./sim/world";
import { createBody, exitSpot, summonCarSpot, type Body } from "./sim/motion";
import { useGame } from "./store";

/** Per-frame game state. Lives outside React; the scene only reads it. */
export interface Runtime {
  layout: Layout;
  map: CityMap;
  houses: House[];
  coins: Coin[];
  player: Body;
  car: Body;
  carSummonedAt: number;
  input: { x: number; y: number; jumpQueued: boolean };
  keys: Set<string>;
  time: number;
  /** direction the camera looks (same convention as Body.yaw); π = north */
  camYaw: number;
  /** last time the player dragged the camera by hand */
  camDragAt: number;
  /** race timer start (sim time) or null when not racing */
  raceStartAt: number | null;
}

const coinsFor = (map: CityMap): Coin[] => map.coinSpots.map((c) => ({ ...c, takenAt: -1 }));

export function createRuntime(myHouse: number): Runtime {
  const layout = makeLayout(myHouse);
  const map = buildCityMap(layout);
  const spawn = spawnAtHouse(myHouse);
  return {
    layout,
    map,
    houses: buildHouses([], layout),
    coins: coinsFor(map),
    player: createBody(spawn.x, spawn.z),
    car: createBody(0, -100),
    carSummonedAt: -10,
    input: { x: 0, y: 0, jumpQueued: false },
    keys: new Set(),
    time: 0,
    camYaw: Math.PI,
    camDragAt: -10,
    raceStartAt: null,
  };
}

/** Keep the simulation in step with the number of streets and house owners. */
export function applyCity(rt: Runtime, layout: Layout, houses: House[]) {
  if (layout.streets !== rt.layout.streets) {
    rt.map = buildCityMap(layout);
    rt.coins = coinsFor(rt.map);
  }
  rt.layout = layout;
  rt.houses = houses;
}

/** Side car button: summon → get in (when close) → get out. */
export function pressCarButton(rt: Runtime) {
  const ui = useGame.getState();
  if (ui.carState === "driving") {
    const spot = exitSpot(rt.car, rt.map);
    Object.assign(rt.player, createBody(spot.x, spot.z, rt.car.yaw));
    rt.raceStartAt = null;
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
  const spot = summonCarSpot(rt.player, rt.camYaw, rt.map);
  Object.assign(rt.car, createBody(spot.x, spot.z, rt.camYaw));
  rt.carSummonedAt = rt.time;
  ui.setCarState("parked");
}
