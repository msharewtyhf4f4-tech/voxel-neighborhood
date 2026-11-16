// Pure movement rules for the walker and the car. No React, no three.js.
import { floorAt, type CityMap } from "./map";
import { COIN_RADIUS, COIN_VALUE, coinActive, type Coin, type Obstacle, type Rect } from "./world";

export const GRAVITY = 26;
export const WALK = { SPEED: 5.5, ACCEL: 12, TURN: 12, JUMP_V: 9, RADIUS: 0.35 };
export const CAR = { MAX: 18, ACCEL_K: 1.6, DRAG: 1.4, TURN: 2.4, HOP_V: 6, RADIUS: 1.5 };
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

/** World-space move vector (already rotated by the camera), length <= 1. */
export interface MoveInput {
  wx: number;
  wz: number;
  jump: boolean;
}

export function createBody(x: number, z: number, yaw = Math.PI): Body {
  return { x, y: 0, z, vx: 0, vz: 0, vy: 0, yaw, speed: 0, grounded: true };
}

export function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

export function turnToward(current: number, target: number, maxStep: number): number {
  const d = angleDiff(target, current);
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Keyboard + joystick merged into one stick vector (x right, y up), length <= 1. */
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

/** Stick up = where the camera looks, stick right = screen right. */
export function cameraRelative(x: number, y: number, camYaw: number) {
  const fx = Math.sin(camYaw);
  const fz = Math.cos(camYaw);
  const rx = -Math.cos(camYaw);
  const rz = Math.sin(camYaw);
  return { wx: fx * y + rx * x, wz: fz * y + rz * x };
}

export function applyVertical(b: Body, jump: boolean, jumpV: number, dt: number, floor: number) {
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

export function pushOutCircles(b: { x: number; z: number }, obstacles: Obstacle[], radius: number) {
  let hit = false;
  for (const o of obstacles) {
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    const min = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      b.x = o.x + (dx / d) * min;
      b.z = o.z + (dz / d) * min;
      hit = true;
    }
  }
  return hit;
}

export function pushOutBoxes(b: { x: number; z: number }, boxes: Rect[], radius: number) {
  let hit = false;
  for (const r of boxes) {
    if (b.x < r.x0 - radius || b.x > r.x1 + radius || b.z < r.z0 - radius || b.z > r.z1 + radius) continue;
    const cx = clamp(b.x, r.x0, r.x1);
    const cz = clamp(b.z, r.z0, r.z1);
    const dx = b.x - cx;
    const dz = b.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > 1e-8) {
      if (d2 >= radius * radius) continue;
      const d = Math.sqrt(d2);
      b.x = cx + (dx / d) * radius;
      b.z = cz + (dz / d) * radius;
    } else {
      // centre inside the box: leave through the nearest edge
      const exits = [b.x - r.x0, r.x1 - b.x, b.z - r.z0, r.z1 - b.z];
      const m = Math.min(...exits);
      if (m === exits[0]) b.x = r.x0 - radius;
      else if (m === exits[1]) b.x = r.x1 + radius;
      else if (m === exits[2]) b.z = r.z0 - radius;
      else b.z = r.z1 + radius;
    }
    hit = true;
  }
  return hit;
}

export function collide(b: { x: number; z: number }, map: CityMap, radius: number) {
  const a = pushOutBoxes(b, map.boxes, radius);
  const c = pushOutCircles(b, map.circles, radius);
  b.x = clamp(b.x, map.bounds.x0, map.bounds.x1);
  b.z = clamp(b.z, map.bounds.z0, map.bounds.z1);
  return a || c;
}

export function stepWalker(b: Body, inp: MoveInput, dt: number, map: CityMap) {
  const k = 1 - Math.exp(-WALK.ACCEL * dt);
  b.vx += (inp.wx * WALK.SPEED - b.vx) * k;
  b.vz += (inp.wz * WALK.SPEED - b.vz) * k;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  b.speed = Math.hypot(b.vx, b.vz);
  if (b.speed > 0.3) b.yaw = turnToward(b.yaw, Math.atan2(b.vx, b.vz), WALK.TURN * dt);
  collide(b, map, WALK.RADIUS);
  applyVertical(b, inp.jump, WALK.JUMP_V, dt, floorAt(map, b.x, b.z));
}

/** Arcade car: steers toward the stick direction, speed follows stick tilt. */
export function stepCar(b: Body, inp: MoveInput, dt: number, map: CityMap) {
  const mag = Math.min(1, Math.hypot(inp.wx, inp.wz));
  if (mag > 0.15) {
    const target = Math.atan2(inp.wx, inp.wz);
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
  if (collide(b, map, CAR.RADIUS)) b.speed *= Math.exp(-4 * dt);
  applyVertical(b, inp.jump, CAR.HOP_V, dt, 0);
}

/** Marks touched coins as taken and returns the points earned. */
export function collectCoins(coins: Coin[], x: number, z: number, now: number, picked?: Coin[]): number {
  let gained = 0;
  for (const c of coins) {
    if (!coinActive(c, now)) continue;
    const dx = c.x - x;
    const dz = c.z - z;
    if (dx * dx + dz * dz <= COIN_RADIUS * COIN_RADIUS) {
      c.takenAt = now;
      gained += COIN_VALUE;
      picked?.push(c);
    }
  }
  return gained;
}

export function canEnterCar(player: Body, car: Body): boolean {
  return Math.hypot(player.x - car.x, player.z - car.z) <= CAR_ENTER_DIST;
}

/** Park the summoned car beside the player (screen right), clear of buildings. */
export function summonCarSpot(player: Body, camYaw: number, map: CityMap) {
  const p = { x: player.x - Math.cos(camYaw) * 3.2, z: player.z + Math.sin(camYaw) * 3.2 };
  collide(p, map, CAR.RADIUS);
  return p;
}

export function exitSpot(car: Body, map: CityMap) {
  const p = { x: car.x + Math.cos(car.yaw) * 2.6, z: car.z - Math.sin(car.yaw) * 2.6 };
  collide(p, map, WALK.RADIUS);
  return p;
}
