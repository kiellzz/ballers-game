import { describe, expect, it } from "vitest";

import { resolveOpenPlayShot } from "../open-play/resolveOpenPlayShot";
import type { GoalkeeperMatchPlayer } from "../matchTypes";

const eliteGoalkeeper: GoalkeeperMatchPlayer = {
  id: 1,
  name: "Elite GK",
  overall: 93,
  position: "GK",
  nationality: "Italy",
  height: 190,
  role: "goalkeeper",
  stats: {
    diving: 95,
    reflexes: 96,
    speed: 70,
    handling: 91,
    kicking: 84,
    positioning: 92,
  },
};

const averageGoalkeeper: GoalkeeperMatchPlayer = {
  id: 2,
  name: "Average GK",
  overall: 82,
  position: "GK",
  nationality: "Spain",
  height: 187,
  role: "goalkeeper",
  stats: {
    diving: 82,
    reflexes: 83,
    speed: 68,
    handling: 80,
    kicking: 74,
    positioning: 82,
  },
};

const weakGoalkeeper: GoalkeeperMatchPlayer = {
  id: 3,
  name: "Weak GK",
  overall: 72,
  position: "GK",
  nationality: "England",
  height: 183,
  role: "goalkeeper",
  stats: {
    diving: 70,
    reflexes: 72,
    speed: 65,
    handling: 68,
    kicking: 65,
    positioning: 70,
  },
};

const SIMULATIONS = 20_000;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function simulateShotRates(params: {
  zone: "atk_box" | "atk_mid";
  outcome: "success" | "success_high";
  goalkeeper: GoalkeeperMatchPlayer;
}) {
  const { zone, outcome, goalkeeper } = params;
  const random = createSeededRandom(1337);
  let goals = 0;
  let saves = 0;

  for (let i = 0; i < SIMULATIONS; i += 1) {
    const shot = resolveOpenPlayShot({
      zone,
      possession: "user",
      outcome,
      random,
      goalkeeper,
    });

    if (shot.outcome === "goal") {
      goals += 1;
    }

    if (shot.outcome === "save") {
      saves += 1;
    }
  }

  return {
    goalRate: (goals / SIMULATIONS) * 100,
    saveRate: (saves / SIMULATIONS) * 100,
  };
}

describe("resolveOpenPlayShot goalkeeper scaling", () => {
  it("separates elite and weak goalkeepers on box finishes", () => {
    const elite = simulateShotRates({
      zone: "atk_box",
      outcome: "success",
      goalkeeper: eliteGoalkeeper,
    });
    const average = simulateShotRates({
      zone: "atk_box",
      outcome: "success",
      goalkeeper: averageGoalkeeper,
    });
    const weak = simulateShotRates({
      zone: "atk_box",
      outcome: "success",
      goalkeeper: weakGoalkeeper,
    });

    expect(elite.goalRate).toBeLessThan(average.goalRate);
    expect(average.goalRate).toBeLessThan(weak.goalRate);
    expect(elite.saveRate).toBeGreaterThan(average.saveRate);
    expect(average.saveRate).toBeGreaterThan(weak.saveRate);
    expect(weak.goalRate - elite.goalRate).toBeGreaterThan(5);
  });

  it("gives elite goalkeepers a clearer edge on long-range shots", () => {
    const elite = simulateShotRates({
      zone: "atk_mid",
      outcome: "success_high",
      goalkeeper: eliteGoalkeeper,
    });
    const weak = simulateShotRates({
      zone: "atk_mid",
      outcome: "success_high",
      goalkeeper: weakGoalkeeper,
    });

    expect(elite.goalRate).toBeLessThan(weak.goalRate);
    expect(elite.saveRate).toBeGreaterThan(weak.saveRate);
    expect(weak.goalRate - elite.goalRate).toBeGreaterThan(6);
  });
});
