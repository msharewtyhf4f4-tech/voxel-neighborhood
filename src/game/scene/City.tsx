import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Runtime } from "../runtime";
import { DISTRICTS, MALL, PARK, RACE, STADIUM, arrowFor, buildCityMap } from "../sim/map";
import { GATE_Z, buildHouses, signPosition, type House, type Layout } from "../sim/world";
import {
  DIR_SIGN,
  SIGN_Y,
  buildCarouselGeometry,
  buildCityGeometry,
  buildGondolaGeometry,
  buildHousesGeometry,
  buildWheelGeometry,
  signYaw,
} from "./cityGeometry";
import { SIGN_FONT } from "./palette";
import {
  canvasTexture,
  drawBanner,
  drawDirectionSign,
  drawGateSign,
  drawHouseSign,
  drawSpeedSign,
  makeRoadTexture,
  makeSandTexture,
} from "./textures";

const CITY_TITLE = "مدينة المشتركين";
const GONDOLAS = 12;

function Ride() {
  const wheel = useRef<THREE.Group>(null);
  const cabins = useRef<THREE.InstancedMesh>(null);
  const carousel = useRef<THREE.Mesh>(null);
  const w = PARK.wheel;
  const c = PARK.carousel;
  const wheelGeo = useMemo(() => buildWheelGeometry(w.r), [w.r]);
  const cabinGeo = useMemo(() => buildGondolaGeometry(), []);
  const carGeo = useMemo(() => buildCarouselGeometry(c.r), [c.r]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = t * 0.15;
    if (wheel.current) wheel.current.rotation.z = a;
    if (carousel.current) carousel.current.rotation.y = t * 0.6;
    const m = cabins.current;
    if (!m) return;
    for (let i = 0; i < GONDOLAS; i++) {
      const th = a + (i / GONDOLAS) * Math.PI * 2;
      dummy.position.set(w.x + Math.cos(th) * w.r, w.axleY + Math.sin(th) * w.r, w.z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <group ref={wheel} position={[w.x, w.axleY, w.z]}>
        <mesh geometry={wheelGeo} material={mat} castShadow />
      </group>
      <instancedMesh ref={cabins} args={[cabinGeo, mat, GONDOLAS]} frustumCulled={false} />
      <mesh ref={carousel} geometry={carGeo} material={mat} position={[c.x, 0, c.z]} castShadow />
    </>
  );
}

function Label({ text, pos, yaw, size, bg }: { text: string; pos: [number, number, number]; yaw: number; size: [number, number]; bg: string }) {
  const t = useMemo(() => canvasTexture(1024, Math.round((1024 * size[1]) / size[0]), (c) => drawBanner(c, text, bg)), [text, size, bg]);
  useEffect(() => {
    let alive = true;
    void document.fonts.load(`800 64px ${SIGN_FONT}`, text).then(() => {
      if (!alive) return;
      drawBanner(t.canvas, text, bg);
      t.texture.needsUpdate = true;
    });
    return () => {
      alive = false;
      t.texture.dispose();
    };
  }, [t, text, bg]);
  return (
    <mesh position={pos} rotation-y={yaw}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={t.texture} roughness={0.7} />
    </mesh>
  );
}

export function City({ rt, layout, houses, myId }: { rt: Runtime; layout: Layout; houses: House[]; myId: string }) {
  const map = useMemo(() => buildCityMap(layout), [layout]);
  const lots = useMemo(() => buildHouses([], layout), [layout]);
  const geo = useMemo(() => buildCityGeometry(map, lots), [map, lots]);
  const houseKey = houses.map((h) => h.floors).join("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const houseGeo = useMemo(() => buildHousesGeometry(houses.length ? houses : lots), [houseKey, lots]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  const sand = useMemo(() => makeSandTexture(), []);
  const roads = useMemo(
    () =>
      map.roads
        .filter((r) => r.kind === "street" || r.kind === "avenue" || r.kind === "race")
        .map((r) => {
          const len = r.axis === "z" ? r.z1 - r.z0 : r.x1 - r.x0;
          const wid = r.axis === "z" ? r.x1 - r.x0 : r.z1 - r.z0;
          return { r, len, wid, tex: makeRoadTexture(len), y: r.kind === "street" ? 0.004 : 0.008 };
        }),
    [map],
  );
  const signs = useMemo(() => lots.map((h) => ({ h, ...canvasTexture(512, 288, (c) => drawHouseSign(c, h, false)) })), [lots]);
  const dirSigns = useMemo(
    () =>
      map.signs.flatMap((sg) =>
        [sg.yaw, sg.yaw + Math.PI].map((face) => {
          const rows = DISTRICTS.filter((d) => d.id !== "homes" || Math.hypot(d.x - sg.x, d.z - sg.z) > 60)
            .slice(0, 6)
            .map((d) => ({ name: d.name, arrow: arrowFor(face, sg.x, sg.z, d.x, d.z) }));
          return { sg, face, ...canvasTexture(512, 384, (c) => drawDirectionSign(c, rows)), rows };
        }),
      ),
    [map],
  );
  const speed = useMemo(() => canvasTexture(128, 128, (c) => drawSpeedSign(c, 120)), []);
  const gate = useMemo(() => canvasTexture(1024, 160, (c) => drawGateSign(c, CITY_TITLE)), []);
  const [fontsReady, setFontsReady] = useState(false);
  const drawn = useRef(new Map<number, string>());

  useEffect(() => () => {
    geo.solid.dispose();
    geo.glow.dispose();
  }, [geo]);
  useEffect(() => () => houseGeo.dispose(), [houseGeo]);
  useEffect(() => () => roads.forEach((r) => r.tex.dispose()), [roads]);
  useEffect(
    () => () => {
      signs.forEach((s) => s.texture.dispose());
      drawn.current.clear();
    },
    [signs],
  );
  useEffect(() => () => dirSigns.forEach((s) => s.texture.dispose()), [dirSigns]);

  useEffect(() => {
    let alive = true;
    document.fonts
      .load(`800 64px ${SIGN_FONT}`, CITY_TITLE)
      .then(() => {
        if (!alive) return;
        drawGateSign(gate.canvas, CITY_TITLE);
        gate.texture.needsUpdate = true;
        dirSigns.forEach((s) => {
          drawDirectionSign(s.canvas, s.rows);
          s.texture.needsUpdate = true;
        });
        drawn.current.clear();
        setFontsReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [gate, dirSigns]);

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

  const b = map.bounds;
  const mallZ = (MALL.building.z0 + MALL.building.z1) / 2;
  const parkGateZ = (PARK.gate.z0 + PARK.gate.z1) / 2;
  const raceMid = (RACE.z0 + RACE.z1) / 2;
  void rt;

  return (
    <group>
      <mesh geometry={geo.solid} material={mat} castShadow receiveShadow />
      <mesh geometry={geo.glow} material={glowMat} />
      <mesh geometry={houseGeo} material={mat} castShadow receiveShadow />
      <Ride />
      {roads.map(({ r, len, wid, tex, y }, i) => (
        <mesh
          key={i}
          position={[(r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2]}
          rotation={r.axis === "z" ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, Math.PI / 2]}
          receiveShadow
        >
          <planeGeometry args={[wid, len]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[(b.x0 + b.x1) / 2, -0.02, (b.z0 + b.z1) / 2]} receiveShadow>
        <planeGeometry args={[b.x1 - b.x0 + 120, b.z1 - b.z0 + 120]} />
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
      {dirSigns.map(({ sg, face, texture }, i) => (
        <mesh
          key={i}
          position={[sg.x + Math.sin(face) * 0.07, DIR_SIGN.y, sg.z + Math.cos(face) * 0.07]}
          rotation-y={face}
        >
          <planeGeometry args={[DIR_SIGN.w, DIR_SIGN.h]} />
          <meshStandardMaterial map={texture} roughness={0.7} />
        </mesh>
      ))}
      {map.speedSigns.map((sg, i) => (
        <mesh key={i} position={[sg.x - 0.1, 3, sg.z]} rotation-y={-Math.PI / 2}>
          <circleGeometry args={[0.7, 20]} />
          <meshStandardMaterial map={speed.texture} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 8.8, GATE_Z + 0.56]}>
        <planeGeometry args={[12, 1.875]} />
        <meshStandardMaterial map={gate.texture} roughness={0.7} />
      </mesh>
      <Label text="ملعب المدينة" pos={[(STADIUM.gate.x0 + STADIUM.gate.x1) / 2, 8.4, STADIUM.outer.z0 - 0.1]} yaw={Math.PI} size={[11, 1.6]} bg="#2a6f97" />
      <Label text="مول المدينة" pos={[MALL.building.x0 - 0.4, 11.4, mallZ]} yaw={-Math.PI / 2} size={[18, 3.2]} bg="#1f3b47" />
      <Label text="مدينة الألعاب" pos={[PARK.area.x0 - 0.55, 7.4, parkGateZ]} yaw={-Math.PI / 2} size={[9.6, 1.5]} bg="#8e44ad" />
      <Label text="البداية" pos={[RACE.startX - 0.4, 7.2, raceMid]} yaw={-Math.PI / 2} size={[14, 1.5]} bg="#1d6b47" />
      <Label text="النهاية" pos={[RACE.finishX - 0.4, 7.2, raceMid]} yaw={-Math.PI / 2} size={[14, 1.5]} bg="#d62828" />
    </group>
  );
}
