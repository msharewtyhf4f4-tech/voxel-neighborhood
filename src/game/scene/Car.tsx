import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Runtime } from "../runtime";
import { useGame } from "../store";
import { voxelGeometry, type Voxel } from "./voxel";

const WHITE = "#f4f4f0";
const DARK = "#1c1c1c";

function carVoxels(): Voxel[] {
  const v: Voxel[] = [
    { p: [0, 0.75, 0], s: [2.0, 0.7, 4.4], c: WHITE },
    { p: [0, 0.45, 0], s: [1.9, 0.2, 4.2], c: "#9aa0a6" },
    { p: [0, 1.4, -0.35], s: [1.84, 0.64, 2.5], c: "#2f4858" },
    { p: [0, 1.76, -0.35], s: [1.94, 0.1, 2.62], c: WHITE },
    { p: [-0.93, 1.4, 0.88], s: [0.08, 0.64, 0.08], c: WHITE },
    { p: [0.93, 1.4, 0.88], s: [0.08, 0.64, 0.08], c: WHITE },
    { p: [-0.93, 1.4, -0.35], s: [0.06, 0.64, 0.1], c: WHITE },
    { p: [0.93, 1.4, -0.35], s: [0.06, 0.64, 0.1], c: WHITE },
    { p: [-0.7, 1.86, -0.35], s: [0.08, 0.08, 2.4], c: "#3a3d40" },
    { p: [0.7, 1.86, -0.35], s: [0.08, 0.08, 2.4], c: "#3a3d40" },
    { p: [0, 0.78, 2.21], s: [1.1, 0.34, 0.04], c: "#2b2b2b" },
    { p: [-0.72, 0.85, 2.21], s: [0.4, 0.2, 0.05], c: "#fff6c8" },
    { p: [0.72, 0.85, 2.21], s: [0.4, 0.2, 0.05], c: "#fff6c8" },
    { p: [-0.8, 0.88, -2.21], s: [0.3, 0.3, 0.05], c: "#d62828" },
    { p: [0.8, 0.88, -2.21], s: [0.3, 0.3, 0.05], c: "#d62828" },
    { p: [0, 0.42, 2.26], s: [2.04, 0.2, 0.16], c: "#9aa0a6" },
    { p: [0, 0.42, -2.26], s: [2.04, 0.2, 0.16], c: "#9aa0a6" },
    { p: [0, 1.0, -2.34], s: [0.72, 0.72, 0.22], c: DARK },
    { p: [0, 0.82, 0.5], s: [2.04, 0.08, 1.4], c: "#2a9d8f" },
  ];
  for (const x of [-1.0, 1.0])
    for (const z of [-1.35, 1.35]) {
      v.push({ p: [x, 0.38, z], s: [0.36, 0.76, 0.76], c: DARK });
      v.push({ p: [x * 1.19, 0.38, z], s: [0.02, 0.36, 0.36], c: "#c0c4c8" });
    }
  return v;
}

export function Car({ rt }: { rt: Runtime }) {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => voxelGeometry(carVoxels()), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1 }), []);

  useFrame(() => {
    const grp = g.current;
    if (!grp) return;
    const state = useGame.getState().carState;
    grp.visible = state !== "none";
    if (!grp.visible) return;
    const c = rt.car;
    const t = Math.min(1, (rt.time - rt.carSummonedAt) * 3);
    const pop = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * 9) : 1;
    grp.position.set(c.x, c.y + (1 - t) * 3, c.z);
    grp.rotation.y = c.yaw;
    grp.scale.setScalar(Math.max(0.01, pop));
  });

  return (
    <group ref={g} visible={false}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
    </group>
  );
}
