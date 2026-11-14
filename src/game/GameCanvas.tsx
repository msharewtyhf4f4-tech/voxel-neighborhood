import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createRuntime } from "./runtime";
import { Bubble } from "./scene/Bubble";
import { Car } from "./scene/Car";
import { City } from "./scene/City";
import { Coins } from "./scene/Coins";
import { PAL } from "./scene/palette";
import { Player } from "./scene/Player";
import { Stepper } from "./scene/Stepper";
import { cityPopulation } from "./sim/world";
import { useGame } from "./store";
import { Hud } from "./ui/Hud";

export default function GameCanvas() {
  const [rt] = useState(createRuntime);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useGame.getState().setPopulation(cityPopulation(rt.houses));
  }, [rt]);

  return (
    <div ref={wrap} className="game-root">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 60, position: [0, 8, 16], near: 0.1, far: 260 }}
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
        <City houses={rt.houses} />
        <Coins rt={rt} />
        <Player rt={rt} />
        <Car rt={rt} />
        <Bubble rt={rt} />
        <Stepper rt={rt} onReady={() => wrap.current?.setAttribute("data-scene-ready", "true")} />
      </Canvas>
      <Hud rt={rt} />
    </div>
  );
}
