import { describe, expect, it } from "vitest";
import { checkName, nameToEmail } from "../net/identity";
import { arrowFor, buildCityMap, RACE, raceCross, STADIUM } from "./map";
import { cameraRelative, canEnterCar, collectCoins, createBody, mergeInput, stepWalker } from "./motion";
import { buildHouses, cityPopulation, COIN_RESPAWN_S, HOUSES_PER_STREET, makeLayout, type Coin } from "./world";

const map = buildCityMap(makeLayout(0));
const walk = (x: number, z: number, wx: number, wz: number, seconds: number) => {
  const b = createBody(x, z);
  for (let i = 0; i < seconds * 60; i++) stepWalker(b, { wx, wz, jump: false }, 1 / 60, map);
  return b;
};

describe("houses", () => {
  it("numbers odd houses on the left and even on the right, owned by the matching player", () => {
    const houses = buildHouses([{ userId: "u1", number: 1, name: "فهد", coins: 30 }], makeLayout(0));
    expect(houses[0]).toMatchObject({ number: 1, side: -1, name: "فهد", owner: "u1", coins: 30, street: 0 });
    expect(houses[1]).toMatchObject({ number: 2, side: 1, owner: null });
  });

  it("house 25 starts the second residential street", () => {
    const houses = buildHouses([], makeLayout(0));
    expect(houses[24]).toMatchObject({ number: 25, street: 1 });
  });

  it("the city has at least 3 streets and grows so there are always free houses", () => {
    expect(makeLayout(0).streets).toBe(3);
    expect(makeLayout(200).streets * HOUSES_PER_STREET).toBeGreaterThan(200);
  });

  it("population counts houses that have an owner", () => {
    const houses = buildHouses(
      [
        { userId: "a", number: 1, name: "a", coins: 0 },
        { userId: "b", number: 30, name: "b", coins: 0 },
      ],
      makeLayout(30),
    );
    expect(cityPopulation(houses)).toBe(2);
  });
});

describe("movement", () => {
  it("stick up walks where the camera looks and right goes to screen right", () => {
    expect(mergeInput({ x: 0, y: 0 }, new Set(["ArrowUp"]))).toEqual({ x: 0, y: 1 });
    const f = cameraRelative(0, 1, Math.PI);
    expect(f.wz).toBeCloseTo(-1);
    const r = cameraRelative(1, 0, Math.PI);
    expect(r.wx).toBeCloseTo(1);
  });

  it("walls of houses stop the walker", () => {
    const b = walk(0, -20, -1, 0, 10);
    expect(b.x).toBeGreaterThan(-7.3);
  });

  it("players can walk into the stadium through its gate", () => {
    const b = walk(-5, 30, 0, 1, 12);
    expect(b.z).toBeGreaterThan(STADIUM.pitch.z0);
  });

  it("you can get in the car only when standing close to it", () => {
    expect(canEnterCar(createBody(0, 0), createBody(3, 1))).toBe(true);
    expect(canEnterCar(createBody(0, 0), createBody(0, 8))).toBe(false);
  });
});

describe("coins, race and signs", () => {
  it("a coin is worth 10 points and comes back after its respawn time", () => {
    const coins: Coin[] = [{ x: 0, z: 0, takenAt: -1 }];
    expect(collectCoins(coins, 0, 0, 5)).toBe(10);
    expect(collectCoins(coins, 0, 0, 6)).toBe(0);
    expect(collectCoins(coins, 0, 0, 5 + COIN_RESPAWN_S)).toBe(10);
  });

  it("the race starts and finishes when driving east across the lines", () => {
    const z = (RACE.z0 + RACE.z1) / 2;
    expect(raceCross(RACE.startX - 1, RACE.startX + 1, z)).toBe("start");
    expect(raceCross(RACE.finishX - 1, RACE.finishX + 1, z)).toBe("finish");
    expect(raceCross(RACE.startX + 1, RACE.startX - 1, z)).toBeNull();
  });

  it("road signs point the right way", () => {
    // viewer looking north (-Z) at a sign whose face points south
    expect(arrowFor(0, 0, 0, 0, -50)).toBe("↑");
    expect(arrowFor(0, 0, 0, 50, 0)).toBe("→");
    expect(arrowFor(0, 0, 0, -50, 0)).toBe("←");
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
