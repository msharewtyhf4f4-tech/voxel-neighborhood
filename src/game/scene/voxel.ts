import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Vec3 = [number, number, number];
export interface Voxel {
  p: Vec3;
  s: Vec3;
  c: string;
  r?: number;
  /** roll about Z, applied before the yaw */
  rz?: number;
}

/** Transform local voxels (front = +Z) to world space at origin, rotated by yaw. */
export function place(local: Voxel[], origin: Vec3, yaw: number): Voxel[] {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return local.map((v) => ({
    p: [
      origin[0] + cos * v.p[0] + sin * v.p[2],
      origin[1] + v.p[1],
      origin[2] - sin * v.p[0] + cos * v.p[2],
    ],
    s: v.s,
    c: v.c,
    r: (v.r ?? 0) + yaw,
  }));
}

const colorCache = new Map<string, THREE.Color>();

/** Merge many colored boxes into one vertex-colored geometry (one draw call). */
export function voxelGeometry(voxels: Voxel[]): THREE.BufferGeometry {
  const parts = voxels.map((v) => {
    const g = new THREE.BoxGeometry(v.s[0], v.s[1], v.s[2]);
    if (v.rz) g.rotateZ(v.rz);
    if (v.r) g.rotateY(v.r);
    g.translate(v.p[0], v.p[1], v.p[2]);
    let col = colorCache.get(v.c);
    if (!col) {
      col = new THREE.Color(v.c);
      colorCache.set(v.c, col);
    }
    const n = g.getAttribute("position").count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return g;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error("voxel merge failed");
  merged.computeBoundingSphere();
  return merged;
}

export function shade(hex: string, l: number): string {
  return "#" + new THREE.Color(hex).offsetHSL(0, 0, l).getHexString();
}
