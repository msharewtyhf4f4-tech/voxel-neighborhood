import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Runtime } from "../runtime";
import { WALK } from "../sim/motion";
import { useGame } from "../store";
import { makeGhutraTexture } from "./textures";

type V3 = [number, number, number];

function B({ p, s, m }: { p: V3; s: V3; m: THREE.Material }) {
  return (
    <mesh position={p} material={m} castShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Voxel Gulf man: white thobe, red-checked ghutra and black agal. */
export function Player({ rt }: { rt: Runtime }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Mesh>(null);
  const footR = useRef<THREE.Mesh>(null);

  const m = useMemo(
    () => ({
      thobe: new THREE.MeshStandardMaterial({ color: "#f7f6f0", roughness: 0.7 }),
      seam: new THREE.MeshStandardMaterial({ color: "#dedcd2", roughness: 0.7 }),
      skin: new THREE.MeshStandardMaterial({ color: "#c68a5e", roughness: 0.8 }),
      beard: new THREE.MeshStandardMaterial({ color: "#2b1d14", roughness: 0.9 }),
      eye: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5 }),
      ghutra: new THREE.MeshStandardMaterial({ map: makeGhutraTexture(), roughness: 0.8 }),
      agal: new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.5 }),
      sandal: new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.8 }),
    }),
    [],
  );

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const p = rt.player;
    const driving = useGame.getState().carState === "driving";
    g.visible = !driving;
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;
    const amt = Math.min(1, p.speed / WALK.SPEED);
    rt.walkPhase += Math.min(delta, 0.05) * (4 + 7 * amt) * amt;
    const s = Math.sin(rt.walkPhase);
    const air = !p.grounded;
    if (body.current) body.current.position.y = Math.abs(s) * 0.05 * amt;
    if (armL.current) armL.current.rotation.x = air ? -2.6 : s * 0.7 * amt;
    if (armR.current) armR.current.rotation.x = air ? -2.6 : -s * 0.7 * amt;
    if (footL.current) footL.current.position.z = 0.04 + s * 0.2 * amt;
    if (footR.current) footR.current.position.z = 0.04 - s * 0.2 * amt;
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <B p={[0, 0.7, 0]} s={[0.62, 1.0, 0.4]} m={m.thobe} />
        <B p={[0, 0.22, 0]} s={[0.66, 0.22, 0.44]} m={m.thobe} />
        <B p={[0, 0.98, 0.205]} s={[0.035, 0.32, 0.01]} m={m.seam} />
        <B p={[0, 1.18, 0]} s={[0.3, 0.06, 0.3]} m={m.thobe} />
        <group ref={armL} position={[-0.41, 1.14, 0]}>
          <B p={[0, -0.28, 0]} s={[0.2, 0.58, 0.22]} m={m.thobe} />
          <B p={[0, -0.62, 0]} s={[0.16, 0.14, 0.16]} m={m.skin} />
        </group>
        <group ref={armR} position={[0.41, 1.14, 0]}>
          <B p={[0, -0.28, 0]} s={[0.2, 0.58, 0.22]} m={m.thobe} />
          <B p={[0, -0.62, 0]} s={[0.16, 0.14, 0.16]} m={m.skin} />
        </group>
        <B p={[0, 1.43, 0]} s={[0.44, 0.44, 0.42]} m={m.skin} />
        <B p={[-0.1, 1.47, 0.212]} s={[0.07, 0.07, 0.02]} m={m.eye} />
        <B p={[0.1, 1.47, 0.212]} s={[0.07, 0.07, 0.02]} m={m.eye} />
        <B p={[0, 1.27, 0.2]} s={[0.38, 0.14, 0.06]} m={m.beard} />
        <B p={[0, 1.35, 0.218]} s={[0.22, 0.045, 0.02]} m={m.beard} />
        {/* ghutra */}
        <B p={[0, 1.69, -0.01]} s={[0.54, 0.14, 0.5]} m={m.ghutra} />
        <B p={[-0.255, 1.42, -0.04]} s={[0.06, 0.46, 0.46]} m={m.ghutra} />
        <B p={[0.255, 1.42, -0.04]} s={[0.06, 0.46, 0.46]} m={m.ghutra} />
        <B p={[0, 1.22, -0.24]} s={[0.56, 0.78, 0.08]} m={m.ghutra} />
        <B p={[0, 1.62, 0.225]} s={[0.52, 0.06, 0.05]} m={m.ghutra} />
        {/* agal */}
        <B p={[0, 1.78, 0.2]} s={[0.46, 0.07, 0.07]} m={m.agal} />
        <B p={[0, 1.78, -0.21]} s={[0.46, 0.07, 0.07]} m={m.agal} />
        <B p={[-0.2, 1.78, 0]} s={[0.07, 0.07, 0.46]} m={m.agal} />
        <B p={[0.2, 1.78, 0]} s={[0.07, 0.07, 0.46]} m={m.agal} />
      </group>
      <mesh ref={footL} position={[-0.14, 0.05, 0.04]} material={m.sandal} castShadow>
        <boxGeometry args={[0.17, 0.1, 0.3]} />
      </mesh>
      <mesh ref={footR} position={[0.14, 0.05, 0.04]} material={m.sandal} castShadow>
        <boxGeometry args={[0.17, 0.1, 0.3]} />
      </mesh>
    </group>
  );
}
