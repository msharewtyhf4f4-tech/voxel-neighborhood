import { describe, expect, it } from "vitest";
import { buildHouses, cityPopulation, COIN_RESPAWN_S, WALK_HALF, type Coin } from "./world";
import { canEnterCar, collectCoins, createBody, mergeInput, stepWalker } from "./motion";

describe("city rules", () => {
  it("numbers odd houses on the left and even on the right", () => {
    const houses = buildHouses();
    expect(houses).toHaveLength(24);
    expect(houses[0]).toMatchObject({ number: 1, side: -1, name: "أبو محمد" });
    expect(houses[1]).toMatchObject({ number: 2, side: 1 });
  });

  it("population is the sum of every house's residents", () => {
    expect(cityPopulation(buildHouses([{ name: "a", residents: 3 }, { name: "b", residents: 4 }]))).toBe(7);
  });

  it("a coin is worth 10 points and comes back after its respawn time", () => {
    const coins: Coin[] = [{ x: 0, z: 0, takenAt: -1 }];
    expect(collectCoins(coins, 0, 0, 5)).toBe(10);
    expect(collectCoins(coins, 0, 0, 6)).toBe(0);
    expect(collectCoins(coins, 0, 0, 5 + COIN_RESPAWN_S)).toBe(10);
  });

  it("joystick up walks down the street (toward -Z) and right goes +X", () => {
    expect(mergeInput({ x: 0, y: 0 }, new Set(["ArrowUp"]))).toEqual({ x: 0, y: 1 });
    const b = createBody(0, 0);
    for (let i = 0; i < 60; i++) stepWalker(b, { x: 0, y: 1, jump: false }, 1 / 60);
    expect(b.z).toBeLessThan(-2);
    const r = createBody(0, 0);
    for (let i = 0; i < 60; i++) stepWalker(r, { x: 1, y: 0, jump: false }, 1 / 60);
    expect(r.x).toBeGreaterThan(2);
  });

  it("the walker cannot leave the sidewalk into the houses", () => {
    const b = createBody(0, -20);
    for (let i = 0; i < 600; i++) stepWalker(b, { x: -1, y: 0, jump: false }, 1 / 60);
    expect(b.x).toBe(-WALK_HALF);
  });

  it("you can get in the car only when standing close to it", () => {
    expect(canEnterCar(createBody(0, 0), createBody(3, 1))).toBe(true);
    expect(canEnterCar(createBody(0, 0), createBody(0, 8))).toBe(false);
  });
});
