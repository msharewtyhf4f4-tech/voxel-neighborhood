import * as THREE from "three";
import type { House } from "../sim/world";
import { mulberry32 } from "../sim/world";
import { SIGN_FONT } from "./palette";

function finish(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, colors: string[], n: number, seed: number, size = 2) {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)]!;
    ctx.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), size, size);
  }
}

export function makeRoadTexture(length: number) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#44474c";
  ctx.fillRect(0, 0, 128, 256);
  speckle(ctx, 128, 256, ["#3b3e42", "#4d5056", "#383a3e"], 1800, 3, 3);
  ctx.fillStyle = "#efeee8";
  ctx.fillRect(5, 0, 4, 256);
  ctx.fillRect(119, 0, 4, 256);
  ctx.fillRect(61, 0, 6, 120);
  return finish(c, [1, length / 8]);
}

export function makeSandTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#e6cfa1";
  ctx.fillRect(0, 0, 128, 128);
  speckle(ctx, 128, 128, ["#dcc08c", "#efdcb5", "#d8b985", "#f2e2c0"], 900, 9, 4);
  return finish(c, [24, 44]);
}

export function makeGhutraTexture() {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fbf8f2";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#c4252d";
  for (let y = 0; y < 16; y += 4)
    for (let x = 0; x < 16; x += 4) {
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + 2, y + 2, 1, 1);
    }
  const t = finish(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawHouseSign(c: HTMLCanvasElement, h: House, mine: boolean) {
  const W = c.width;
  const H = c.height;
  const ctx = c.getContext("2d")!;
  const empty = h.owner === null;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = mine ? "#f2c230" : empty ? "#8a9a9d" : "#2a9d8f";
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.fill();
  ctx.fillStyle = empty ? "#eef0ec" : "#fff8ea";
  roundRect(ctx, 14, 14, W - 28, H - 28, 26);
  ctx.fill();
  // number badge on the right (RTL start)
  const cx = W - 96;
  const cy = H / 2;
  ctx.fillStyle = empty ? "#9aa7aa" : mine ? "#e0a81e" : "#e76f51";
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 70px ${SIGN_FONT}`;
  ctx.fillText(String(h.number), cx, cy + 4);
  ctx.direction = "rtl";
  const tx = (W - 180) / 2 + 20;
  if (empty) {
    ctx.fillStyle = "#5f6f73";
    ctx.font = `800 58px ${SIGN_FONT}`;
    ctx.fillText("بيت متاح", tx, H / 2 - 28, 300);
    ctx.font = `700 30px ${SIGN_FONT}`;
    ctx.fillText("للاعب الجديد القادم", tx, H / 2 + 52, 300);
    return;
  }
  ctx.fillStyle = "#1f3b47";
  ctx.font = `800 62px ${SIGN_FONT}`;
  ctx.fillText(h.name, tx, H / 2 - 30, 300);
  ctx.fillStyle = mine ? "#b07a00" : "#5f7880";
  ctx.font = `700 34px ${SIGN_FONT}`;
  ctx.fillText(mine ? `بيتك · ${h.coins} عملة` : `${h.coins} عملة`, tx, H / 2 + 52, 300);
}

export function drawGateSign(c: HTMLCanvasElement, title: string) {
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1f5f63";
  roundRect(ctx, 0, 0, W, H, 30);
  ctx.fill();
  ctx.strokeStyle = "#f2c230";
  ctx.lineWidth = 10;
  roundRect(ctx, 14, 14, W - 28, H - 28, 22);
  ctx.stroke();
  ctx.fillStyle = "#fff4d6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.font = `800 104px ${SIGN_FONT}`;
  ctx.fillText(title, W / 2, H / 2 + 8, W - 80);
}

export function canvasTexture(w: number, h: number, draw: (c: HTMLCanvasElement) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c);
  return { canvas: c, texture: finish(c) };
}

/** Generic banner: colored board with a centered Arabic title. */
export function drawBanner(c: HTMLCanvasElement, title: string, bg: string, fg = "#ffffff", border = "#f2c230") {
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, Math.min(30, H / 5));
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.max(6, H / 16);
  roundRect(ctx, 12, 12, W - 24, H - 24, Math.min(22, H / 6));
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.font = `800 ${Math.round(H * 0.6)}px ${SIGN_FONT}`;
  ctx.fillText(title, W / 2, H / 2 + H * 0.05, W - 60);
}

/** Green road sign: one row per destination, arrow on the left. */
export function drawDirectionSign(c: HTMLCanvasElement, rows: { name: string; arrow: string }[]) {
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#1d6b47";
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();
  ctx.strokeStyle = "#f4f4ee";
  ctx.lineWidth = 6;
  roundRect(ctx, 10, 10, W - 20, H - 20, 18);
  ctx.stroke();
  const rh = (H - 30) / rows.length;
  rows.forEach((r, i) => {
    const y = 15 + rh * (i + 0.5);
    ctx.fillStyle = "#f4f4ee";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.font = `700 ${Math.round(rh * 0.55)}px ${SIGN_FONT}`;
    ctx.fillText(r.name, W - 34, y + 3, W - 140);
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.font = `800 ${Math.round(rh * 0.7)}px Tahoma, sans-serif`;
    ctx.fillStyle = "#f2c230";
    ctx.fillText(r.arrow, 64, y + 2);
    if (i > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(28, 15 + rh * i - 1, W - 56, 2);
    }
  });
}

/** Round speed-limit sign. */
export function drawSpeedSign(c: HTMLCanvasElement, limit: number) {
  const ctx = c.getContext("2d")!;
  const S = c.width;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#d62828";
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - S * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(S * 0.38)}px Tahoma, sans-serif`;
  ctx.fillText(String(limit), S / 2, S / 2 + 4);
}
