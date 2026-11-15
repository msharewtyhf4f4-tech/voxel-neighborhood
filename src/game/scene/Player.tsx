import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { create } from "zustand";
import type { Runtime } from "../runtime";
import { WALK } from "../sim/motion";
import { useGame } from "../store";
import { makeGhutraTexture } from "./textures";

export interface AvatarBody {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  grounded: boolean;
}

export type CharacterType = "man_ghutra" | "man_shemagh" | "boy" | "girl";

export interface OutfitItem {
  id: string;
  name: string;
  price: number;
  character: CharacterType;
  primaryColor: string;
  secondaryColor?: string;
}

export const SHOP_OUTFITS: OutfitItem[] = [
  { id: "man_white", name: "ثوب أبيض وغترة", price: 0, character: "man_ghutra", primaryColor: "#f7f6f0" },
  { id: "man_shemagh_beige", name: "ثوب بيج وشماغ أحمر", price: 150, character: "man_shemagh", primaryColor: "#e8dec8" },
  { id: "man_shemagh_navy", name: "ثوب كحلي وشماغ", price: 250, character: "man_shemagh", primaryColor: "#1f2a44" },
  { id: "boy_casual", name: "ولد - ثوب شبابي", price: 100, character: "boy", primaryColor: "#ffffff" },
  { id: "boy_sport", name: "ولد - طقم رياضي أزرق", price: 180, character: "boy", primaryColor: "#2563eb", secondaryColor: "#1e293b" },
  { id: "girl_abaya", name: "بنت - عباية أنيقة", price: 120, character: "girl", primaryColor: "#18181b", secondaryColor: "#d4af37" },
  { id: "girl_dress", name: "بنت - فستان وردي", price: 200, character: "girl", primaryColor: "#f472b6", secondaryColor: "#fce7f3" },
];

interface WardrobeState {
  coins: number;
  isShopOpen: boolean;
  equippedOutfitId: string;
  ownedOutfits: string[];
  setShopOpen: (open: boolean) => void;
  addCoins: (amount: number) => void;
  buyOrEquipOutfit: (outfit: OutfitItem) => void;
}

export const useWardrobe = create<WardrobeState>((set, get) => ({
  coins: 500,
  isShopOpen: false,
  equippedOutfitId: "man_white",
  ownedOutfits: ["man_white"],
  setShopOpen: (open) => set({ isShopOpen: open }),
  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
  buyOrEquipOutfit: (outfit) => {
    const { coins, ownedOutfits } = get();
    if (ownedOutfits.includes(outfit.id)) {
      set({ equippedOutfitId: outfit.id });
    } else if (coins >= outfit.price) {
      set({
        coins: coins - outfit.price,
        ownedOutfits: [...ownedOutfits, outfit.id],
        equippedOutfitId: outfit.id,
      });
    }
  },
}));

let ghutraTex: THREE.Texture | null = null;
const ghutra = () => (ghutraTex ??= makeGhutraTexture());

let shemaghTex: THREE.Texture | null = null;
const shemagh = () => {
  if (shemaghTex) return shemaghTex;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#b91c1c";
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + 4, y + 4, 4, 4);
      }
    }
  }
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 64, 64);
  shemaghTex = new THREE.CanvasTexture(canvas);
  shemaghTex.magFilter = THREE.NearestFilter;
  shemaghTex.needsUpdate = true;
  return shemaghTex;
};

type V3 = [number, number, number];

function B({ p, s, m }: { p: V3; s: V3; m: THREE.Material }) {
  return (
    <mesh position={p} material={m} castShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

export function Player({ rt }: { rt: Runtime }) {
  return <Avatar body={rt.player} hidden={() => useGame.getState().carState === "driving"} />;
}

/** Voxel Gulf Characters: Man (Ghutra / Shemagh), Boy, and Girl. */
export function Avatar({ body: src, hidden }: { body: AvatarBody; hidden: () => boolean }) {
  const phase = useRef(0);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Mesh>(null);
  const footR = useRef<THREE.Mesh>(null);

  const equippedId = useWardrobe((s) => s.equippedOutfitId);
  const outfit = useMemo(
    () => SHOP_OUTFITS.find((o) => o.id === equippedId) ?? SHOP_OUTFITS[0]!,
    [equippedId],
  );

  const m = useMemo(
    () => ({
      primary: new THREE.MeshStandardMaterial({ color: outfit.primaryColor, roughness: 0.7 }),
      secondary: new THREE.MeshStandardMaterial({ color: outfit.secondaryColor ?? "#dedcd2", roughness: 0.7 }),
      skin: new THREE.MeshStandardMaterial({ color: "#c68a5e", roughness: 0.8 }),
      hair: new THREE.MeshStandardMaterial({ color: "#2b1d14", roughness: 0.9 }),
      eye: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5 }),
      ghutra: new THREE.MeshStandardMaterial({ map: ghutra(), roughness: 0.8 }),
      shemagh: new THREE.MeshStandardMaterial({ map: shemagh(), roughness: 0.8 }),
      agal: new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.5 }),
      sandal: new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.8 }),
    }),
    [outfit],
  );

  const isBoy = outfit.character === "boy";
  const isGirl = outfit.character === "girl";
  const isShemagh = outfit.character === "man_shemagh";
  const scale = isBoy || isGirl ? 0.82 : 1.0;

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const p = src;
    g.visible = !hidden();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;
    g.scale.setScalar(scale);

    const amt = Math.min(1, p.speed / WALK.SPEED);
    phase.current += Math.min(delta, 0.05) * (4 + 7 * amt) * amt;
    const s = Math.sin(phase.current);
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
        <B p={[0, 0.7, 0]} s={[0.62, 1.0, 0.4]} m={m.primary} />
        <B p={[0, 0.22, 0]} s={[isGirl ? 0.74 : 0.66, 0.22, isGirl ? 0.5 : 0.44]} m={m.primary} />
        {!isGirl && <B p={[0, 0.98, 0.205]} s={[0.035, 0.32, 0.01]} m={m.secondary} />}
        <B p={[0, 1.18, 0]} s={[0.3, 0.06, 0.3]} m={m.primary} />

        <group ref={armL} position={[-0.41, 1.14, 0]}>
          <B p={[0, -0.28, 0]} s={[0.2, 0.58, 0.22]} m={m.primary} />
          <B p={[0, -0.62, 0]} s={[0.16, 0.14, 0.16]} m={m.skin} />
        </group>

        <group ref={armR} position={[0.41, 1.14, 0]}>
          <B p={[0, -0.28, 0]} s={[0.2, 0.58, 0.22]} m={m.primary} />
          <B p={[0, -0.62, 0]} s={[0.16, 0.14, 0.16]} m={m.skin} />
        </group>

        <B p={[0, 1.43, 0]} s={[0.44, 0.44, 0.42]} m={m.skin} />
        <B p={[-0.1, 1.47, 0.212]} s={[0.07, 0.07, 0.02]} m={m.eye} />
        <B p={[0.1, 1.47, 0.212]} s={[0.07, 0.07, 0.02]} m={m.eye} />

        {/* لحية وشارب الرجل */}
        {!isBoy && !isGirl && (
          <>
            <B p={[0, 1.27, 0.2]} s={[0.38, 0.14, 0.06]} m={m.hair} />
            <B p={[0, 1.35, 0.218]} s={[0.22, 0.045, 0.02]} m={m.hair} />
          </>
        )}

        {/* غترة أو شماغ الرجل */}
        {!isBoy && !isGirl && (
          <>
            <B p={[0, 1.69, -0.01]} s={[0.54, 0.14, 0.5]} m={isShemagh ? m.shemagh : m.ghutra} />
            <B p={[-0.255, 1.42, -0.04]} s={[0.06, 0.46, 0.46]} m={isShemagh ? m.shemagh : m.ghutra} />
            <B p={[0.255, 1.42, -0.04]} s={[0.06, 0.46, 0.46]} m={isShemagh ? m.shemagh : m.ghutra} />
            <B p={[0, 1.22, -0.24]} s={[0.56, 0.78, 0.08]} m={isShemagh ? m.shemagh : m.ghutra} />
            <B p={[0, 1.62, 0.225]} s={[0.52, 0.06, 0.05]} m={isShemagh ? m.shemagh : m.ghutra} />
            {isShemagh && <B p={[0.12, 1.77, 0.02]} s={[0.26, 0.06, 0.42]} m={m.shemagh} />}
            <B p={[0, 1.78, 0.2]} s={[0.46, 0.07, 0.07]} m={m.agal} />
            <B p={[0, 1.78, -0.21]} s={[0.46, 0.07, 0.07]} m={m.agal} />
            <B p={[-0.2, 1.78, 0]} s={[0.07, 0.07, 0.46]} m={m.agal} />
            <B p={[0.2, 1.78, 0]} s={[0.07, 0.07, 0.46]} m={m.agal} />
          </>
        )}

        {/* شعر الولد */}
        {isBoy && (
          <>
            <B p={[0, 1.68, 0]} s={[0.46, 0.1, 0.44]} m={m.hair} />
            <B p={[0, 1.5, -0.21]} s={[0.44, 0.3, 0.05]} m={m.hair} />
          </>
        )}

        {/* حجاب/شعر البنت */}
        {isGirl && (
          <>
            <B p={[0, 1.68, -0.02]} s={[0.5, 0.12, 0.48]} m={m.secondary} />
            <B p={[-0.24, 1.35, -0.02]} s={[0.06, 0.55, 0.44]} m={m.secondary} />
            <B p={[0.24, 1.35, -0.02]} s={[0.06, 0.55, 0.44]} m={m.secondary} />
            <B p={[0, 1.25, -0.23]} s={[0.5, 0.72, 0.06]} m={m.secondary} />
          </>
        )}
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
