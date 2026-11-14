// Pure residential layout & shared rules. No React, no three.js.

export const ROAD_HALF = 4;
export const SIDEWALK_OUTER = 6.8;
export const SIDEWALK_H = 0.12;
export const ROWS_PER_STREET = 12;
export const HOUSES_PER_STREET = ROWS_PER_STREET * 2;
export const MIN_STREETS = 3;
export const HOUSE_SPACING = 11;
export const HOUSE_OFFSET_X = 12;
export const FIRST_HOUSE_Z = -8;
export const STREET_NORTH_Z = -146;
export const STREET_SOUTH_Z = 14;
export const GATE_Z = -2;
export const SIGN_OFFSET_X = 6.95;
export const SIGN_DZ = 2.8;

export const COIN_VALUE = 10;
export const COIN_RADIUS = 1.1;
export const COIN_RESPAWN_S = 25;

/** A registered player who owns a house. */
export interface Resident {
  userId: string;
  number: number;
  name: string;
  coins: number;
}

export interface Layout {
  /** residential streets; each holds 24 houses */
  streets: number;
}

/** More streets are added as players join, always leaving free houses. */
export function makeLayout(maxHouseNumber: number): Layout {
  return { streets: Math.max(MIN_STREETS, Math.ceil((maxHouseNumber + 2) / HOUSES_PER_STREET)) };
}

/** Street 0 is the main street (with the gate); then west, east, then further west. */
export function streetX(s: number): number {
  if (s === 0) return 0;
  if (s === 1) return -36;
  if (s === 2) return 36;
  return -36 * (s - 1);
}

export interface House {
  number: number;
  /** empty string when the lot is free */
  name: string;
  coins: number;
  owner: string | null;
  street: number;
  /** -1 = left (west) of its street, 1 = right (east) */
  side: -1 | 1;
  x: number;
  z: number;
  floors: 1 | 2;
  style: number;
}

export function housePlace(number: number) {
  const i = number - 1;
  const street = Math.floor(i / HOUSES_PER_STREET);
  const within = i % HOUSES_PER_STREET;
  const side: -1 | 1 = within % 2 === 0 ? -1 : 1;
  const row = Math.floor(within / 2);
  const sx = streetX(street);
  return { street, side, sx, x: sx + side * HOUSE_OFFSET_X, z: FIRST_HOUSE_Z - row * HOUSE_SPACING };
}

/** Odd house numbers on the left of each street, even on the right. */
export function buildHouses(residents: Resident[], layout: Layout): House[] {
  const byNumber = new Map(residents.map((r) => [r.number, r]));
  return Array.from({ length: layout.streets * HOUSES_PER_STREET }, (_, i) => {
    const number = i + 1;
    const r = byNumber.get(number);
    const p = housePlace(number);
    return {
      number,
      name: r?.name ?? "",
      coins: r?.coins ?? 0,
      owner: r?.userId ?? null,
      street: p.street,
      side: p.side,
      x: p.x,
      z: p.z,
      floors: i % 3 === 1 ? 2 : 1,
      style: (i * 5) % 7,
    };
  });
}

/** Where a player appears: on the sidewalk in front of their house. */
export function spawnAtHouse(houseNumber: number) {
  const p = housePlace(Math.max(1, houseNumber));
  return { x: p.sx + p.side * 5.3, z: p.z - 1.6 };
}

/** City population = number of houses that have an owner. */
export function cityPopulation(houses: House[]): number {
  return houses.filter((h) => h.owner !== null).length;
}

export function signPosition(h: House) {
  return { x: streetX(h.street) + h.side * SIGN_OFFSET_X, z: h.z + SIGN_DZ };
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

export function coinActive(c: Coin, now: number): boolean {
  return c.takenAt < 0 || now - c.takenAt >= COIN_RESPAWN_S;
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function palmsForStreet(s: number): { x: number; z: number }[] {
  const sx = streetX(s);
  const out: { x: number; z: number }[] = [];
  for (let row = 0; row < ROWS_PER_STREET; row++) {
    const z = FIRST_HOUSE_Z - row * HOUSE_SPACING - HOUSE_SPACING / 2;
    out.push({ x: sx - 5.9, z }, { x: sx + 5.9, z });
  }
  return out;
}

/** Solid footprint of a house and its front yard wall. */
export function houseBox(h: House): Rect {
  const sx = streetX(h.street);
  const near = SIDEWALK_OUTER + 0.1;
  const far = HOUSE_OFFSET_X + 3.7;
  return h.side === -1
    ? { x0: sx - far, x1: sx - near, z0: h.z - 4, z1: h.z + 4 }
    : { x0: sx + near, x1: sx + far, z0: h.z - 4, z1: h.z + 4 };
}
