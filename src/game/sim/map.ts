// The whole city: road network, districts, solid obstacles, coins, signs.
// Pure data — no React, no three.js.
import {
  GATE_Z,
  ROAD_HALF,
  SIDEWALK_H,
  SIDEWALK_OUTER,
  STREET_NORTH_Z,
  STREET_SOUTH_Z,
  buildHouses,
  houseBox,
  mulberry32,
  palmsForStreet,
  signPosition,
  streetX,
  type Layout,
  type Obstacle,
  type Rect,
} from "./world";

export type RoadKind = "street" | "avenue" | "race" | "lot" | "path";
export interface Road extends Rect {
  axis: "x" | "z";
  kind: RoadKind;
}

export type DistrictId = "homes" | "stadium" | "mall" | "park" | "race" | "mosque";
export interface District {
  id: DistrictId;
  name: string;
  x: number;
  z: number;
  rect: Rect;
}

export interface RoadSign {
  x: number;
  z: number;
  /** yaw of the sign face normal; the back face points the other way */
  yaw: number;
}

// --- fixed district geometry (meters) ---
export const SOUTH_AVE = { z0: 14, z1: 26 };
export const NORTH_AVE = { z0: -158, z1: -146 };
export const BOULEVARD = { x0: 64, x1: 76, z0: -158, z1: 62 };
export const STADIUM = {
  outer: { x0: -37, x1: 27, z0: 46, z1: 94 },
  pitch: { x0: -25, x1: 15, z0: 57, z1: 83 },
  gate: { x0: -10, x1: 0 },
  standDepth: 8,
};
export const MALL = { building: { x0: 100, x1: 150, z0: -70, z1: -30 }, lot: { x0: 76, x1: 98, z0: -75, z1: -25 } };
export const PARK = {
  area: { x0: 86, x1: 160, z0: -145, z1: -95 },
  gate: { z0: -124, z1: -116 },
  wheel: { x: 132, z: -125, r: 13, axleY: 16 },
  carousel: { x: 106, z: -106, r: 5 },
};
export const RACE = { x0: 64, x1: 305, z0: 48, z1: 62, startX: 90, finishX: 280, barrierFrom: 80 };
export const MOSQUE = { x: 0, z: -176 };

export const DISTRICTS: District[] = [
  { id: "homes", name: "الحي السكني", x: 0, z: -70, rect: { x0: -60, x1: 60, z0: -146, z1: 14 } },
  { id: "stadium", name: "ملعب المدينة", x: -5, z: 70, rect: STADIUM.outer },
  { id: "mall", name: "مول المدينة", x: 120, z: -50, rect: MALL.building },
  { id: "park", name: "مدينة الألعاب", x: 122, z: -120, rect: PARK.area },
  { id: "race", name: "حلبة السباق", x: 190, z: 55, rect: { x0: RACE.startX, x1: RACE.finishX, z0: RACE.z0, z1: RACE.z1 } },
  { id: "mosque", name: "الجامع", x: MOSQUE.x, z: MOSQUE.z, rect: { x0: -8, x1: 8, z0: -182, z1: -170 } },
];

export interface CityMap {
  layout: Layout;
  bounds: Rect;
  streetXs: number[];
  roads: Road[];
  sidewalks: Rect[];
  boxes: Rect[];
  circles: Obstacle[];
  coinSpots: { x: number; z: number }[];
  signs: RoadSign[];
  speedSigns: { x: number; z: number }[];
}

function fence(r: Rect, gapSide: "west" | "north", gap: { a: number; b: number }, t = 0.5): Rect[] {
  const out: Rect[] = [];
  if (gapSide === "west") {
    out.push({ x0: r.x0, x1: r.x0 + t, z0: r.z0, z1: gap.a }, { x0: r.x0, x1: r.x0 + t, z0: gap.b, z1: r.z1 });
  } else {
    out.push({ x0: r.x0, x1: r.x0 + t, z0: r.z0, z1: r.z1 });
  }
  out.push({ x0: r.x1 - t, x1: r.x1, z0: r.z0, z1: r.z1 });
  out.push({ x0: r.x0, x1: r.x1, z0: r.z1 - t, z1: r.z1 });
  if (gapSide === "north") {
    out.push({ x0: r.x0, x1: gap.a, z0: r.z0, z1: r.z0 + t }, { x0: gap.b, x1: r.x1, z0: r.z0, z1: r.z0 + t });
  } else {
    out.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z0 + t });
  }
  return out;
}

export function stadiumStands(): Rect[] {
  const o = STADIUM.outer;
  const d = STADIUM.standDepth;
  const g = STADIUM.gate;
  return [
    { x0: o.x0, x1: g.x0, z0: o.z0, z1: o.z0 + d },
    { x0: g.x1, x1: o.x1, z0: o.z0, z1: o.z0 + d },
    { x0: o.x0, x1: o.x1, z0: o.z1 - d, z1: o.z1 },
    { x0: o.x0, x1: o.x0 + d + 1, z0: o.z0 + d, z1: o.z1 - d },
    { x0: o.x1 - d - 1, x1: o.x1, z0: o.z0 + d, z1: o.z1 - d },
  ];
}

export const KIOSKS: { x: number; z: number; color: string }[] = [
  { x: 96, z: -100, color: "#e63946" },
  { x: 96, z: -138, color: "#2a9d8f" },
  { x: 112, z: -138, color: "#f4a261" },
  { x: 150, z: -100, color: "#8e44ad" },
  { x: 150, z: -138, color: "#e9c46a" },
  { x: 118, z: -100, color: "#3a86c8" },
];

export function buildCityMap(layout: Layout): CityMap {
  const streetXs = Array.from({ length: layout.streets }, (_, s) => streetX(s));
  const minX = Math.min(...streetXs) - 6;
  const roads: Road[] = [];
  const sidewalks: Rect[] = [];
  for (const sx of streetXs) {
    roads.push({ x0: sx - ROAD_HALF, x1: sx + ROAD_HALF, z0: STREET_NORTH_Z, z1: STREET_SOUTH_Z, axis: "z", kind: "street" });
    sidewalks.push(
      { x0: sx - SIDEWALK_OUTER, x1: sx - ROAD_HALF, z0: STREET_NORTH_Z, z1: STREET_SOUTH_Z },
      { x0: sx + ROAD_HALF, x1: sx + SIDEWALK_OUTER, z0: STREET_NORTH_Z, z1: STREET_SOUTH_Z },
    );
  }
  roads.push(
    { x0: minX, x1: BOULEVARD.x1, ...SOUTH_AVE, axis: "x", kind: "avenue" },
    { x0: minX, x1: BOULEVARD.x1, ...NORTH_AVE, axis: "x", kind: "avenue" },
    { ...BOULEVARD, axis: "z", kind: "avenue" },
    { x0: -9, x1: -1, z0: SOUTH_AVE.z1, z1: STADIUM.outer.z0 + 2, axis: "z", kind: "street" },
    { x0: RACE.x0, x1: RACE.x1, z0: RACE.z0, z1: RACE.z1, axis: "x", kind: "race" },
    { ...MALL.lot, axis: "x", kind: "lot" },
    { x0: BOULEVARD.x1, x1: PARK.area.x0 + 2, z0: PARK.gate.z0, z1: PARK.gate.z1, axis: "x", kind: "path" },
    { x0: -10, x1: 10, z0: MOSQUE.z + 6, z1: NORTH_AVE.z0, axis: "z", kind: "path" },
  );

  const houses = buildHouses([], layout);
  const boxes: Rect[] = houses.map(houseBox);
  // gate pillars on the main street
  boxes.push({ x0: -8.4, x1: -7, z0: GATE_Z - 0.7, z1: GATE_Z + 0.7 }, { x0: 7, x1: 8.4, z0: GATE_Z - 0.7, z1: GATE_Z + 0.7 });
  boxes.push({ x0: MOSQUE.x - 8, x1: MOSQUE.x + 8, z0: MOSQUE.z - 6, z1: MOSQUE.z + 6 });
  boxes.push({ x0: MOSQUE.x + 8.4, x1: MOSQUE.x + 10.6, z0: MOSQUE.z - 1.1, z1: MOSQUE.z + 1.1 });
  boxes.push(...stadiumStands());
  boxes.push(MALL.building);
  boxes.push(...fence(PARK.area, "west", { a: PARK.gate.z0, b: PARK.gate.z1 }));
  const w = PARK.wheel;
  boxes.push({ x0: w.x - 3, x1: w.x + 3, z0: w.z - 5, z1: w.z + 5 });
  for (const k of KIOSKS) boxes.push({ x0: k.x - 2.5, x1: k.x + 2.5, z0: k.z - 2, z1: k.z + 2 });
  // race barriers + end wall
  boxes.push(
    { x0: RACE.barrierFrom, x1: RACE.x1, z0: RACE.z0 - 0.6, z1: RACE.z0 },
    { x0: RACE.barrierFrom, x1: RACE.x1, z0: RACE.z1, z1: RACE.z1 + 0.6 },
    { x0: RACE.x1, x1: RACE.x1 + 1, z0: RACE.z0 - 0.6, z1: RACE.z1 + 0.6 },
  );

  const circles: Obstacle[] = [];
  for (let s = 0; s < layout.streets; s++) for (const p of palmsForStreet(s)) circles.push({ ...p, r: 0.45 });
  for (const h of houses) circles.push({ ...signPosition(h), r: 0.2 });
  circles.push({ x: PARK.carousel.x, z: PARK.carousel.z, r: PARK.carousel.r });

  const signs: RoadSign[] = [
    { x: 9, z: 9, yaw: 0 },
    { x: -27, z: 9, yaw: 0 },
    { x: 58, z: 29, yaw: Math.PI / 2 },
    { x: 80, z: 10, yaw: 0 },
    { x: 80, z: -86, yaw: 0 },
    { x: 60, z: 42, yaw: 0 },
    { x: -14, z: 30, yaw: Math.PI / 2 },
    { x: 14, z: -161, yaw: Math.PI / 2 },
  ];
  for (const sg of signs) {
    const ox = Math.cos(sg.yaw) * 1.2;
    const oz = -Math.sin(sg.yaw) * 1.2;
    circles.push({ x: sg.x + ox, z: sg.z + oz, r: 0.25 }, { x: sg.x - ox, z: sg.z - oz, r: 0.25 });
  }
  const speedSigns: { x: number; z: number }[] = [];
  for (let x = 110; x < RACE.finishX; x += 40) speedSigns.push({ x, z: RACE.z1 + 2.2 });

  // coins: streets, avenues, boulevard, race strip, stadium pitch, park, parking
  const rng = mulberry32(7);
  const coinSpots: { x: number; z: number }[] = [];
  for (const sx of streetXs)
    for (let z = STREET_SOUTH_Z - 8; z > STREET_NORTH_Z + 4; z -= 3.2) coinSpots.push({ x: sx + (rng() * 2 - 1) * 5.4, z });
  for (const ave of [SOUTH_AVE, NORTH_AVE])
    for (let x = minX + 4; x < BOULEVARD.x0; x += 6) coinSpots.push({ x, z: (ave.z0 + ave.z1) / 2 + (rng() * 2 - 1) * 4 });
  for (let z = BOULEVARD.z0 + 6; z < BOULEVARD.z1 - 4; z += 6) coinSpots.push({ x: 70 + (rng() * 2 - 1) * 4, z });
  for (let x = RACE.startX - 4; x < RACE.x1 - 4; x += 5) coinSpots.push({ x, z: 55 + (rng() * 2 - 1) * 5 });
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++) coinSpots.push({ x: -21 + i * 10.6, z: 62 + j * 8 });
  for (let i = 0; i < 10; i++) coinSpots.push({ x: 92 + rng() * 60, z: -108 - rng() * 30 });
  for (let i = 0; i < 8; i++) coinSpots.push({ x: 80 + rng() * 16, z: -30 - rng() * 42 });

  return {
    layout,
    bounds: { x0: minX - 16, x1: RACE.x1 + 3, z0: MOSQUE.z - 14, z1: STADIUM.outer.z1 + 6 },
    streetXs,
    roads,
    sidewalks,
    boxes,
    circles,
    coinSpots,
    signs,
    speedSigns,
  };
}

export function floorAt(map: CityMap, x: number, z: number): number {
  for (const r of map.sidewalks) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return SIDEWALK_H;
  return 0;
}

/** Which arrow a viewer facing `faceYaw` (looking along -normal) sees toward a target. */
export function arrowFor(faceYaw: number, fromX: number, fromZ: number, toX: number, toZ: number): "↑" | "→" | "←" | "↓" {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const len = Math.hypot(dx, dz) || 1;
  const lookX = -Math.sin(faceYaw);
  const lookZ = -Math.cos(faceYaw);
  const f = (dx * lookX + dz * lookZ) / len;
  const r = (dx * -lookZ + dz * lookX) / len;
  if (f > 0.6) return "↑";
  if (f < -0.6) return "↓";
  return r > 0 ? "→" : "←";
}

/** Race timing: did the car just cross the start or finish line going east? */
export function raceCross(prevX: number, x: number, z: number): "start" | "finish" | null {
  if (z < RACE.z0 || z > RACE.z1 || x <= prevX) return null;
  if (prevX < RACE.startX && x >= RACE.startX) return "start";
  if (prevX < RACE.finishX && x >= RACE.finishX) return "finish";
  return null;
}
