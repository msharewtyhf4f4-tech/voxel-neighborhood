import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import type { Runtime } from "../runtime";
import { useGame } from "../store";

/** Chat bubble that floats above the player (or the car while driving). */
export function Bubble({ rt }: { rt: Runtime }) {
  const g = useRef<THREE.Group>(null);
  const bubble = useGame((s) => (s.me ? s.bubbles[s.me.id] : undefined));
  useFrame(() => {
    if (!g.current) return;
    const driving = useGame.getState().carState === "driving";
    const b = driving ? rt.car : rt.player;
    g.current.position.set(b.x, b.y + (driving ? 2.7 : 2.25), b.z);
  });
  return (
    <group ref={g}>
      {bubble && (
        <Html center zIndexRange={[10, 0]} pointerEvents="none">
          <div key={bubble.id} className="chat-bubble" dir="rtl">
            {bubble.text}
          </div>
        </Html>
      )}
    </group>
  );
}
