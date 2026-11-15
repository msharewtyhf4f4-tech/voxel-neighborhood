import {
  KIOSKS,
  MALL,
  MOSQUE,
  PARK,
  RACE,
  RESTAURANT,
  STADIUM,
  fence,
  stadiumStands,
  type CityMap,
} from "../sim/map";
import {
  GATE_Z,
  ROAD_HALF,
  SIDEWALK_H,
  mulberry32,
  palmsForStreet,
  signPosition,
  type House,
  type Rect,
} from "../sim/world";
import { HOUSE_STYLES, PAL } from "./palette";
import { place, shade, voxelGeometry, type Voxel } from "./voxel";

export const SIGN_Y = 2.5;
export const signYaw = (h: House) => (h.side === -1 ? Math.PI / 4 : -Math.PI / 4);

/** خيمة عربية للمبتدئين (المستوى 0) */
function tentVoxels(h: House): Voxel[] {
  const v: Voxel[] = [];
  // سجادة أرضية
  v.push({ p: [0, 0.05, 0], s: [5.4, 0.1, 5.4], c: "#c94a38" });
  v.push({ p: [0, 0.08, 0], s: [4.4, 0.1, 4.4], c: "#e6b85c" });
  // جدران الخيمة
  v.push({ p: [-2.2, 1.0, 0], s: [0.18, 2.0, 4.6], c: "#f2eadc" });
  v.push({ p: [2.2, 1.0, 0], s: [0.18, 2.0, 4.6], c: "#f2eadc" });
  v.push({ p: [0, 1.0, -2.2], s: [4.6, 2.0, 0.18], c: "#f2eadc" });
  // سقف الخيمة الهرمي المخطط
  for (let i = 0; i < 5; i++) {
    const w = 4.8 - i * 0.85;
    const c = i % 2 === 0 ? "#8c2d19" : "#f5efe6";
    v.push({ p: [0, 2.1 + i * 0.35, 0], s: [w, 0.35, w], c });
  }
  // عمود الخيمة الذهبي
  v.push({ p: [0, 2.0, 0], s: [0.22, 4.0, 0.22], c: "#d4a017" });
  // نار صغيرة وجلسة أمام الخيمة
  v.push({ p: [0, 0.15, 3.2], s: [0.9, 0.2, 0.9], c: "#5c4d42" });
  v.push({ p: [0, 0.35, 3.2], s: [0.4, 0.4, 0.4], c: "#ff6b1a" });
  return place(v, [h.x, 0, h.z], h.side === -1 ? Math.PI / 2 : -Math.PI / 2);
}

/** بناء البيت حسب مستواه: 0 خيمة، 1 طابق، 2 طابقين، 3 ثلاثة طوابق */
export function buildHouseGeometry(h: House) {
  return voxelGeometry(houseVoxels(h));
}

export function houseVoxels(h: House): Voxel[] {
  const floors = h.floors ?? 0;
  if (floors === 0) return tentVoxels(h);

  const st = HOUSE_STYLES[h.style % HOUSE_STYLES.length]!;
  const W = 7.6;
  const D = 7;
  const H = floors === 3 ? 9.2 : floors === 2 ? 6.6 : 4.5;
  const fz = D / 2;
  const dx = -h.side * 1.6;
  const v: Voxel[] = [];

  v.push({ p: [0, H / 2, 0], s: [W, H, D], c: st.wall });
  v.push({ p: [0, 0.22, 0], s: [W + 0.2, 0.44, D + 0.2], c: st.trim });
  v.push({ p: [0, H + 0.12, 0], s: [W + 0.24, 0.24, D + 0.24], c: st.trim });

  if (floors >= 2) v.push({ p: [0, 3.35, fz + 0.06], s: [W + 0.1, 0.18, 0.16], c: st.trim });
  if (floors === 3) v.push({ p: [0, 6.35, fz + 0.06], s: [W + 0.1, 0.18, 0.16], c: st.trim });

  for (let i = 0; i < 7; i++) {
    const x = -W / 2 + 0.35 + (i * (W - 0.7)) / 6;
    v.push({ p: [x, H + 0.5, fz - 0.02], s: [0.5, 0.55, 0.3], c: st.trim });
  }
  for (let i = 0; i < 6; i++) {
    const z = -D / 2 + 0.4 + (i * (D - 0.8)) / 5;
    v.push({ p: [-W / 2 + 0.05, H + 0.5, z], s: [0.3, 0.55, 0.5], c: st.trim });
    v.push({ p: [W / 2 - 0.05, H + 0.5, z], s: [0.3, 0.55, 0.5], c: st.trim });
  }

  // الباب
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
  if (floors >= 2) {
    windowAt(-dx, 4.8);
    windowAt(dx, 4.8);
  }
  if (floors === 3) {
    windowAt(-dx, 7.6);
    windowAt(dx, 7.6);
    // شرفة ذهبية فخمة للفيلا 3 طوابق
    v.push({ p: [0, 6.45, fz + 0.55], s: [4.2, 0.16, 1.0], c: "#d4a017" });
  }

  // المكيف
  const acx = dx > 0 ? -3.1 : 3.1;
  v.push({ p: [acx, H - 1.0, fz + 0.3], s: [0.95, 0.62, 0.5], c: PAL.ac });
  v.push({ p: [acx, H - 1.0, fz + 0.56], s: [0.65, 0.42, 0.02], c: PAL.acGrille });

  // خزان السطح
  v.push({ p: [-1.6, H + 0.85, -1.4], s: [1.3, 1.2, 1.3], c: PAL.tank });
  v.push({ p: [-1.6, H + 1.15, -1.4], s: [1.34, 0.14, 1.34], c: PAL.tankBlue });

  // سور الحوش
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

function mosqueVoxels(x: number, z: number): Voxel[] {
  const v: Voxel[] = [];
  v.push({ p: [x, 3, z], s: [16, 6, 12], c: PAL.mosque });
  v.push({ p: [x, 6.15, z], s: [16.4, 0.3, 12.4], c: PAL.mosqueTrim });
  for (let i = 0; i < 6; i++) {
    const w = 8 - i * 1.25;
    v.push({ p: [x, 6.7 + i * 0.75, z], s: [w, 0.75, w], c: i % 2 ? PAL.dome : shade(PAL.dome, 0.04) });
  }
  v.push({ p: [x, 11.6, z], s: [0.2, 1.2, 0.2], c: PAL.dome });
  v.push({ p: [x, 2, z + 6.05], s: [3, 4, 0.2], c: "#1f5f63" });
  v.push({ p: [x, 4.3, z + 6.1], s: [3.8, 0.6, 0.3], c: PAL.mosqueTrim });
  for (const wx of [-5, -2.8, 2.8, 5]) v.push({ p: [x + wx, 3.2, z + 6.04], s: [1, 2, 0.12], c: PAL.glass });
  const mx = x + 9.5;
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

const flat = (r: Rect, y: number, h: number, c: string): Voxel => ({
  p: [(r.x0 + r.x1) / 2, y + h / 2, (r.z0 + r.z1) / 2],
  s: [r.x1 - r.x0, h, r.z1 - r.z0],
  c,
});

/** Residential sidewalks: tiles + yellow/black curbs along every street. */
function sidewalkVoxels(map: CityMap, rng: () => number): Voxel[] {
  const v: Voxel[] = [];
  for (const r of map.sidewalks) {
    const w = r.x1 - r.x0;
    const cx = (r.x0 + r.x1) / 2;
    for (let z = r.z1; z > r.z0 + 0.01; z -= 2) {
      const len = Math.min(2, z - r.z0);
      const c = rng() > 0.5 ? PAL.tileA : PAL.tileB;
      v.push({ p: [cx, SIDEWALK_H / 2, z - len / 2], s: [w, SIDEWALK_H, len - 0.04], c: shade(c, (rng() - 0.5) * 0.03) });
    }
    // curb on the road side
    const roadSide = map.streetXs.some((sx) => Math.abs(sx - ROAD_HALF - r.x1) < 0.01) ? r.x1 : r.x0;
    let k = 0;
    for (let z = r.z1; z > r.z0 + 0.01; z -= 2, k++) {
      v.push({ p: [roadSide, 0.12, z - 1], s: [0.18, 0.24, 1.96], c: k % 2 ? PAL.curbDark : PAL.curbYellow });
    }
  }
  return v;
}

function houseSignVoxels(lots: House[]): Voxel[] {
  const v: Voxel[] = [];
  for (const h of lots) {
    const s = signPosition(h);
    const yaw = signYaw(h);
    const nx = Math.sin(yaw);
    const nz = Math.cos(yaw);
    v.push({ p: [s.x - nx * 0.07, SIGN_Y, s.z - nz * 0.07], s: [2.8, 1.62, 0.1], c: PAL.signBack, r: yaw });
    v.push({ p: [s.x - nx * 0.14, 0.9, s.z - nz * 0.14], s: [0.18, 1.8, 0.18], c: PAL.post, r: yaw });
  }
  return v;
}

/** Road direction signs: two posts and a board; the faces are textured planes. */
export const DIR_SIGN = { w: 3.2, h: 2.4, y: 3.2 };
function directionSignVoxels(map: CityMap): Voxel[] {
  const v: Voxel[] = [];
  for (const sg of map.signs) {
    const ox = Math.cos(sg.yaw) * 1.2;
    const oz = -Math.sin(sg.yaw) * 1.2;
    for (const k of [-1, 1]) v.push({ p: [sg.x + ox * k, (DIR_SIGN.y + DIR_SIGN.h / 2) / 2, sg.z + oz * k], s: [0.2, DIR_SIGN.y + DIR_SIGN.h / 2, 0.2], c: PAL.post });
    v.push({ p: [sg.x, DIR_SIGN.y, sg.z], s: [DIR_SIGN.w + 0.2, DIR_SIGN.h + 0.2, 0.1], c: "#1d6b47", r: sg.yaw });
  }
  return v;
}

function stadiumVoxels(glow: Voxel[]): Voxel[] {
  const v: Voxel[] = [];
  const o = STADIUM.outer;
  const p = STADIUM.pitch;
  const d = STADIUM.standDepth;
  // concrete floor inside the bowl, then striped grass
  v.push(flat({ x0: o.x0 + d, x1: o.x1 - d, z0: o.z0 + d, z1: o.z1 - d }, 0, 0.04, "#bdb6a6"));
  const stripes = 8;
  const sw = (p.x1 - p.x0) / stripes;
  for (let i = 0; i < stripes; i++) {
    v.push(flat({ x0: p.x0 + i * sw, x1: p.x0 + (i + 1) * sw, z0: p.z0 - 1.5, z1: p.z1 + 1.5 }, 0, 0.08, i % 2 ? "#3a9e4a" : "#45b357"));
  }
  const line = "#f4f4ee";
  const L = 0.09;
  const lw = 0.22;
  v.push(flat({ x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z0 + lw }, L, 0.02, line));
  v.push(flat({ x0: p.x0, x1: p.x1, z0: p.z1 - lw, z1: p.z1 }, L, 0.02, line));
  v.push(flat({ x0: p.x0, x1: p.x0 + lw, z0: p.z0, z1: p.z1 }, L, 0.02, line));
  v.push(flat({ x0: p.x1 - lw, x1: p.x1, z0: p.z0, z1: p.z1 }, L, 0.02, line));
  const cx = (p.x0 + p.x1) / 2;
  const cz = (p.z0 + p.z1) / 2;
  v.push(flat({ x0: cx - lw / 2, x1: cx + lw / 2, z0: p.z0, z1: p.z1 }, L, 0.02, line));
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    v.push({ p: [cx + Math.sin(a) * 4, L + 0.01, cz + Math.cos(a) * 4], s: [1.3, 0.02, lw], c: line, r: a + Math.PI / 2 });
  }
  for (const [gx, dir] of [
    [p.x0, 1],
    [p.x1, -1],
  ] as const) {
    // penalty box
    const bx = gx + dir * 6;
    v.push(flat({ x0: Math.min(gx, bx), x1: Math.max(gx, bx), z0: cz - 7, z1: cz - 7 + lw }, L, 0.02, line));
    v.push(flat({ x0: Math.min(gx, bx), x1: Math.max(gx, bx), z0: cz + 7 - lw, z1: cz + 7 }, L, 0.02, line));
    v.push(flat({ x0: bx - lw / 2, x1: bx + lw / 2, z0: cz - 7, z1: cz + 7 }, L, 0.02, line));
    // goal: posts, crossbar, net
    for (const gz of [cz - 3.6, cz + 3.6]) v.push({ p: [gx, 1.2, gz], s: [0.2, 2.4, 0.2], c: line });
    v.push({ p: [gx, 2.4, cz], s: [0.2, 0.2, 7.4], c: line });
    v.push({ p: [gx - dir * 1.2, 1.2, cz], s: [0.06, 2.4, 7.2], c: "#d8dde0" });
    v.push({ p: [gx - dir * 0.6, 2.38, cz], s: [1.2, 0.05, 7.2], c: "#d8dde0" });
  }
  // stands: steps rising away from the pitch
  const seatColors = ["#c0392b", "#f4f1ea", "#2a6f97", "#f4f1ea"];
  stadiumStands().forEach((r) => {
    const w = r.x1 - r.x0;
    const dz = r.z1 - r.z0;
    const alongX = w > dz;
    const inner = alongX ? (r.z0 < (p.z0 + p.z1) / 2 ? "+z" : "-z") : r.x0 < cx ? "+x" : "-x";
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const h = 1.2 + i * 1.3;
      const c = seatColors[i % seatColors.length]!;
      let band: Rect;
      if (inner === "+z") band = { x0: r.x0, x1: r.x1, z0: r.z1 - ((i + 1) * dz) / steps, z1: r.z1 - (i * dz) / steps };
      else if (inner === "-z") band = { x0: r.x0, x1: r.x1, z0: r.z0 + (i * dz) / steps, z1: r.z0 + ((i + 1) * dz) / steps };
      else if (inner === "+x") band = { x0: r.x1 - ((i + 1) * w) / steps, x1: r.x1 - (i * w) / steps, z0: r.z0, z1: r.z1 };
      else band = { x0: r.x0 + (i * w) / steps, x1: r.x0 + ((i + 1) * w) / steps, z0: r.z0, z1: r.z1 };
      v.push(flat(band, 0, h, shade("#9c9688", -i * 0.03)));
      // seat row on top of each step
      v.push(flat(band, h, 0.3, c));
    }
    // back wall
    const t = 0.6;
    const back: Rect =
      inner === "+z"
        ? { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z0 + t }
        : inner === "-z"
          ? { x0: r.x0, x1: r.x1, z0: r.z1 - t, z1: r.z1 }
          : inner === "+x"
            ? { x0: r.x0, x1: r.x0 + t, z0: r.z0, z1: r.z1 }
            : { x0: r.x1 - t, x1: r.x1, z0: r.z0, z1: r.z1 };
    v.push(flat(back, 0, 7.6, "#d8d1c2"));
  });
  // entrance arch over the gate
  const g = STADIUM.gate;
  for (const x of [g.x0 - 0.4, g.x1 + 0.4]) v.push({ p: [x, 4.5, o.z0 + 0.4], s: [0.9, 9, 0.9], c: "#2a6f97" });
  v.push({ p: [(g.x0 + g.x1) / 2, 8.4, o.z0 + 0.4], s: [g.x1 - g.x0 + 1.8, 1.4, 0.9], c: "#2a6f97" });
  // floodlights in the four corners, heads aimed at the pitch
  for (const [x, z] of [
    [o.x0 + 2.5, o.z0 + 2.5],
    [o.x1 - 2.5, o.z0 + 2.5],
    [o.x0 + 2.5, o.z1 - 2.5],
    [o.x1 - 2.5, o.z1 - 2.5],
  ] as const) {
    const yaw = Math.atan2(cx - x, cz - z);
    v.push({ p: [x, 12, z], s: [0.7, 24, 0.7], c: "#7d858c" });
    v.push({ p: [x, 24.5, z], s: [5.2, 3.2, 0.5], c: "#3a3d40", r: yaw });
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        const lx = (i - 1) * 1.6;
        const ly = 24 + j * 1.3;
        glow.push({ p: [x + Math.cos(yaw) * lx + Math.sin(yaw) * 0.3, ly, z - Math.sin(yaw) * lx + Math.cos(yaw) * 0.3], s: [1.3, 1.0, 0.1], c: "#fffbe6", r: yaw });
      }
  }
  return v;
}

function mallVoxels(glow: Voxel[]): Voxel[] {
  const v: Voxel[] = [];
  const b = MALL.building;
  const H = 14;
  const cz = (b.z0 + b.z1) / 2;
  v.push(flat(b, 0, H, "#f4f1ea"));
  v.push(flat({ x0: b.x0 - 0.3, x1: b.x1 + 0.3, z0: b.z0 - 0.3, z1: b.z1 + 0.3 }, H, 0.8, "#2b5b84"));
  // glass curtain wall on the west (front) face, two floors
  for (const y of [3.4, 8.4]) {
    v.push({ p: [b.x0 - 0.06, y, cz], s: [0.14, 3.2, b.z1 - b.z0 - 4], c: "#6fb3d9" });
    for (let z = b.z0 + 2; z <= b.z1 - 2 + 0.01; z += 4) v.push({ p: [b.x0 - 0.14, y, z], s: [0.14, 3.4, 0.3], c: "#e9ecef" });
  }
  v.push({ p: [b.x0 - 0.1, 5.9, cz], s: [0.3, 0.5, b.z1 - b.z0], c: "#2b5b84" });
  // entrance: doors, canopy, pillars
  v.push({ p: [b.x0 - 0.12, 1.6, cz], s: [0.16, 3.2, 8], c: "#9fd3ee" });
  v.push({ p: [b.x0 - 2.5, 3.6, cz], s: [5, 0.4, 11], c: "#e69f24" });
  for (const dz of [-5, 5]) v.push({ p: [b.x0 - 4.6, 1.8, cz + dz], s: [0.5, 3.6, 0.5], c: "#e9ecef" });
  // side windows
  for (const z of [b.z0 - 0.06, b.z1 + 0.06])
    for (let x = b.x0 + 4; x < b.x1 - 2; x += 6) for (const y of [3.4, 8.4]) v.push({ p: [x, y, z], s: [3.6, 2.4, 0.14], c: "#6fb3d9" });
  // rooftop units
  for (let i = 0; i < 4; i++) v.push({ p: [b.x0 + 12 + i * 9, H + 1.4, cz + (i % 2 ? 8 : -8)], s: [4, 1.6, 3], c: "#c9ced2" });
  // sign board frame (texture plane sits in front)
  v.push({ p: [b.x0 - 0.2, 11.4, cz], s: [0.3, 3.4, 18.4], c: "#1f3b47" });
  glow.push({ p: [b.x0 - 0.38, 9.55, cz], s: [0.06, 0.12, 18], c: "#ffd166" });
  // parking lot: asphalt, white bays, a few parked cars
  const lot = MALL.lot;
  v.push(flat(lot, 0, 0.05, "#4a4d52"));
  for (let z = lot.z0 + 2; z <= lot.z1 - 2; z += 3) {
    v.push(flat({ x0: lot.x0 + 3, x1: lot.x0 + 8, z0: z - 0.08, z1: z + 0.08 }, 0.05, 0.02, "#f4f4ee"));
    v.push(flat({ x0: lot.x1 - 8, x1: lot.x1 - 3, z0: z - 0.08, z1: z + 0.08 }, 0.05, 0.02, "#f4f4ee"));
  }
  return v;
}

function parkVoxels(): Voxel[] {
  const v: Voxel[] = [];
  const a = PARK.area;
  v.push(flat(a, 0, 0.06, "#7cc46a"));
  // fence (same rects as the collision), striped
  for (const r of fence(a, "west", { a: PARK.gate.z0, b: PARK.gate.z1 })) {
    const alongX = r.x1 - r.x0 > r.z1 - r.z0;
    const len = alongX ? r.x1 - r.x0 : r.z1 - r.z0;
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i < n; i++) {
      const c = i % 2 ? "#f1faee" : "#e63946";
      const seg: Rect = alongX
        ? { x0: r.x0 + (i * len) / n, x1: r.x0 + ((i + 1) * len) / n, z0: r.z0, z1: r.z1 }
        : { x0: r.x0, x1: r.x1, z0: r.z0 + (i * len) / n, z1: r.z0 + ((i + 1) * len) / n };
      v.push(flat(seg, 0, 1.3, c));
    }
  }
  // gate arch
  const gz = (PARK.gate.z0 + PARK.gate.z1) / 2;
  for (const z of [PARK.gate.z0 - 0.5, PARK.gate.z1 + 0.5]) v.push({ p: [a.x0, 3.5, z], s: [1, 7, 1], c: "#8e44ad" });
  v.push({ p: [a.x0, 7.4, gz], s: [1, 1.6, PARK.gate.z1 - PARK.gate.z0 + 2], c: "#8e44ad" });
  for (let i = 0; i < 5; i++) v.push({ p: [a.x0, 8.6, PARK.gate.z0 - 0.5 + i * 2.25], s: [0.8, 0.8, 0.8], c: i % 2 ? "#f4a261" : "#e9c46a" });
  // tiled paths
  const w = PARK.wheel;
  const c = PARK.carousel;
  v.push(flat({ x0: a.x0, x1: w.x - 3, z0: gz - 2, z1: gz + 2 }, 0, 0.09, PAL.tileA));
  v.push(flat({ x0: c.x - 2, x1: c.x + 2, z0: c.z + c.r, z1: gz - 2 }, 0, 0.09, PAL.tileA));
  // Ferris wheel base + stepped A-frame legs (the wheel itself rotates, see City.tsx)
  v.push({ p: [w.x, 0.3, w.z], s: [8, 0.6, 9], c: "#5b6670" });
  for (const side of [-1, 1]) {
    const lz = w.z + side * 2.6;
    for (const dir of [-1, 1]) {
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        v.push({ p: [w.x + dir * 7 * (1 - t), (i + 0.5) * (w.axleY / steps), lz], s: [1, w.axleY / steps + 0.05, 1], c: "#e9ecef" });
      }
    }
    v.push({ p: [w.x, w.axleY, lz], s: [1.6, 1.6, 1.4], c: "#5b6670" });
  }
  // kiosks with striped awnings
  for (const k of KIOSKS) {
    v.push({ p: [k.x, 1.4, k.z], s: [5, 2.8, 4], c: "#fff8ea" });
    v.push({ p: [k.x, 1.0, k.z + 2.1], s: [4.6, 1.0, 0.4], c: k.color });
    for (let i = 0; i < 5; i++) v.push({ p: [k.x - 2 + i, 3.1, k.z + 0.3], s: [1, 0.35, 5], c: i % 2 ? "#ffffff" : k.color });
    v.push({ p: [k.x, 3.9, k.z], s: [2.2, 0.9, 0.3], c: k.color });
  }
  // benches and balloons
  const rng = mulberry32(55);
  for (let i = 0; i < 8; i++) {
    const x = a.x0 + 8 + rng() * (a.x1 - a.x0 - 16);
    const z = a.z0 + 6 + rng() * (a.z1 - a.z0 - 12);
    if (Math.abs(x - w.x) < 10 && Math.abs(z - w.z) < 8) continue;
    v.push({ p: [x, 3, z], s: [0.06, 6, 0.06], c: "#f4f4ee" });
    v.push({ p: [x, 6.3, z], s: [0.8, 1, 0.8], c: ["#e63946", "#f4a261", "#2a9d8f", "#8e44ad"][i % 4]! });
  }
  return v;
}

function raceVoxels(map: CityMap): Voxel[] {
  const v: Voxel[] = [];
  const mid = (RACE.z0 + RACE.z1) / 2;
  // checkered start and finish lines
  for (const lx of [RACE.startX, RACE.finishX])
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 14; j++)
        v.push({ p: [lx - 0.5 + i, 0.03, RACE.z0 + 0.5 + j], s: [1, 0.04, 1], c: (i + j) % 2 ? "#111111" : "#f4f4ee" });
  // gantries over the lines (banner textures are planes in City.tsx)
  for (const lx of [RACE.startX, RACE.finishX]) {
    for (const z of [RACE.z0 - 1.4, RACE.z1 + 1.4]) v.push({ p: [lx, 3.8, z], s: [0.7, 7.6, 0.7], c: "#3a3d40" });
    v.push({ p: [lx, 7.2, mid], s: [0.7, 1.6, RACE.z1 - RACE.z0 + 3.5], c: "#3a3d40" });
  }
  // red/white side barriers + end wall
  for (let x = RACE.barrierFrom; x < RACE.x1; x += 2) {
    const c = Math.round((x - RACE.barrierFrom) / 2) % 2 ? "#f4f4ee" : "#d62828";
    v.push({ p: [x + 1, 0.5, RACE.z0 - 0.3], s: [2, 1, 0.6], c });
    v.push({ p: [x + 1, 0.5, RACE.z1 + 0.3], s: [2, 1, 0.6], c });
  }
  v.push({ p: [RACE.x1 + 0.5, 1, mid], s: [1, 2, RACE.z1 - RACE.z0 + 1.2], c: "#d62828" });
  // speed chevrons on the asphalt
  for (let x = RACE.startX + 20; x < RACE.finishX - 10; x += 30)
    for (const dz of [-3.5, 3.5])
      for (const s of [-1, 1]) v.push({ p: [x, 0.025, mid + dz + s * 0.9], s: [2.4, 0.03, 0.35], c: "#f2c230", r: s * (Math.PI / 4) });
  // speed sign posts (faces are textured planes)
  for (const sg of map.speedSigns) v.push({ p: [sg.x, 1.3, sg.z], s: [0.16, 2.6, 0.16], c: PAL.post });
  return v;
}

function restaurantVoxels(x: number, z: number): Voxel[] {
  const v: Voxel[] = [];
  v.push({ p: [x, 2.4, z], s: [10, 4.8, 12], c: "#fff3d6" });
  v.push({ p: [x, 5.0, z], s: [10.6, 0.5, 12.6], c: "#d62828" });
  v.push({ p: [x - 5.05, 1.4, z], s: [0.14, 2.8, 2.4], c: "#8d5524" });
  for (const dz of [-4, 4]) v.push({ p: [x - 5.05, 2.4, z + dz], s: [0.12, 1.6, 2.6], c: PAL.glass });
  // striped awning
  for (let i = 0; i < 6; i++) v.push({ p: [x - 5.8, 3.4, z - 5 + i * 2], s: [1.6, 0.3, 2], c: i % 2 ? "#ffffff" : "#fcbf49" });
  // outdoor tables with burgers
  for (const tz of [z - 3, z, z + 3]) {
    v.push({ p: [x - 6.8, 0.45, tz], s: [1.2, 0.9, 1.2], c: "#8d5524" });
    v.push({ p: [x - 6.8, 0.96, tz], s: [0.5, 0.14, 0.5], c: "#f77f00" });
  }
  // big burger on the roof
  v.push({ p: [x, 5.7, z], s: [3, 0.6, 3], c: "#e9a84c" });
  v.push({ p: [x, 6.15, z], s: [3.1, 0.3, 3.1], c: "#6b3a1f" });
  v.push({ p: [x, 6.4, z], s: [3.2, 0.15, 3.2], c: "#4caf50" });
  v.push({ p: [x, 6.8, z], s: [3, 0.7, 3], c: "#e9a84c" });
  return v;
}

function skylineVoxels(map: CityMap, rng: () => number): Voxel[] {
  const v: Voxel[] = [];
  const b = map.bounds;
  const m = 10;
  const ring = (x: number, z: number) => {
    const w = 6 + rng() * 5;
    const h = 5 + rng() * 12;
    v.push({ p: [x, h / 2, z], s: [w, h, 6 + rng() * 4], c: rng() > 0.5 ? PAL.far : PAL.far2 });
  };
  for (let x = b.x0 - m; x <= b.x1 + m; x += 11) {
    ring(x, b.z0 - m - rng() * 6);
    ring(x, b.z1 + m + rng() * 6);
  }
  for (let z = b.z0; z <= b.z1; z += 11) {
    ring(b.x0 - m - rng() * 6, z);
    ring(b.x1 + m + rng() * 6, z);
  }
  return v;
}

function cloudVoxels(map: CityMap, rng: () => number): Voxel[] {
  const v: Voxel[] = [];
  const b = map.bounds;
  for (let i = 0; i < 28; i++) {
    const cx = b.x0 + rng() * (b.x1 - b.x0);
    const cy = 34 + rng() * 12;
    const cz = b.z0 + rng() * (b.z1 - b.z0);
    for (let j = 0; j < 4; j++) {
      v.push({ p: [cx + (j - 1.5) * 3, cy + (j % 2) * 1.2, cz + (rng() - 0.5) * 3], s: [4 + rng() * 3, 2 + rng() * 1.5, 4 + rng() * 2], c: PAL.cloud });
    }
  }
  return v;
}

/** All static scenery (except the houses, which change with their owners). */
export function buildCityGeometry(map: CityMap, lots: House[]) {
  const rng = mulberry32(21);
  const glow: Voxel[] = [];
  const v: Voxel[] = [];
  for (const r of map.roads) {
    if (r.kind === "lot") continue; // drawn by the mall
    if (r.kind === "path") v.push(flat(r, 0, 0.06, PAL.tileA));
  }
  v.push(...sidewalkVoxels(map, rng));
  v.push(...houseSignVoxels(lots));
  map.streetXs.forEach((_, s) => palmsForStreet(s).forEach((p, i) => v.push(...palmVoxels(p.x, p.z, s * 31 + i))));
  v.push(...gateVoxels(GATE_Z));
  v.push(...mosqueVoxels(MOSQUE.x, MOSQUE.z));
  v.push(...stadiumVoxels(glow));
  v.push(...mallVoxels(glow));
  v.push(...parkVoxels());
  v.push(...raceVoxels(map));
  v.push(...restaurantVoxels(RESTAURANT.x, RESTAURANT.z));
  v.push(...directionSignVoxels(map));
  v.push(...skylineVoxels(map, rng));
  v.push(...cloudVoxels(map, rng));
  return { solid: voxelGeometry(v), glow: voxelGeometry(glow) };
}

/** Every house in one merged geometry; rebuilt only when a house changes level. */
export function buildHousesGeometry(houses: House[]) {
  return voxelGeometry(houses.flatMap(houseVoxels));
}

/** Ferris wheel rim + spokes, built around the origin in the XY plane (axle = Z). */
export function buildWheelGeometry(r: number) {
  const v: Voxel[] = [];
  const n = 32;
  for (const z of [-1.3, 1.3]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      v.push({ p: [Math.cos(a) * r, Math.sin(a) * r, z], s: [0.5, (2 * Math.PI * r) / n + 0.1, 0.5], c: i % 2 ? "#e63946" : "#f1faee", rz: a });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      v.push({ p: [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, z], s: [r, 0.2, 0.2], c: "#e9ecef", rz: a });
    }
  }
  v.push({ p: [0, 0, 0], s: [1.2, 1.2, 3.4], c: "#5b6670" });
  return voxelGeometry(v);
}

export function buildGondolaGeometry() {
  return voxelGeometry([
    { p: [0, -1.1, 0], s: [1.6, 1.4, 1.4], c: "#ffffff" },
    { p: [0, -0.3, 0], s: [1.8, 0.2, 1.6], c: "#e63946" },
    { p: [0, -1.1, 0.72], s: [1.2, 0.6, 0.04], c: PAL.glass },
    { p: [0, -0.1, 0], s: [0.1, 0.4, 0.1], c: "#5b6670" },
  ]);
}

/** Carousel: platform, horses, poles and roof; rotates as one mesh. */
export function buildCarouselGeometry(r: number) {
  const v: Voxel[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    v.push({ p: [0, 0.3, 0], s: [r * 2, 0.4, r * 0.83], c: "#f4a261", r: a });
    v.push({ p: [0, 4.2, 0], s: [r * 2.1, 0.5, r * 0.87], c: i % 2 ? "#e63946" : "#ffffff", r: a });
  }
  for (let i = 0; i < 4; i++) v.push({ p: [0, 4.7 + i * 0.45, 0], s: [r * 1.6 - i * 1.6, 0.45, r * 1.6 - i * 1.6], c: i % 2 ? "#e9c46a" : "#e63946", r: Math.PI / 4 });
  v.push({ p: [0, 2.2, 0], s: [0.9, 4, 0.9], c: "#e9c46a" });
  const colors = ["#f1faee", "#8e44ad", "#2a9d8f", "#f4a261", "#3a86c8", "#e9c46a"];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.sin(a) * (r - 1.2);
    const z = Math.cos(a) * (r - 1.2);
    const yaw = a + Math.PI / 2;
    v.push({ p: [x, 2.3, z], s: [0.1, 3.8, 0.1], c: "#e9c46a" });
    v.push({ p: [x, 1.4, z], s: [0.5, 0.6, 1.4], c: colors[i]!, r: yaw });
    v.push({ p: [x + Math.sin(yaw) * 0.7, 1.9, z + Math.cos(yaw) * 0.7], s: [0.4, 0.6, 0.4], c: colors[i]!, r: yaw });
  }
  return voxelGeometry(v);
}
