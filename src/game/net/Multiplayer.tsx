import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Runtime } from "../runtime";
import { CarModel } from "../scene/Car";
import { Avatar, type AvatarBody } from "../scene/Player";
import { useGame } from "../store";

interface NetState {
  id: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  d: 0 | 1;
}

interface Remote {
  target: NetState;
  shown: AvatarBody;
  driving: boolean;
  seen: boolean;
}

/** Sends at most N² × tick messages per second: keep it under ~250 msg/s. */
function netTick(players: number) {
  if (players <= 5) return 1 / 8;
  if (players <= 8) return 1 / 4;
  return 1 / 2;
}

const q = (v: number) => Math.round(v * 100) / 100;

/** One shared city channel: presence = who is online, broadcast = where they are. */
export function Multiplayer({ rt, meId, name }: { rt: Runtime; meId: string; name: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const names = useRef(new Map<string, string>());
  const remotes = useRef(new Map<string, Remote>());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const acc = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, d: 0, at: -10 });

  useEffect(() => {
    const channel = supabase.channel("city:main", {
      config: { broadcast: { self: false }, presence: { key: meId } },
    });
    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const s = payload as NetState;
        if (s.id === meId || !names.current.has(s.id)) return;
        const r = remotes.current.get(s.id);
        if (r) {
          r.target = s;
          r.driving = s.d === 1;
        } else {
          remotes.current.set(s.id, {
            target: s,
            shown: { x: s.x, y: s.y, z: s.z, yaw: s.ry, speed: 0, grounded: true },
            driving: s.d === 1,
            seen: false,
          });
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        names.current = new Map(Object.entries(state).map(([id, metas]) => [id, metas[0]?.name ?? "لاعب"]));
        useGame.getState().setOnline(Math.max(1, names.current.size));
        names.current.delete(meId);
        for (const id of [...remotes.current.keys()]) if (!names.current.has(id)) remotes.current.delete(id);
        setIds([...names.current.keys()]);
      })
      .subscribe((status) => {
        console.log("[net] channel:", status);
        if (status === "SUBSCRIBED") void channel.track({ name });
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // name is fixed for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const k = 1 - Math.exp(-12 * dt);
    for (const r of remotes.current.values()) {
      const s = r.shown;
      const t = r.target;
      const dx = t.x - s.x;
      const dz = t.z - s.z;
      if (!r.seen || Math.hypot(dx, dz) > 8) {
        s.x = t.x;
        s.z = t.z;
        s.y = t.y;
        s.yaw = t.ry;
        r.seen = true;
        s.speed = 0;
        continue;
      }
      const px = s.x;
      const pz = s.z;
      s.x += dx * k;
      s.z += dz * k;
      s.y += (t.y - s.y) * k;
      s.grounded = t.y < 0.2;
      s.yaw += Math.atan2(Math.sin(t.ry - s.yaw), Math.cos(t.ry - s.yaw)) * k;
      const v = Math.hypot(s.x - px, s.z - pz) / Math.max(dt, 1e-3);
      s.speed += (v - s.speed) * 0.3;
    }

    acc.current += dt;
    const tick = netTick(names.current.size + 1);
    if (acc.current < tick) return;
    acc.current = 0;
    const ch = channelRef.current;
    if (!ch || document.hidden) return;
    const driving = useGame.getState().carState === "driving";
    const b = driving ? rt.car : rt.player;
    const st: NetState = { id: meId, x: q(b.x), y: q(b.y), z: q(b.z), ry: q(b.yaw), d: driving ? 1 : 0 };
    const l = last.current;
    const moved = Math.abs(st.x - l.x) + Math.abs(st.y - l.y) + Math.abs(st.z - l.z) + Math.abs(st.ry - l.ry) > 0.01 || st.d !== l.d;
    if (!moved && rt.time - l.at < 1) return;
    last.current = { x: st.x, y: st.y, z: st.z, ry: st.ry, d: st.d, at: rt.time };
    void ch.send({ type: "broadcast", event: "state", payload: st });
  });

  return (
    <>
      {ids.map((id) => (
        <RemotePlayer key={id} id={id} name={names.current.get(id) ?? "لاعب"} remotes={remotes.current} />
      ))}
    </>
  );
}

function RemotePlayer({ id, name, remotes }: { id: string; name: string; remotes: Map<string, Remote> }) {
  const g = useRef<THREE.Group>(null);
  const car = useRef<THREE.Group>(null);
  const tag = useRef<THREE.Group>(null);
  const bubble = useGame((s) => s.bubbles[id]);
  const fallback = useRef<AvatarBody>({ x: 0, y: -50, z: 0, yaw: 0, speed: 0, grounded: true });

  useFrame(() => {
    const r = remotes.get(id);
    if (g.current) g.current.visible = !!r?.seen;
    if (!r) return;
    fallback.current = r.shown;
    if (car.current) {
      car.current.visible = r.driving;
      car.current.position.set(r.shown.x, r.shown.y, r.shown.z);
      car.current.rotation.y = r.shown.yaw;
    }
    if (tag.current) tag.current.position.set(r.shown.x, r.shown.y + (r.driving ? 2.8 : 2.3), r.shown.z);
  });

  const body = remotes.get(id)?.shown ?? fallback.current;
  return (
    <group ref={g} visible={false}>
      <Avatar body={body} hidden={() => remotes.get(id)?.driving ?? true} />
      <group ref={car} visible={false}>
        <CarModel />
      </group>
      <group ref={tag}>
        <Html center zIndexRange={[10, 0]} pointerEvents="none">
          <div className="remote-tag" dir="rtl">
            {bubble && (
              <div key={bubble.id} className="chat-bubble">
                {bubble.text}
              </div>
            )}
            <span className="name-tag">{name}</span>
          </div>
        </Html>
      </group>
    </group>
  );
}
