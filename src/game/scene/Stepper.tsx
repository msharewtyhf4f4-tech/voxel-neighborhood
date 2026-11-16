import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Runtime } from "../runtime";
import { raceCross } from "../sim/map";
import {
  angleDiff,
  applyVertical,
  cameraRelative,
  canEnterCar,
  collectCoins,
  mergeInput,
  stepCar,
  stepWalker,
} from "../sim/motion";
import type { Coin } from "../sim/world";
import { useGame } from "../store";
import { queueCoinPicks } from "../net/coinQueue";

const picked: Coin[] = [];

const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"]);
const CAM_DAMP = 4;
/** how fast the camera swings behind the walker / car (rad/s, scaled by speed) */
const CAM_FOLLOW_WALK = 1.2;
const CAM_FOLLOW_CAR = 2.2;
/** after a manual camera drag, wait this long before auto-follow resumes */
const CAM_DRAG_HOLD_S = 2.5;

/** The single per-frame stepper: input → sim → coins → race → camera → light. */
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
    const stick = mergeInput(rt.input, rt.keys);
    const mv = cameraRelative(stick.x, stick.y, rt.camYaw);
    const jump = rt.input.jumpQueued || rt.keys.has("Space");
    rt.input.jumpQueued = false;
    const driving = ui.carState === "driving";

    if (driving) {
      const prevX = rt.car.x;
      stepCar(rt.car, { ...mv, jump }, dt, rt.map);
      rt.player.x = rt.car.x;
      rt.player.z = rt.car.z;
      const cross = raceCross(prevX, rt.car.x, rt.car.z);
      if (cross === "start") {
        rt.raceStartAt = rt.time;
        ui.setRaceMsg("انطلق! 🏁");
      } else if (cross === "finish" && rt.raceStartAt !== null) {
        const secs = rt.time - rt.raceStartAt;
        rt.raceStartAt = null;
        ui.setRaceMsg(`وصلت خط النهاية في ${secs.toFixed(1)} ثانية`);
      }
    } else {
      stepWalker(rt.player, { ...mv, jump }, dt, rt.map);
      if (ui.carState === "parked") applyVertical(rt.car, false, 0, dt, 0);
    }

    const target = driving ? rt.car : rt.player;
    picked.length = 0;
    const gained = collectCoins(rt.coins, target.x, target.z, rt.time, picked);
    if (gained) {
      ui.addPoints(gained);
      queueCoinPicks(picked.map((c) => ({ x: c.x, z: c.z })));
    }

    const near = ui.carState === "parked" && canEnterCar(rt.player, rt.car);
    if (near !== ui.nearCar) ui.setNearCar(near);

    // camera slowly swings behind the direction of travel (unless dragged by hand)
    if (rt.time - rt.camDragAt > CAM_DRAG_HOLD_S) {
      const moving = Math.min(1, target.speed / (driving ? 6 : 4));
      const rate = (driving ? CAM_FOLLOW_CAR : CAM_FOLLOW_WALK) * moving;
      if (rate > 0.01) rt.camYaw += angleDiff(target.yaw, rt.camYaw) * (1 - Math.exp(-rate * dt));
    }
    const back = driving ? (portrait ? 16 : 13) : portrait ? 12 : 10;
    const up = driving ? (portrait ? 10 : 8) : portrait ? 8.5 : 6.5;
    const fx = Math.sin(rt.camYaw);
    const fz = Math.cos(rt.camYaw);
    desired.set(target.x - fx * back, up + target.y * 0.3, target.z - fz * back);
    const ahead = driving ? 7 : 5;
    desiredLook.set(target.x + fx * ahead, 1.2 + target.y * 0.5, target.z + fz * ahead);
    const k = frames.current === 0 ? 1 : 1 - Math.exp(-CAM_DAMP * dt);
    camera.position.lerp(desired, k);
    look.lerp(desiredLook, k);
    camera.lookAt(look);

    const l = light.current;
    if (l) {
      l.position.set(target.x + 10, 22, target.z + 8);
      l.target.position.set(target.x, 0, target.z);
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
      shadow-camera-left={-24}
      shadow-camera-right={24}
      shadow-camera-top={24}
      shadow-camera-bottom={-24}
      shadow-camera-near={1}
      shadow-camera-far={70}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  );
}
