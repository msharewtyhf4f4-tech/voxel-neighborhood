// Pure city layout & rules. No React, no three.js.

export const ROAD_HALF = 4;
export const SIDEWALK_OUTER = 6.8;
export const SIDEWALK_H = 0.12;
export const WALK_HALF = 6.6;
export const CAR_HALF = 3.0;
export const MIN_ROWS = 12;
export const HOUSE_SPACING = 11;
export const HOUSE_CENTER_X = 12;
export const FIRST_HOUSE_Z = -8;
export const STREET_START_Z = 6;
export const ROAD_START_Z = 24;
export const GATE_Z = -2;
export const SIGN_X = 6.95;
export const SIGN_DZ = 2.8;

export const COIN_VALUE = 10;
export const COIN_RADIUS = 1.1;
export const COIN_RESPAWN_S = 25;
export const COIN_COUNT = 40;

/** A registered player who owns a house. */
export interface Resident {
  userId: string;
  number: number;
  name: string;
  coins: number;
}

export interface Layout {
  rows: number;
  /** farthest point the player can walk/drive to */
  walkEndZ: number;
  roadEndZ: number;
  mosqueZ: number;
}

/** Street length grows with the highest house number, always leaving free lots. */
export function makeLayout(maxHouseNumber: number): Layout {
  const rows = Math.max(MIN_ROWS, Math.ceil((maxHouseNumber + 2) / 2));
  const lastRowZ = FIRST_HOUSE_Z - (rows - 1) * HOUSE_SPACING;
  return { rows, walkEndZ: lastRowZ - 8, roadEndZ: lastRowZ - 33, mosqueZ: lastRowZ - 25 };
}

export const DEFAULT_LAYOUT = makeLayout(0);

export interface House {
  number: number;
  /** empty string when the lot is free */
  name: string;
  coins: number;
  owner: string | null;
  /** -1 = left side of the street, 1 = right side */
  side: -1 | 1;
  x: number;
  z: number;
  floors: 1 | 2;
  style: number;
}

/** Odd house numbers on the left, even on the right, numbered from the gate. */
export function buildHouses(residents: Resident[], rows: number): House[] {
  const byNumber = new Map(residents.map((r) => [r.number, r]));
  return Array.from({ length: rows * 2 }, (_, i) => {
    const number = i + 1;
    const r = byNumber.get(number);
    const side: -1 | 1 = number % 2 === 1 ? -1 : 1;
    const row = Math.floor(i / 2);
    return {
      number,
      name: r?.name ?? "",
      coins: r?.coins ?? 0,
      owner: r?.userId ?? null,
      side,
      x: side * HOUSE_CENTER_X,
      z: FIRST_HOUSE_Z - row * HOUSE_SPACING,
      floors: i % 3 === 1 ? 2 : 1,
      style: (i * 5) % 7,
    };
  });
}

/** Where a player appears: on the sidewalk in front of their house. */
export function spawnAtHouse(houseNumber: number) {
  const i = Math.max(0, houseNumber - 1);
  const side = houseNumber % 2 === 1 ? -1 : 1;
  return { x: side * 5.3, z: FIRST_HOUSE_Z - Math.floor(i / 2) * HOUSE_SPACING - 1.6 };
}

/** City population = number of houses that have an owner. */
export function cityPopulation(houses: House[]): number {
  return houses.filter((h) => h.owner !== null).length;
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

export function buildCoins(layout: Layout = DEFAULT_LAYOUT, seed = 7): Coin[] {
  const rng = mulberry32(seed);
  const count = Math.max(COIN_COUNT, Math.floor((STREET_START_Z - 8 - (layout.walkEndZ + 4)) / 3.2));
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

export function buildPalms(rows: number): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let row = 0; row < rows; row++) {
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
    ...buildPalms(Math.ceil(houses.length / 2)).map((p) => ({ ...p, r: 0.45 })),
    ...houses.map((h) => ({ ...signPosition(h), r: 0.2 })),
  ];
}
