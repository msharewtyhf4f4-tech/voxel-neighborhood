import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Runtime } from "../runtime";
import { canEnterCar, mergeInput, stepCar, stepWalker, applyVertical, collectCoins } from "../sim/motion";
import { useGame } from "../store";

const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"]);
const CAM_DAMP = 4;

/** The single per-frame stepper: input → sim → coins → camera → light. */
export function Stepper({ rt, onReady }: { rt: Runtime; onReady: () => void }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const portrait = size.width < size.height;
  const look = useMemo(() => new THREE.Vector3(0, 1, -2), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);
  const frames = useRef(0);

  useEffect(() => {
    camera.fov = portrait ? 70 : 52;
    camera.updateProjectionMatrix();
  }, [portrait, camera]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      rt.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => rt.keys.delete(e.code);
    const clear = () => rt.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [rt]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    rt.time += dt;
    const ui = useGame.getState();
    const mv = mergeInput(rt.input, rt.keys);
    const jump = rt.input.jumpQueued || rt.keys.has("Space");
    rt.input.jumpQueued = false;
    const driving = ui.carState === "driving";

    if (driving) {
      stepCar(rt.car, { ...mv, jump }, dt, rt.layout.walkEndZ);
      rt.player.x = rt.car.x;
      rt.player.z = rt.car.z;
    } else {
      stepWalker(rt.player, { ...mv, jump }, dt, rt.obstacles, rt.layout.walkEndZ);
      if (ui.carState === "parked") applyVertical(rt.car, false, 0, dt);
    }

    const target = driving ? rt.car : rt.player;
    const gained = collectCoins(rt.coins, target.x, target.z, rt.time);
    if (gained) ui.addPoints(gained);

    const near = ui.carState === "parked" && canEnterCar(rt.player, rt.car);
    if (near !== ui.nearCar) ui.setNearCar(near);

    // camera: behind and above, looking down the street
    const back = driving ? (portrait ? 16 : 13) : portrait ? 12 : 10;
    const up = driving ? (portrait ? 10 : 8) : portrait ? 8.5 : 6.5;
    desired.set(target.x * 0.55, up + target.y * 0.3, target.z + back);
    desiredLook.set(target.x * 0.8, 1.2 + target.y * 0.5, target.z - (driving ? 7 : 5));
    const k = frames.current === 0 ? 1 : 1 - Math.exp(-CAM_DAMP * dt);
    camera.position.lerp(desired, k);
    look.lerp(desiredLook, k);
    camera.lookAt(look);

    const l = light.current;
    if (l) {
      l.position.set(target.x + 10, 22, target.z + 8);
      l.target.position.set(target.x, 0, target.z - 4);
      l.target.updateMatrixWorld();
    }

    frames.current++;
    if (frames.current === 3) onReady();
  }, -1);

  return (
    <directionalLight
      ref={light}
      castShadow
      position={[10, 22, 8]}
      intensity={2.4}
      color="#fff0d4"
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-20}
      shadow-camera-right={20}
      shadow-camera-top={24}
      shadow-camera-bottom={-24}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  );
}
