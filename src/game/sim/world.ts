// Pure city layout & rules. No React, no three.js.

export const ROAD_HALF = 4;
export const SIDEWALK_OUTER = 6.8;
export const SIDEWALK_H = 0.12;
export const WALK_HALF = 6.6;
export const CAR_HALF = 3.0;
export const HOUSES_PER_SIDE = 12;
export const HOUSE_SPACING = 11;
export const HOUSE_CENTER_X = 12;
export const FIRST_HOUSE_Z = -8;
export const STREET_START_Z = 6;
export const STREET_END_Z = FIRST_HOUSE_Z - (HOUSES_PER_SIDE - 1) * HOUSE_SPACING - 8;
export const ROAD_START_Z = 24;
export const ROAD_END_Z = -162;
export const GATE_Z = -2;
export const SIGN_X = 6.95;
export const SIGN_DZ = 2.8;

export const COIN_VALUE = 10;
export const COIN_RADIUS = 1.1;
export const COIN_RESPAWN_S = 25;
export const COIN_COUNT = 40;

export interface Subscriber {
  name: string;
  residents: number;
}

/** Subscriber list shown on the houses (placeholder names). */
export const SUBSCRIBERS: Subscriber[] = [
  { name: "أبو محمد", residents: 5 },
  { name: "نورة", residents: 3 },
  { name: "سلطان", residents: 4 },
  { name: "فهد", residents: 2 },
  { name: "ريم", residents: 3 },
  { name: "عبدالله", residents: 6 },
  { name: "سارة", residents: 2 },
  { name: "خالد", residents: 4 },
  { name: "مريم", residents: 3 },
  { name: "تركي", residents: 5 },
  { name: "هند", residents: 2 },
  { name: "ناصر", residents: 4 },
  { name: "لطيفة", residents: 3 },
  { name: "بدر", residents: 2 },
  { name: "العنود", residents: 4 },
  { name: "حمد", residents: 6 },
  { name: "شيخة", residents: 3 },
  { name: "يوسف", residents: 2 },
  { name: "دانة", residents: 4 },
  { name: "مشعل", residents: 5 },
  { name: "روان", residents: 3 },
  { name: "سعود", residents: 4 },
  { name: "جواهر", residents: 2 },
  { name: "عمر", residents: 3 },
];

export interface House {
  number: number;
  name: string;
  residents: number;
  /** -1 = left side of the street, 1 = right side */
  side: -1 | 1;
  x: number;
  z: number;
  floors: 1 | 2;
  style: number;
}

/** Odd house numbers on the left, even on the right, numbered from the gate. */
export function buildHouses(subs: Subscriber[] = SUBSCRIBERS): House[] {
  return subs.slice(0, HOUSES_PER_SIDE * 2).map((s, i) => {
    const number = i + 1;
    const side: -1 | 1 = number % 2 === 1 ? -1 : 1;
    const row = Math.floor(i / 2);
    return {
      number,
      name: s.name,
      residents: s.residents,
      side,
      x: side * HOUSE_CENTER_X,
      z: FIRST_HOUSE_Z - row * HOUSE_SPACING,
      floors: i % 3 === 1 ? 2 : 1,
      style: (i * 5) % 7,
    };
  });
}

export function cityPopulation(houses: House[]): number {
  return houses.reduce((sum, h) => sum + h.residents, 0);
}

export function floorAt(x: number): number {
  return Math.abs(x) > ROAD_HALF ? SIDEWALK_H : 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Coin {
  x: number;
  z: number;
  takenAt: number;
}

export function buildCoins(seed = 7, count = COIN_COUNT): Coin[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    x: (rng() * 2 - 1) * 5.4,
    z: STREET_START_Z - 8 - i * 3.2,
    takenAt: -1,
  }));
}

export function coinActive(c: Coin, now: number): boolean {
  return c.takenAt < 0 || now - c.takenAt >= COIN_RESPAWN_S;
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export function buildPalms(): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let row = 0; row < HOUSES_PER_SIDE; row++) {
    const z = FIRST_HOUSE_Z - row * HOUSE_SPACING - HOUSE_SPACING / 2;
    out.push({ x: -5.9, z }, { x: 5.9, z });
  }
  return out;
}

export function signPosition(h: House) {
  return { x: h.side * SIGN_X, z: h.z + SIGN_DZ };
}

export function buildObstacles(houses: House[]): Obstacle[] {
  return [
    ...buildPalms().map((p) => ({ ...p, r: 0.45 })),
    ...houses.map((h) => ({ ...signPosition(h), r: 0.2 })),
  ];
}
