import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Multiplayer } from "./net/Multiplayer";
import { useCityLive, useCoinSaver } from "./net/useCitySync";
import { applyCity, createRuntime } from "./runtime";
import { Bubble } from "./scene/Bubble";
import { Car } from "./scene/Car";
import { City } from "./scene/City";
import { Coins } from "./scene/Coins";
import { PAL } from "./scene/palette";
import { Player } from "./scene/Player";
import { Stepper } from "./scene/Stepper";
import { buildHouses, makeLayout } from "./sim/world";
import { useGame } from "./store";
import { Hud } from "./ui/Hud";

export default function GameCanvas() {
  const me = useGame((s) => s.me)!;
  const residents = useGame((s) => s.residents);
  const [rt] = useState(() => createRuntime(me.house));
  const wrap = useRef<HTMLDivElement>(null);

  const maxNumber = residents.reduce((m, r) => Math.max(m, r.number), 0);
  const layout = useMemo(() => makeLayout(maxNumber), [maxNumber]);
  const houses = useMemo(() => buildHouses(residents, layout), [residents, layout]);
  useEffect(() => applyCity(rt, layout, houses), [rt, layout, houses]);

  useCityLive(true);
  useCoinSaver(true);

  return (
    <div ref={wrap} className="game-root" dir="ltr">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 60, position: [0, 8, 16], near: 0.1, far: 300 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
      >
        <color attach="background" args={[PAL.sky]} />
        <fog attach="fog" args={[PAL.fog, 55, 170]} />
        <hemisphereLight args={["#cfeaff", "#e6cfa1", 1.1]} />
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 6, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={1} color="#bfe3ef" position={[-6, 2, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
          <Lightformer intensity={0.8} color="#ffe2b8" position={[6, 2, 1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
        </Environment>
        <City rt={rt} layout={layout} houses={houses} myId={me.id} />
        <Coins rt={rt} />
        <Player rt={rt} />
        <Car rt={rt} />
        <Bubble rt={rt} />
        <Multiplayer rt={rt} meId={me.id} name={me.name} />
        <Stepper rt={rt} onReady={() => wrap.current?.setAttribute("data-scene-ready", "true")} />
      </Canvas>
      <Hud rt={rt} />
    </div>
  );
}
