// Pure movement rules for the walker and the car. No React, no three.js.
import {
  CAR_HALF,
  COIN_RADIUS,
  COIN_VALUE,
  DEFAULT_LAYOUT,
  STREET_START_Z,
  WALK_HALF,
  coinActive,
  floorAt,
  type Coin,
  type Obstacle,
} from "./world";

export const GRAVITY = 26;
export const WALK = { SPEED: 5.5, ACCEL: 12, TURN: 12, JUMP_V: 9, RADIUS: 0.35 };
export const CAR = { MAX: 16, ACCEL_K: 1.6, DRAG: 1.4, TURN: 2.4, HOP_V: 6 };
export const CAR_ENTER_DIST = 4.5;

export interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  yaw: number;
  speed: number;
  grounded: boolean;
}

export interface MoveInput {
  /** -1 left .. 1 right (screen) */
  x: number;
  /** -1 back .. 1 forward (down the street, toward -Z) */
  y: number;
  jump: boolean;
}

export function createBody(x: number, z: number, yaw = Math.PI): Body {
  return { x, y: floorAt(x), z, vx: 0, vz: 0, vy: 0, yaw, speed: 0, grounded: true };
}

export function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

export function turnToward(current: number, target: number, maxStep: number): number {
  const d = angleDiff(target, current);
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Keyboard + joystick merged into one vector, length <= 1. */
export function mergeInput(joy: { x: number; y: number }, keys: Set<string>) {
  let x = joy.x;
  let y = joy.y;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

export function applyVertical(b: Body, jump: boolean, jumpV: number, dt: number) {
  const floor = floorAt(b.x);
  if (jump && b.grounded) {
    b.vy = jumpV;
    b.grounded = false;
  }
  b.vy -= GRAVITY * dt;
  b.y += b.vy * dt;
  if (b.y <= floor) {
    b.y = floor;
    b.vy = 0;
    b.grounded = true;
  }
}

export function pushOut(b: Body, obstacles: Obstacle[], radius: number) {
  for (const o of obstacles) {
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    const min = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      b.x = o.x + (dx / d) * min;
      b.z = o.z + (dz / d) * min;
    }
  }
}

export function stepWalker(
  b: Body,
  inp: MoveInput,
  dt: number,
  obstacles: Obstacle[] = [],
  endZ = DEFAULT_LAYOUT.walkEndZ,
) {
  const tx = inp.x * WALK.SPEED;
  const tz = -inp.y * WALK.SPEED;
  const k = 1 - Math.exp(-WALK.ACCEL * dt);
  b.vx += (tx - b.vx) * k;
  b.vz += (tz - b.vz) * k;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  b.speed = Math.hypot(b.vx, b.vz);
  if (b.speed > 0.3) b.yaw = turnToward(b.yaw, Math.atan2(b.vx, b.vz), WALK.TURN * dt);
  pushOut(b, obstacles, WALK.RADIUS);
  b.x = clamp(b.x, -WALK_HALF, WALK_HALF);
  b.z = clamp(b.z, endZ, STREET_START_Z);
  applyVertical(b, inp.jump, WALK.JUMP_V, dt);
}

/** Arcade car: steers toward the joystick direction, speed follows stick tilt. */
export function stepCar(b: Body, inp: MoveInput, dt: number, endZ = DEFAULT_LAYOUT.walkEndZ) {
  const mag = Math.min(1, Math.hypot(inp.x, inp.y));
  if (mag > 0.15) {
    const target = Math.atan2(inp.x, -inp.y);
    const turnRate = CAR.TURN * Math.min(1, 0.35 + b.speed / 6);
    b.yaw = turnToward(b.yaw, target, turnRate * dt);
    const align = Math.max(0, Math.cos(angleDiff(target, b.yaw)));
    const targetSpeed = CAR.MAX * mag * (0.3 + 0.7 * align);
    b.speed += (targetSpeed - b.speed) * (1 - Math.exp(-CAR.ACCEL_K * dt));
  } else {
    b.speed *= Math.exp(-CAR.DRAG * dt);
  }
  b.vx = Math.sin(b.yaw) * b.speed;
  b.vz = Math.cos(b.yaw) * b.speed;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  if (Math.abs(b.x) > CAR_HALF) {
    b.x = clamp(b.x, -CAR_HALF, CAR_HALF);
    b.speed *= Math.exp(-3 * dt);
  }
  if (b.z < endZ || b.z > STREET_START_Z) {
    b.z = clamp(b.z, endZ, STREET_START_Z);
    b.speed *= Math.exp(-6 * dt);
  }
  applyVertical(b, inp.jump, CAR.HOP_V, dt);
}

/** Marks touched coins as taken and returns the points earned. */
export function collectCoins(coins: Coin[], x: number, z: number, now: number): number {
  let gained = 0;
  for (const c of coins) {
    if (!coinActive(c, now)) continue;
    const dx = c.x - x;
    const dz = c.z - z;
    if (dx * dx + dz * dz <= COIN_RADIUS * COIN_RADIUS) {
      c.takenAt = now;
      gained += COIN_VALUE;
    }
  }
  return gained;
}

export function canEnterCar(player: Body, car: Body): boolean {
  return Math.hypot(player.x - car.x, player.z - car.z) <= CAR_ENTER_DIST;
}

export function summonCarSpot(player: Body, endZ = DEFAULT_LAYOUT.walkEndZ) {
  const x = clamp(player.x >= 0 ? player.x - 3.2 : player.x + 3.2, -CAR_HALF, CAR_HALF);
  const z = clamp(player.z - 1.5, endZ, STREET_START_Z);
  return { x, z };
}

export function exitSpot(car: Body, endZ = DEFAULT_LAYOUT.walkEndZ) {
  const px = Math.cos(car.yaw);
  const pz = -Math.sin(car.yaw);
  const side = car.x >= 0 ? 1 : -1;
  return {
    x: clamp(car.x + px * 2 * side, -WALK_HALF, WALK_HALF),
    z: clamp(car.z + pz * 2 * side, endZ, STREET_START_Z),
  };
}
