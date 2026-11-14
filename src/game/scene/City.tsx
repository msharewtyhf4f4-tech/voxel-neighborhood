import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GATE_Z, ROAD_HALF, ROAD_START_Z, buildHouses, signPosition, type House, type Layout } from "../sim/world";
import { buildCityGeometry, buildHouseGeometry, SIGN_Y, signYaw } from "./cityGeometry";
import { SIGN_FONT } from "./palette";
import { canvasTexture, drawGateSign, drawHouseSign, makeRoadTexture, makeSandTexture } from "./textures";

const CITY_TITLE = "مدينة المشتركين";

function DynamicHouse({ house, material }: { house: House; material: THREE.Material }) {
  const geo = useMemo(() => buildHouseGeometry(house), [house.floors, house.style, house.x, house.z, house.side]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow />;
}

export function City({ layout, houses, myId }: { layout: Layout; houses: House[]; myId: string }) {
  const rows = layout.rows;
  const roadLen = ROAD_START_Z - layout.roadEndZ;
  const lots = useMemo(() => buildHouses([], rows), [rows]);
  const geo = useMemo(() => buildCityGeometry(layout, lots), [layout, lots]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  const road = useMemo(() => makeRoadTexture(roadLen), [roadLen]);
  const sand = useMemo(() => makeSandTexture(), []);
  const signs = useMemo(
    () => lots.map((h) => ({ h, ...canvasTexture(512, 288, (c) => drawHouseSign(c, h, false)) })),
    [lots],
  );
  const gate = useMemo(() => canvasTexture(1024, 160, (c) => drawGateSign(c, CITY_TITLE)), []);
  const [fontsReady, setFontsReady] = useState(false);
  const drawn = useRef(new Map<number, string>());

  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(
    () => () => {
      signs.forEach((s) => s.texture.dispose());
      drawn.current.clear();
    },
    [signs],
  );

  useEffect(() => {
    let alive = true;
    document.fonts
      .load(`800 64px ${SIGN_FONT}`, CITY_TITLE)
      .then(() => {
        if (!alive) return;
        drawGateSign(gate.canvas, CITY_TITLE);
        gate.texture.needsUpdate = true;
        drawn.current.clear();
        setFontsReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [gate]);

  useEffect(() => {
    signs.forEach((s, i) => {
      const h = houses[i] ?? s.h;
      const mine = h.owner === myId;
      const key = `${h.owner}|${h.name}|${h.coins}|${mine}|${fontsReady}`;
      if (drawn.current.get(h.number) === key) return;
      drawHouseSign(s.canvas, h, mine);
      s.texture.needsUpdate = true;
      drawn.current.set(h.number, key);
    });
  }, [signs, houses, myId, fontsReady]);

  const activeHouses = houses.length > 0 ? houses : lots;

  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {activeHouses.map((h) => (
        <DynamicHouse key={h.number} house={h} material={mat} />
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, (ROAD_START_Z + layout.roadEndZ) / 2]} receiveShadow>
        <planeGeometry args={[ROAD_HALF * 2, roadLen]} />
        <meshStandardMaterial map={road} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, (ROAD_START_Z + layout.roadEndZ) / 2]} receiveShadow>
        <planeGeometry args={[220, roadLen + 140]} />
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
