import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GATE_Z, ROAD_END_Z, ROAD_HALF, ROAD_START_Z, signPosition, type House } from "../sim/world";
import { buildCityGeometry, SIGN_Y, signYaw } from "./cityGeometry";
import { SIGN_FONT } from "./palette";
import { canvasTexture, drawGateSign, drawHouseSign, makeRoadTexture, makeSandTexture } from "./textures";

const ROAD_LEN = ROAD_START_Z - ROAD_END_Z;
const CITY_TITLE = "مدينة المشتركين";

export function City({ houses }: { houses: House[] }) {
  const geo = useMemo(() => buildCityGeometry(houses), [houses]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  const road = useMemo(() => makeRoadTexture(ROAD_LEN), []);
  const sand = useMemo(() => makeSandTexture(), []);
  const signs = useMemo(
    () => houses.map((h) => ({ h, ...canvasTexture(512, 288, (c) => drawHouseSign(c, h)) })),
    [houses],
  );
  const gate = useMemo(() => canvasTexture(1024, 160, (c) => drawGateSign(c, CITY_TITLE)), []);

  // Redraw once the Arabic web font is ready so signs use it.
  useEffect(() => {
    let alive = true;
    document.fonts
      .load(`800 64px ${SIGN_FONT}`, "مدينة المشتركين")
      .then(() => {
        if (!alive) return;
        signs.forEach((s) => {
          drawHouseSign(s.canvas, s.h);
          s.texture.needsUpdate = true;
        });
        drawGateSign(gate.canvas, CITY_TITLE);
        gate.texture.needsUpdate = true;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [signs, gate]);

  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, (ROAD_START_Z + ROAD_END_Z) / 2]} receiveShadow>
        <planeGeometry args={[ROAD_HALF * 2, ROAD_LEN]} />
        <meshStandardMaterial map={road} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -70]} receiveShadow>
        <planeGeometry args={[160, 280]} />
        <meshStandardMaterial map={sand} roughness={1} />
      </mesh>
      {signs.map(({ h, texture }) => {
        const s = signPosition(h);
        return (
          <mesh key={h.number} position={[s.x, SIGN_Y, s.z]} rotation-y={signYaw(h)}>
            <planeGeometry args={[2.6, 1.46]} />
            <meshStandardMaterial map={texture} roughness={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0, 8.8, GATE_Z + 0.56]}>
        <planeGeometry args={[12, 1.875]} />
        <meshStandardMaterial map={gate.texture} roughness={0.7} />
      </mesh>
    </group>
  );
}
