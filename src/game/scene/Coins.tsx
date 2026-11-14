import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Runtime } from "../runtime";
import { coinActive } from "../sim/world";
import { voxelGeometry } from "./voxel";

export function Coins({ rt }: { rt: Runtime }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () =>
      voxelGeometry([
        { p: [0, 0, 0], s: [0.8, 0.8, 0.16], c: "#f2c230" },
        { p: [0, 0, 0], s: [0.42, 0.42, 0.24], c: "#d99a12" },
      ]),
    [],
  );
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.5,
        roughness: 0.35,
        emissive: new THREE.Color("#6a4a00"),
        emissiveIntensity: 0.5,
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const t = rt.time;
    rt.coins.forEach((c, i) => {
      const on = coinActive(c, t);
      dummy.position.set(c.x, 1 + Math.sin(t * 2 + i) * 0.15, c.z);
      dummy.rotation.set(0, t * 2.5 + i, 0);
      dummy.scale.setScalar(on ? 1 : 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, rt.coins.length]} castShadow frustumCulled={false} />;
}
