// src/match-engine/debug.ts
// Run with: npx tsx debug.ts

import { resolveDuel } from "../balancing/duelEngine";
import { randomizeEventOutcome } from "../balancing/eventRandomizer";

import type {
  DuelContext,
  GoalkeeperMatchPlayer,
  OutfieldMatchPlayer,
} from "../matchTypes";

// ─── Goleiros ─────────────────────────────────────────────────────────────────

const yashin: GoalkeeperMatchPlayer = {
  id: 295, name: "Yashin (93)", overall: 93, position: "GK",
  nationality: "Russia", height: 190, role: "goalkeeper",
  stats: { diving: 95, handling: 91, kicking: 85, reflexes: 96, speed: 70, positioning: 92 },
};

const goodGK: GoalkeeperMatchPlayer = {
  id: 10, name: "GK bom (83)", overall: 83, position: "GK",
  nationality: "N/A", height: 187, role: "goalkeeper",
  stats: { diving: 82, handling: 80, kicking: 75, reflexes: 83, speed: 72, positioning: 82 },
};

const weakGK: GoalkeeperMatchPlayer = {
  id: 11, name: "GK fraco (72)", overall: 72, position: "GK",
  nationality: "N/A", height: 183, role: "goalkeeper",
  stats: { diving: 70, handling: 68, kicking: 65, reflexes: 72, speed: 65, positioning: 70 },
};

// ─── Atacantes ────────────────────────────────────────────────────────────────

const pele: OutfieldMatchPlayer = {
  id: 1, name: "Pelé (95)", overall: 95, position: "ST",
  nationality: "Brazil", height: 173, role: "outfield",
  stats: { pace: 91, shooting: 96, passing: 90, dribbling: 96, defending: 42, physical: 79 },
};

const kane: OutfieldMatchPlayer = {
  id: 2, name: "Kane (88)", overall: 88, position: "ST",
  nationality: "England", height: 188, role: "outfield",
  stats: { pace: 70, shooting: 87, passing: 83, dribbling: 79, defending: 47, physical: 83 },
};

const mediocreStriker: OutfieldMatchPlayer = {
  id: 3, name: "Atacante médio (74)", overall: 74, position: "ST",
  nationality: "N/A", height: 178, role: "outfield",
  stats: { pace: 72, shooting: 71, passing: 65, dribbling: 68, defending: 35, physical: 68 },
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

// ─── Simulação ────────────────────────────────────────────────────────────────

const SIMULATIONS = 20_000;

function simulate(
  gk: GoalkeeperMatchPlayer,
  striker: OutfieldMatchPlayer,
  action: "rush_save" | "wait",
): { savePct: number; rawDelta: number } {
  // def_bigchance: GK do user vs atacante opponent
  const context: DuelContext = {
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

  const duelScores = resolveDuel(context);
  let success = 0;

  for (let i = 0; i < SIMULATIONS; i++) {
    const result = randomizeEventOutcome({ context, rawDelta: duelScores.rawDelta });
    if (result.outcome === "success" || result.outcome === "success_high") success++;
  }

  return {
    savePct: (success / SIMULATIONS) * 100,
    rawDelta: duelScores.rawDelta,
  };
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const combos: Array<{
  gk: GoalkeeperMatchPlayer;
  striker: OutfieldMatchPlayer;
  targetRush: string;
  targetWait: string;
}> = [
  { gk: yashin,  striker: pele,            targetRush: "~40-45%", targetWait: "~45-50%" },
  { gk: yashin,  striker: kane,            targetRush: "~45-50%", targetWait: "~50-55%" },
  { gk: yashin,  striker: mediocreStriker, targetRush: "~55-60%", targetWait: "~60-65%" },
  { gk: goodGK,  striker: pele,            targetRush: "~30-35%", targetWait: "~35-40%" },
  { gk: goodGK,  striker: kane,            targetRush: "~38-43%", targetWait: "~43-48%" },
  { gk: goodGK,  striker: mediocreStriker, targetRush: "~48-53%", targetWait: "~53-58%" },
  { gk: weakGK,  striker: pele,            targetRush: "~20-25%", targetWait: "~25-30%" },
  { gk: weakGK,  striker: kane,            targetRush: "~28-33%", targetWait: "~33-38%" },
  { gk: weakGK,  striker: mediocreStriker, targetRush: "~38-43%", targetWait: "~43-48%" },
];

console.log(`\n${"=".repeat(78)}`);
console.log(`  def_bigchance — mapa de calibração (${SIMULATIONS.toLocaleString()} sims)`);
console.log(`${"=".repeat(78)}`);
console.log(`\n  ${"Goleiro".padEnd(16)} ${"Atacante".padEnd(22)} ${"Rush%".padEnd(8)} ${"Wait%".padEnd(8)} ${"Alvo Rush".padEnd(12)} Alvo Wait`);
console.log(`  ${"-".repeat(74)}`);

for (const { gk, striker, targetRush, targetWait } of combos) {
  const rush = simulate(gk, striker, "rush_save");
  const wait = simulate(gk, striker, "wait");

  const rushFlag = rush.savePct > 65 ? " ⚠️" : "";
  const waitFlag = wait.savePct > 70 ? " ⚠️" : "";

  console.log(
    `  ${gk.name.padEnd(16)} ${striker.name.padEnd(22)} ${rush.savePct.toFixed(1).padEnd(8)} ${wait.savePct.toFixed(1).padEnd(8)} ${targetRush.padEnd(12)} ${targetWait}${rushFlag}${waitFlag}`
  );
}