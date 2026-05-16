// src/match-engine/tests/duelEngine.calibration.test.ts
// Statistical calibration tests for the match engine.
// Each test runs N simulations and checks that the win rate falls within the expected range.
// Run: npm run test:engine

import { describe, it, expect } from "vitest";
import { resolveDuel } from "../balancing/duelEngine";
import { randomizeEventOutcome } from "../balancing/eventRandomizer";

import type {
  DuelContext,
  GoalkeeperMatchPlayer,
  OutfieldMatchPlayer,
} from "../matchTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIMULATIONS = 20_000;

// Statistical tolerance margin (±)
// With 20k simulations, standard deviation is low — 4% margin is conservative
const TOLERANCE = 4;

// ─── Players ──────────────────────────────────────────────────────────────────

const pele: OutfieldMatchPlayer = {
  id: 1, name: "Pelé", overall: 95, position: "ST",
  nationality: "Brazil", height: 173, role: "outfield",
  stats: { pace: 91, shooting: 96, passing: 90, dribbling: 96, defending: 42, physical: 79 },
};

const kane: OutfieldMatchPlayer = {
  id: 2, name: "Kane", overall: 88, position: "ST",
  nationality: "England", height: 188, role: "outfield",
  stats: { pace: 70, shooting: 87, passing: 83, dribbling: 79, defending: 47, physical: 83 },
};

const mediocreStriker: OutfieldMatchPlayer = {
  id: 3, name: "Average Striker", overall: 74, position: "ST",
  nationality: "N/A", height: 178, role: "outfield",
  stats: { pace: 72, shooting: 71, passing: 65, dribbling: 68, defending: 35, physical: 68 },
};

const maldini: OutfieldMatchPlayer = {
  id: 289, name: "Maldini", overall: 93, position: "CB",
  nationality: "Italy", height: 185, role: "outfield",
  stats: { pace: 82, shooting: 63, passing: 76, dribbling: 75, defending: 95, physical: 90 },
};

const marquinhos: OutfieldMatchPlayer = {
  id: 28, name: "Marquinhos", overall: 86, position: "CB",
  nationality: "Brazil", height: 183, role: "outfield",
  stats: { pace: 76, shooting: 52, passing: 74, dribbling: 70, defending: 86, physical: 77 },
};

const garnacho: OutfieldMatchPlayer = {
  id: 40, name: "Garnacho", overall: 76, position: "LW",
  nationality: "Argentina", height: 180, role: "outfield",
  stats: { pace: 84, shooting: 74, passing: 72, dribbling: 79, defending: 28, physical: 64 },
};

const yashin: GoalkeeperMatchPlayer = {
  id: 295, name: "Yashin", overall: 93, position: "GK",
  nationality: "Russia", height: 190, role: "goalkeeper",
  stats: { diving: 95, handling: 91, kicking: 85, reflexes: 96, speed: 70, positioning: 92 },
};

const goodGK: GoalkeeperMatchPlayer = {
  id: 10, name: "Good GK", overall: 83, position: "GK",
  nationality: "N/A", height: 187, role: "goalkeeper",
  stats: { diving: 82, handling: 80, kicking: 75, reflexes: 83, speed: 72, positioning: 82 },
};

const weakGK: GoalkeeperMatchPlayer = {
  id: 11, name: "Weak GK", overall: 72, position: "GK",
  nationality: "N/A", height: 183, role: "goalkeeper",
  stats: { diving: 70, handling: 68, kicking: 65, reflexes: 72, speed: 65, positioning: 70 },
};

const dummyOutfield: OutfieldMatchPlayer = {
  id: 998, name: "Dummy", overall: 75, position: "CB",
  nationality: "N/A", height: 180, role: "outfield",
  stats: { pace: 70, shooting: 65, passing: 70, dribbling: 65, defending: 70, physical: 70 },
};

const dummyGK: GoalkeeperMatchPlayer = {
  id: 999, name: "Dummy GK", overall: 75, position: "GK",
  nationality: "N/A", height: 185, role: "goalkeeper",
  stats: { diving: 75, reflexes: 75, speed: 70, handling: 75, kicking: 70, positioning: 75 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function simulateWinRate(context: DuelContext): number {
  const { rawDelta } = resolveDuel(context);
  let success = 0;

  for (let i = 0; i < SIMULATIONS; i++) {
    const result = randomizeEventOutcome({ context, rawDelta });
    if (result.outcome === "success" || result.outcome === "success_high") success++;
  }

  return (success / SIMULATIONS) * 100;
}

function assertInRange(actual: number, min: number, max: number, label: string) {
  const toleratedMin = min - TOLERANCE;
  const toleratedMax = max + TOLERANCE;

  expect(
    actual,
    `${label}: expected ${min}–${max}% (±${TOLERANCE}%), got ${actual.toFixed(1)}%`
  ).toBeGreaterThanOrEqual(toleratedMin);

  expect(
    actual,
    `${label}: expected ${min}–${max}% (±${TOLERANCE}%), got ${actual.toFixed(1)}%`
  ).toBeLessThanOrEqual(toleratedMax);
}

// ─── Defensive actions ────────────────────────────────────────────────────────

describe("Defensive actions — Maldini (93 OVR) vs Garnacho (76 OVR)", () => {

  function makeContext(action: DuelContext["action"]): DuelContext {
    return {
      action,
      zone: "def_mid",
      lane: "center",
      possession: "opponent",
      situationType: "open_play",
      setPieceType: null,
      actors: {
        userPlayer: maldini,
        opponentPlayer: garnacho,
        userGoalkeeper: dummyGK,
        opponentGoalkeeper: dummyGK,
      },
    };
  }

  it("tackle          — Maldini wins 80–95%", () => {
    assertInRange(simulateWinRate(makeContext("tackle")), 80, 95, "Maldini tackle vs Garnacho");
  });

  it("intercept       — Maldini wins 85–95%", () => {
    assertInRange(simulateWinRate(makeContext("intercept")), 85, 95, "Maldini intercept vs Garnacho");
  });

  it("slide tackle    — Maldini wins 55–75% (high volatility)", () => {
    assertInRange(simulateWinRate(makeContext("slide_tackle")), 55, 75, "Maldini slide_tackle vs Garnacho");
  });

  it("shoulder charge — Maldini wins 65–80%", () => {
    assertInRange(simulateWinRate(makeContext("shoulder_charge")), 65, 80, "Maldini shoulder_charge vs Garnacho");
  });

});

describe("Defensive actions — Maldini (93 OVR) vs Pelé (95 OVR)", () => {

  function makeContext(action: DuelContext["action"]): DuelContext {
    return {
      action,
      zone: "def_mid",
      lane: "center",
      possession: "opponent",
      situationType: "open_play",
      setPieceType: null,
      actors: {
        userPlayer: maldini,
        opponentPlayer: pele,
        userGoalkeeper: dummyGK,
        opponentGoalkeeper: dummyGK,
      },
    };
  }

  it("tackle    — close duel, Maldini wins 50–65%", () => {
    assertInRange(simulateWinRate(makeContext("tackle")), 50, 65, "Maldini tackle vs Pelé");
  });

  it("intercept — close duel, Maldini wins 50–65%", () => {
    assertInRange(simulateWinRate(makeContext("intercept")), 50, 65, "Maldini intercept vs Pelé");
  });

});

describe("Defensive actions — Marquinhos (86 OVR) vs Pelé (95 OVR)", () => {

  function makeContext(action: DuelContext["action"]): DuelContext {
    return {
      action,
      zone: "def_mid",
      lane: "center",
      possession: "opponent",
      situationType: "open_play",
      setPieceType: null,
      actors: {
        userPlayer: marquinhos,
        opponentPlayer: pele,
        userGoalkeeper: dummyGK,
        opponentGoalkeeper: dummyGK,
      },
    };
  }

  it("tackle          — Pelé favoured, Marquinhos wins 32–48%", () => {
    assertInRange(simulateWinRate(makeContext("tackle")), 32, 48, "Marquinhos tackle vs Pelé");
  });

  it("shoulder charge — more balanced, Marquinhos wins 38–52%", () => {
    assertInRange(simulateWinRate(makeContext("shoulder_charge")), 38, 52, "Marquinhos shoulder_charge vs Pelé");
  });

});

// ─── Finish — atk_bigchance ───────────────────────────────────────────────────

describe("finish — atk_bigchance (goalkeeper as defensive player)", () => {

  function makeContext(striker: OutfieldMatchPlayer, gk: GoalkeeperMatchPlayer): DuelContext {
    return {
      action: "finish",
      zone: "atk_bigchance",
      lane: "center",
      possession: "user",
      situationType: "open_play",
      setPieceType: null,
      actors: {
        userPlayer: striker,
        opponentPlayer: dummyOutfield,
        userGoalkeeper: dummyGK,
        opponentGoalkeeper: gk,
      },
    };
  }

  it("Pelé vs Yashin        — 55–70% goal", () => {
    assertInRange(simulateWinRate(makeContext(pele, yashin)), 55, 70, "Pelé finish vs Yashin");
  });

  it("Pelé vs Good GK       — 65–78% goal", () => {
    assertInRange(simulateWinRate(makeContext(pele, goodGK)), 65, 78, "Pelé finish vs Good GK");
  });

  it("Pelé vs Weak GK       — 75–88% goal", () => {
    assertInRange(simulateWinRate(makeContext(pele, weakGK)), 75, 88, "Pelé finish vs Weak GK");
  });

  it("Kane vs Yashin        — 40–56% goal", () => {
    assertInRange(simulateWinRate(makeContext(kane, yashin)), 40, 56, "Kane finish vs Yashin");
  });

  it("Kane vs Good GK       — 55–72% goal", () => {
    assertInRange(simulateWinRate(makeContext(kane, goodGK)), 55, 72, "Kane finish vs Good GK");
  });

  it("Kane vs Weak GK       — 68–84% goal", () => {
    assertInRange(simulateWinRate(makeContext(kane, weakGK)), 68, 84, "Kane finish vs Weak GK");
  });

  it("Average vs Yashin     — 18–38% goal", () => {
    assertInRange(simulateWinRate(makeContext(mediocreStriker, yashin)), 18, 38, "Average finish vs Yashin");
  });

  it("Average vs Good GK   — 32–50% goal", () => {
    assertInRange(simulateWinRate(makeContext(mediocreStriker, goodGK)), 32, 50, "Average finish vs Good GK");
  });

  it("Average vs Weak GK   — 48–66% goal", () => {
    assertInRange(simulateWinRate(makeContext(mediocreStriker, weakGK)), 48, 66, "Average finish vs Weak GK");
  });

});

// ─── rush_save / wait — def_bigchance ────────────────────────────────────────

describe("rush_save / wait — def_bigchance (user goalkeeper defends)", () => {

  function makeContext(
    action: "rush_save" | "wait",
    gk: GoalkeeperMatchPlayer,
    striker: OutfieldMatchPlayer,
  ): DuelContext {
    return {
      action,
      zone: "def_bigchance",
      lane: "center",
      possession: "opponent",
      situationType: "open_play",
      setPieceType: null,
      actors: {
        userPlayer: dummyOutfield,
        opponentPlayer: striker,
        userGoalkeeper: gk,
        opponentGoalkeeper: dummyGK,
      },
    };
  }

  it("Yashin    rush vs Pelé          — saves 40–58%", () => {
    assertInRange(simulateWinRate(makeContext("rush_save", yashin, pele)), 40, 58, "Yashin rush vs Pelé");
  });

  it("Yashin    wait vs Pelé          — saves 46–64%", () => {
    assertInRange(simulateWinRate(makeContext("wait", yashin, pele)), 46, 64, "Yashin wait vs Pelé");
  });

  it("Yashin    rush vs Average       — saves 58–74%", () => {
    assertInRange(simulateWinRate(makeContext("rush_save", yashin, mediocreStriker)), 58, 74, "Yashin rush vs Average");
  });

  it("Yashin    wait vs Average       — saves 62–78%", () => {
    assertInRange(simulateWinRate(makeContext("wait", yashin, mediocreStriker)), 62, 78, "Yashin wait vs Average");
  });

  it("Good GK   rush vs Pelé          — saves 36–52%", () => {
    assertInRange(simulateWinRate(makeContext("rush_save", goodGK, pele)), 36, 52, "Good GK rush vs Pelé");
  });

  it("Good GK   wait vs Pelé          — saves 38–55%", () => {
    assertInRange(simulateWinRate(makeContext("wait", goodGK, pele)), 38, 55, "Good GK wait vs Pelé");
  });

  it("Weak GK   rush vs Pelé          — saves 28–46%", () => {
    assertInRange(simulateWinRate(makeContext("rush_save", weakGK, pele)), 28, 46, "Weak GK rush vs Pelé");
  });

  it("Weak GK   wait vs Pelé          — saves 28–48%", () => {
    assertInRange(simulateWinRate(makeContext("wait", weakGK, pele)), 28, 48, "Weak GK wait vs Pelé");
  });

  it("Yashin wait >= rush vs Kane (elite GK benefits from holding position)", () => {
    const rush = simulateWinRate(makeContext("rush_save", yashin, kane));
    const wait = simulateWinRate(makeContext("wait", yashin, kane));
    expect(
      wait,
      `wait (${wait.toFixed(1)}%) should be >= rush (${rush.toFixed(1)}%) for elite GK`
    ).toBeGreaterThanOrEqual(rush - TOLERANCE);
  });

});