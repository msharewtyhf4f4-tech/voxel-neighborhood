import { describe, expect, it } from "vitest";
import { buildHouses, cityPopulation, COIN_RESPAWN_S, makeLayout, MIN_ROWS, WALK_HALF, type Coin } from "./world";
import { canEnterCar, collectCoins, createBody, mergeInput, stepWalker } from "./motion";
import { checkName, nameToEmail } from "../net/identity";

describe("city rules", () => {
  it("numbers odd houses on the left and even on the right, owned by the matching player", () => {
    const houses = buildHouses([{ userId: "u1", number: 1, name: "فهد", coins: 30 }], MIN_ROWS);
    expect(houses).toHaveLength(24);
    expect(houses[0]).toMatchObject({ number: 1, side: -1, name: "فهد", owner: "u1", coins: 30 });
    expect(houses[1]).toMatchObject({ number: 2, side: 1, owner: null });
  });

  it("population counts houses that have an owner", () => {
    const houses = buildHouses(
      [
        { userId: "a", number: 1, name: "a", coins: 0 },
        { userId: "b", number: 2, name: "b", coins: 0 },
      ],
      MIN_ROWS,
    );
    expect(cityPopulation(houses)).toBe(2);
  });

  it("the street grows so there are always free houses", () => {
    expect(makeLayout(0).rows).toBe(MIN_ROWS);
    expect(makeLayout(40).rows * 2).toBeGreaterThan(40);
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

describe("player names", () => {
  it("needs 2 to 20 letters", () => {
    expect(checkName("a").ok).toBe(false);
    expect(checkName("أبو فهد").ok).toBe(true);
    expect(checkName("x".repeat(21)).ok).toBe(false);
  });

  it("the same name with different spacing signs in to the same account", async () => {
    const a = checkName("  أبو   فهد ");
    const b = checkName("أبو فهد");
    if (!a.ok || !b.ok) throw new Error("names should be valid");
    expect(await nameToEmail(a.key)).toBe(await nameToEmail(b.key));
  });
});
