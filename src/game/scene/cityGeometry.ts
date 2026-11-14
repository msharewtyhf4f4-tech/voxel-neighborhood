import {
  GATE_Z,
  HOUSE_CENTER_X,
  ROAD_END_Z,
  ROAD_HALF,
  ROAD_START_Z,
  SIDEWALK_H,
  SIDEWALK_OUTER,
  buildPalms,
  mulberry32,
  signPosition,
  type House,
} from "../sim/world";
import { HOUSE_STYLES, PAL } from "./palette";
import { place, shade, voxelGeometry, type Voxel } from "./voxel";

export const SIGN_Y = 2.5;
export const signYaw = (h: House) => (h.side === -1 ? Math.PI / 4 : -Math.PI / 4);

function houseVoxels(h: House): Voxel[] {
  const st = HOUSE_STYLES[h.style];
  const W = 7.6;
  const D = 7;
  const H = h.floors === 2 ? 6.6 : 4.5;
  const fz = D / 2;
  const dx = -h.side * 1.6; // door away from the sign
  const v: Voxel[] = [];
  v.push({ p: [0, H / 2, 0], s: [W, H, D], c: st.wall });
  v.push({ p: [0, 0.22, 0], s: [W + 0.2, 0.44, D + 0.2], c: st.trim });
  v.push({ p: [0, H + 0.12, 0], s: [W + 0.24, 0.24, D + 0.24], c: st.trim });
  if (h.floors === 2) v.push({ p: [0, 3.35, fz + 0.06], s: [W + 0.1, 0.18, 0.16], c: st.trim });
  for (let i = 0; i < 7; i++) {
    const x = -W / 2 + 0.35 + (i * (W - 0.7)) / 6;
    v.push({ p: [x, H + 0.5, fz - 0.02], s: [0.5, 0.55, 0.3], c: st.trim });
  }
  for (let i = 0; i < 6; i++) {
    const z = -D / 2 + 0.4 + (i * (D - 0.8)) / 5;
    v.push({ p: [-W / 2 + 0.05, H + 0.5, z], s: [0.3, 0.55, 0.5], c: st.trim });
    v.push({ p: [W / 2 - 0.05, H + 0.5, z], s: [0.3, 0.55, 0.5], c: st.trim });
  }
  // door
  v.push({ p: [dx, 1.3, fz + 0.06], s: [1.5, 2.5, 0.14], c: st.door });
  v.push({ p: [dx, 1.3, fz + 0.1], s: [0.08, 2.4, 0.04], c: shade(st.door, -0.08) });
  v.push({ p: [dx, 2.75, fz + 0.12], s: [2.0, 0.34, 0.26], c: st.trim });
  v.push({ p: [dx + 0.4, 1.3, fz + 0.16], s: [0.1, 0.12, 0.06], c: PAL.handle });
  v.push({ p: [dx - 0.4, 1.3, fz + 0.16], s: [0.1, 0.12, 0.06], c: PAL.handle });
  const windowAt = (x: number, y: number) => {
    v.push({ p: [x, y, fz + 0.04], s: [1.3, 1.1, 0.1], c: PAL.glass });
    v.push({ p: [x, y, fz + 0.08], s: [0.08, 1.1, 0.06], c: st.trim });
    v.push({ p: [x, y - 0.62, fz + 0.12], s: [1.55, 0.14, 0.26], c: st.trim });
    v.push({ p: [x, y + 0.62, fz + 0.09], s: [1.55, 0.14, 0.2], c: st.trim });
  };
  windowAt(-dx, 1.8);
  if (h.floors === 2) {
    windowAt(-dx, 4.8);
    windowAt(dx, 4.8);
  }
  // AC unit
  const acx = dx > 0 ? -3.1 : 3.1;
  v.push({ p: [acx, H - 1.0, fz + 0.3], s: [0.95, 0.62, 0.5], c: PAL.ac });
  v.push({ p: [acx, H - 1.0, fz + 0.56], s: [0.65, 0.42, 0.02], c: PAL.acGrille });
  // roof water tank
  v.push({ p: [-1.6, H + 0.85, -1.4], s: [1.3, 1.2, 1.3], c: PAL.tank });
  v.push({ p: [-1.6, H + 1.15, -1.4], s: [1.34, 0.14, 1.34], c: PAL.tankBlue });
  // yard wall with a gate gap in front of the door
  const wz = fz + 1.3;
  const segs: [number, number][] = [
    [-W / 2 - 0.3, dx - 1.1],
    [dx + 1.1, W / 2 + 0.3],
  ];
  for (const [a, b] of segs) {
    if (b - a <= 0.1) continue;
    v.push({ p: [(a + b) / 2, 0.5, wz], s: [b - a, 1.0, 0.3], c: st.wall });
    v.push({ p: [(a + b) / 2, 1.05, wz], s: [b - a + 0.06, 0.12, 0.38], c: st.trim });
  }
  for (const x of [dx - 1.1, dx + 1.1]) v.push({ p: [x, 0.7, wz], s: [0.42, 1.4, 0.42], c: st.trim });
  v.push({ p: [-W / 2 - 0.15, 0.5, fz + 0.65], s: [0.3, 1.0, 1.3], c: st.wall });
  v.push({ p: [W / 2 + 0.15, 0.5, fz + 0.65], s: [0.3, 1.0, 1.3], c: st.wall });
  // path to the gate
  v.push({ p: [dx, 0.03, fz + 0.65], s: [1.6, 0.06, 1.3], c: PAL.tileA });
  return place(v, [h.x, 0, h.z], h.side === -1 ? Math.PI / 2 : -Math.PI / 2);
}

function palmVoxels(x: number, z: number, seed: number): Voxel[] {
  const v: Voxel[] = [];
  const lean = (seed % 2 ? 1 : -1) * 0.05;
  let ox = 0;
  for (let i = 0; i < 7; i++) {
    ox += lean;
    v.push({ p: [x + ox, 0.3 + i * 0.6, z], s: [0.42, 0.6, 0.42], c: i % 2 ? PAL.palmTrunk : PAL.palmTrunk2 });
  }
  const tx = x + ox;
  const ty = 4.4;
  v.push({ p: [tx, ty, z], s: [0.75, 0.5, 0.75], c: PAL.palmLeaf });
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + seed * 0.7;
    const cx = Math.sin(a);
    const cz = Math.cos(a);
    v.push({ p: [tx + cx * 1.1, ty + 0.1, z + cz * 1.1], s: [0.55, 0.18, 1.6], c: k % 2 ? PAL.palmLeaf : PAL.palmLeaf2, r: a });
    v.push({ p: [tx + cx * 2.1, ty - 0.3, z + cz * 2.1], s: [0.42, 0.16, 0.9], c: PAL.palmLeaf2, r: a });
  }
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    v.push({ p: [tx + Math.sin(a) * 0.35, ty - 0.4, z + Math.cos(a) * 0.35], s: [0.24, 0.24, 0.24], c: PAL.coconut });
  }
  v.push({ p: [x, SIDEWALK_H + 0.04, z], s: [1.1, 0.08, 1.1], c: PAL.tileB });
  return v;
}

function mosqueVoxels(z: number): Voxel[] {
  const v: Voxel[] = [];
  v.push({ p: [0, 3, z], s: [16, 6, 12], c: PAL.mosque });
  v.push({ p: [0, 6.15, z], s: [16.4, 0.3, 12.4], c: PAL.mosqueTrim });
  for (let i = 0; i < 6; i++) {
    const w = 8 - i * 1.25;
    v.push({ p: [0, 6.7 + i * 0.75, z], s: [w, 0.75, w], c: i % 2 ? PAL.dome : shade(PAL.dome, 0.04) });
  }
  v.push({ p: [0, 11.6, z], s: [0.2, 1.2, 0.2], c: PAL.dome });
  v.push({ p: [0, 2, z + 6.05], s: [3, 4, 0.2], c: "#1f5f63" });
  v.push({ p: [0, 4.3, z + 6.1], s: [3.8, 0.6, 0.3], c: PAL.mosqueTrim });
  for (const wx of [-5, -2.8, 2.8, 5]) v.push({ p: [wx, 3.2, z + 6.04], s: [1, 2, 0.12], c: PAL.glass });
  // minaret
  const mx = 9.5;
  v.push({ p: [mx, 8, z], s: [2.2, 16, 2.2], c: PAL.mosque });
  v.push({ p: [mx, 12.5, z], s: [2.9, 0.5, 2.9], c: PAL.mosqueTrim });
  v.push({ p: [mx, 16.3, z], s: [2.6, 0.5, 2.6], c: PAL.mosqueTrim });
  v.push({ p: [mx, 17.2, z], s: [1.6, 1.3, 1.6], c: PAL.dome });
  v.push({ p: [mx, 18.2, z], s: [0.8, 0.8, 0.8], c: PAL.dome });
  v.push({ p: [mx, 19, z], s: [0.16, 1, 0.16], c: PAL.dome });
  return v;
}

function gateVoxels(z: number): Voxel[] {
  const v: Voxel[] = [];
  for (const x of [-7.7, 7.7]) {
    v.push({ p: [x, 4, z], s: [1.4, 8, 1.4], c: PAL.gate });
    v.push({ p: [x, 0.3, z], s: [1.8, 0.6, 1.8], c: PAL.gateTrim });
    v.push({ p: [x, 10.1, z], s: [1.0, 0.6, 1.0], c: PAL.gateTrim });
  }
  v.push({ p: [0, 8.8, z], s: [16.8, 2.0, 1.1], c: PAL.gate });
  v.push({ p: [0, 9.9, z], s: [17.2, 0.25, 1.3], c: PAL.gateTrim });
  for (let i = 0; i < 9; i++) v.push({ p: [-6.4 + i * 1.6, 10.3, z], s: [0.6, 0.55, 0.5], c: PAL.gateTrim });
  return v;
}

export function buildCityGeometry(houses: House[]) {
  const v: Voxel[] = [];
  const rng = mulberry32(21);
  const sw = SIDEWALK_OUTER - ROAD_HALF;
  for (let z = ROAD_START_Z; z > ROAD_END_Z; z -= 2) {
    for (const side of [-1, 1]) {
      const c = rng() > 0.5 ? PAL.tileA : PAL.tileB;
      v.push({ p: [side * (ROAD_HALF + sw / 2), SIDEWALK_H / 2, z - 1], s: [sw, SIDEWALK_H, 1.96], c: shade(c, (rng() - 0.5) * 0.03) });
    }
  }
  let k = 0;
  for (let z = ROAD_START_Z; z > ROAD_END_Z; z -= 1, k++) {
    for (const side of [-1, 1]) {
      v.push({ p: [side * (ROAD_HALF + 0.08), 0.12, z - 0.5], s: [0.18, 0.24, 0.98], c: k % 2 ? PAL.curbDark : PAL.curbYellow });
    }
  }
  houses.forEach((h) => v.push(...houseVoxels(h)));
  houses.forEach((h) => {
    const s = signPosition(h);
    const yaw = signYaw(h);
    const nx = Math.sin(yaw);
    const nz = Math.cos(yaw);
    v.push({ p: [s.x - nx * 0.07, SIGN_Y, s.z - nz * 0.07], s: [2.8, 1.62, 0.1], c: PAL.signBack, r: yaw });
    v.push({ p: [s.x - nx * 0.14, 0.9, s.z - nz * 0.14], s: [0.18, 1.8, 0.18], c: PAL.post, r: yaw });
  });
  buildPalms().forEach((p, i) => v.push(...palmVoxels(p.x, p.z, i)));
  v.push(...gateVoxels(GATE_Z));
  v.push(...mosqueVoxels(ROAD_END_Z + 8));
  // background skyline
  for (const side of [-1, 1]) {
    for (let z = 10; z > ROAD_END_Z; z -= 9) {
      const w = 5 + rng() * 3;
      const hgt = 4 + rng() * 7;
      const x = side * (HOUSE_CENTER_X + 11 + rng() * 4);
      v.push({ p: [x, hgt / 2, z], s: [w, hgt, 7], c: rng() > 0.5 ? PAL.far : PAL.far2 });
    }
  }
  // clouds
  for (let i = 0; i < 12; i++) {
    const cx = (rng() * 2 - 1) * 70;
    const cy = 30 + rng() * 10;
    const cz = 20 - rng() * 200;
    for (let j = 0; j < 4; j++) {
      v.push({ p: [cx + (j - 1.5) * 3, cy + (j % 2) * 1.2, cz + (rng() - 0.5) * 3], s: [4 + rng() * 3, 2 + rng() * 1.5, 4 + rng() * 2], c: PAL.cloud });
    }
  }
  return voxelGeometry(v);
}
