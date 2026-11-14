import {
  GATE_Z,
  HOUSE_CENTER_X,
  ROAD_HALF,
  ROAD_START_Z,
  SIDEWALK_H,
  SIDEWALK_OUTER,
  buildPalms,
  mulberry32,
  signPosition,
  type House,
  type Layout,
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

function mosqueVoxels(z: number): Voxel[] {
  const v: Voxel[] = [];
  v.push({ p: [0, 3, z], s:, c: PAL.mosque });
  v.push({ p: [0, 6.15, z], s: [16.4, 0.3, 12.4], c: PAL.mosqueTrim });
  for (let i = 0; i < 6; i++) {
    const w = 8 - i * 1.25;
    v.push({ p: [0, 6.7 + i * 0.75, z], s: [w, 0.75, w], c: i % 2 ? PAL.dome : shade(PAL.dome, 0.04) });
  }
  v.push({ p: [0, 11.6, z], s: [0.2, 1.2, 0.2], c: PAL.dome });
  v.push({ p: [0, 2, z + 6.05], s: [3, 4, 0.2], c: "#1f5f63" });
  v.push({ p: [0, 4.3, z + 6.1], s: [3.8, 0.6, 0.3], c: PAL.mosqueTrim });
  for (const wx of [-5, -2.8, 2.8, 5]) v.push({ p: [wx, 3.2, z + 6.04], s: [1, 2, 0.12], c: PAL.glass });
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

/** مول تجاري كبير */
function mallVoxels(x: number, z: number): Voxel[] {
  const v: Voxel[] = [];
  v.push({ p: [x, 4.5, z], s:, c: "#f7f3eb" });
  v.push({ p: [x, 9.3, z], s: [18.6, 0.6, 26.6], c: "#2b5b84" });
  // واجهات زجاجية
  v.push({ p: [x - 9.05, 4.0, z], s: [0.2, 6.5, 20], c: "#78c2e8" });
  // بوابة المول
  v.push({ p: [x - 9.3, 2.2, z], s: [0.8, 4.4, 5], c: "#e69f24" });
  v.push({ p: [x - 9.4, 6.5, z], s: [0.6, 1.6, 12], c: "#ff4d6d" });
  return v;
}

/** ملعب كرة القدم */
function stadiumVoxels(x: number, z: number): Voxel[] {
  const v: Voxel[] = [];
  // أرضية العشب
  v.push({ p: [x, 0.08, z], s: [22, 0.16, 34], c: "#2d9e48" });
  // خطوط الملعب البيضاء
  v.push({ p: [x, 0.17, z], s: [20, 0.04, 0.3], c: "#ffffff" });
  v.push({ p: [x, 0.17, z - 16], s: [20, 0.04, 0.3], c: "#ffffff" });
  v.push({ p: [x, 0.17, z + 16], s: [20, 0.04, 0.3], c: "#ffffff" });
  v.push({ p: [x - 10, 0.17, z], s: [0.3, 0.04, 32], c: "#ffffff" });
  v.push({ p: [x + 10, 0.17, z], s: [0.3, 0.04, 32], c: "#ffffff" });
  // المرمى الشمالي والجنوبي
  for (const gz of [z - 15.5, z + 15.5]) {
    v.push({ p: [x - 2.5, 1.3, gz], s: [0.22, 2.6, 0.22], c: "#ffffff" });
    v.push({ p: [x + 2.5, 1.3, gz], s: [0.22, 2.6, 0.22], c: "#ffffff" });
    v.push({ p: [x, 2.6, gz], s: [5.2, 0.22, 0.22], c: "#ffffff" });
  }
  // مدرجات جانبية
  v.push({ p: [x - 12.5, 1.5, z], s: [2.5, 3, 30], c: "#d97724" });
  return v;
}

/** مطعم وكافيه للأكل */
function restaurantVoxels(x: number, z: number): Voxel[] {
  const v: Voxel[] = [];
  v.push({ p: [x, 2.4, z], s: [10, 4.8, 12], c: "#fff3d6" });
  v.push({ p: [x, 5.0, z], s: [10.6, 0.5, 12.6], c: "#d62828" });
  // مظلة مخططة
  v.push({ p: [x - 5.6, 2.6, z], s: [1.6, 0.3, 10], c: "#fcbf49" });
  // طاولات طعام خارجية
  for (const tz of [z - 3, z, z + 3]) {
    v.push({ p: [x - 6.8, 0.45, tz], s: [1.2, 0.9, 1.2], c: "#8d5524" });
    v.push({ p: [x - 6.8, 0.92, tz], s: [0.5, 0.12, 0.5], c: "#f77f00" }); // طبق برجر
  }
  return v;
}

/** مدينة ملاهي وصالة ألعاب */
function amusementVoxels(x: number, z: number): Voxel[] {
  const v: Voxel[] = [];
  // صالة الألعاب (Arcade)
