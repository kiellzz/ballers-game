import { describe, expect, it } from "vitest";

import { applyEventToPlayerMatchStats } from "../core/playerMatchStats";
import { calculatePlayerRating } from "../playerRating";
import { emptyStatLine, type MatchActors } from "../matchTypes";
import type {
  GoalkeeperMatchPlayer,
  OutfieldMatchPlayer,
  PlayerMatchStats,
  ShotResult,
} from "../matchTypes";

const baseShotResult: ShotResult = {
  happened: false,
  outcome: null,
  scoredBy: null,
  reboundKeptBy: null,
  setPieceAwarded: null,
};

const userDefender: OutfieldMatchPlayer = {
  id: 1,
  name: "User Defender",
  overall: 85,
  position: "CB",
  nationality: "Brazil",
  height: 186,
  role: "outfield",
  stats: {
    pace: 76,
    shooting: 52,
    passing: 74,
    dribbling: 68,
    defending: 88,
    physical: 84,
  },
};

const opponentDefender: OutfieldMatchPlayer = {
  id: 2,
  name: "Opponent Defender",
  overall: 84,
  position: "CB",
  nationality: "Argentina",
  height: 185,
  role: "outfield",
  stats: {
    pace: 75,
    shooting: 50,
    passing: 72,
    dribbling: 67,
    defending: 87,
    physical: 83,
  },
};

const userGoalkeeper: GoalkeeperMatchPlayer = {
  id: 3,
  name: "User GK",
  overall: 83,
  position: "GK",
  nationality: "Brazil",
  height: 190,
  role: "goalkeeper",
  stats: {
    diving: 82,
    reflexes: 84,
    speed: 60,
    handling: 81,
    kicking: 74,
    positioning: 82,
  },
};

const opponentGoalkeeper: GoalkeeperMatchPlayer = {
  id: 4,
  name: "Opponent GK",
  overall: 83,
  position: "GK",
  nationality: "Spain",
  height: 188,
  role: "goalkeeper",
  stats: {
    diving: 82,
    reflexes: 84,
    speed: 58,
    handling: 80,
    kicking: 72,
    positioning: 81,
  },
};

const actors: MatchActors = {
  userPlayer: userDefender,
  opponentPlayer: opponentDefender,
  userGoalkeeper,
  opponentGoalkeeper,
};

function createBaseStats(): PlayerMatchStats {
  return {
    "user:1": emptyStatLine(),
    "opponent:2": emptyStatLine(),
    "user:3": emptyStatLine(),
    "opponent:4": emptyStatLine(),
  };
}

describe("player action and duel tracking", () => {
  it("tracks mirrored actions and duels for an attacking success", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "dribble",
      outcome: "success",
      transition: null,
      shotResult: baseShotResult,
      actors,
      possession: "user",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["user:1"]).toMatchObject({
      successfulActions: 1,
      duelWins: 1,
      successfulDribbles: 1,
    });
    expect(nextStats["opponent:2"]).toMatchObject({
      failedActions: 1,
      duelLosses: 1,
    });
  });

  it("tracks mirrored actions and duels for an attacking high failure", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "dribble",
      outcome: "fail_high",
      transition: null,
      shotResult: baseShotResult,
      actors,
      possession: "user",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["user:1"]).toMatchObject({
      failedActions: 1,
      failedHighActions: 1,
      duelLosses: 1,
      failedDribbles: 1,
    });
    expect(nextStats["opponent:2"]).toMatchObject({
      successfulActions: 1,
      duelWins: 1,
    });
  });

  it("credits a successful defensive action to the actual defender and boosts rating", () => {
    const baseStats = createBaseStats();
    const nextStats = applyEventToPlayerMatchStats(baseStats, null, {
      action: "tackle",
      outcome: "success",
      transition: null,
      shotResult: baseShotResult,
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["user:1"]).toMatchObject({
      successfulActions: 1,
      defensiveActions: 1,
      tacklesWon: 1,
      duelWins: 1,
    });
    expect(nextStats["opponent:2"]).toMatchObject({
      failedActions: 1,
      duelLosses: 1,
    });
    expect(calculatePlayerRating(nextStats["user:1"], "CB")).toBeGreaterThan(
      calculatePlayerRating(baseStats["user:1"], "CB")
    );
  });

  it("credits a successful defensive action to the opponent defender as well", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "block",
      outcome: "success",
      transition: null,
      shotResult: baseShotResult,
      actors,
      possession: "user",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["opponent:2"]).toMatchObject({
      successfulActions: 1,
      defensiveActions: 1,
      blocks: 1,
      duelWins: 1,
    });
    expect(nextStats["user:1"]).toMatchObject({
      failedActions: 1,
      duelLosses: 1,
    });
  });

  it("rewards the opponent defender when the user loses possession on a failed pass", () => {
    const baseStats = createBaseStats();
    const nextStats = applyEventToPlayerMatchStats(baseStats, null, {
      action: "forward_pass",
      outcome: "fail",
      transition: {
        fromZone: "atk_mid",
        toZone: "atk_mid",
        fromLane: "center",
        toLane: "center",
        fromPossession: "user",
        toPossession: "opponent",
        createdBigChance: false,
        nextSituationType: "open_play",
        nextSetPieceType: null,
      },
      shotResult: baseShotResult,
      actors,
      possession: "user",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["opponent:2"]).toMatchObject({
      successfulActions: 1,
      duelWins: 1,
      defensiveActions: 1,
      interceptions: 1,
    });
    expect(calculatePlayerRating(nextStats["opponent:2"], "CB")).toBeGreaterThan(
      calculatePlayerRating(baseStats["opponent:2"], "CB")
    );
  });

  it("rewards the opponent defender for blocking a user shot", () => {
    const baseStats = createBaseStats();
    const nextStats = applyEventToPlayerMatchStats(baseStats, null, {
      action: "finish",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "blocked",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "user",
      isBigChance: true,
      setPieceType: null,
    });

    expect(nextStats["opponent:2"]).toMatchObject({
      defensiveActions: 1,
      blocks: 1,
    });
    expect(calculatePlayerRating(nextStats["opponent:2"], "CB")).toBeGreaterThan(
      calculatePlayerRating(baseStats["opponent:2"], "CB")
    );
  });

  it("counts an opponent save against the user goalkeeper as a shot attempt", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "wait",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "opponent",
      isBigChance: true,
      setPieceType: null,
    });

    expect(nextStats["opponent:2"]).toMatchObject({
      shotAttempts: 1,
      shotsOnTarget: 1,
    });
    expect(nextStats["user:3"].saves).toBe(1);
  });

  it("counts a blocked opponent shot as a shot attempt", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "block",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "blocked",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["opponent:2"]).toMatchObject({
      shotAttempts: 1,
      shotsBlocked: 1,
    });
    expect(nextStats["user:1"].blocks).toBe(1);
  });

  it("counts opponent free kicks and penalties as shot attempts", () => {
    const freeKickStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "wait",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "goal",
        scoredBy: "opponent",
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: "freekick",
    });

    const penaltyStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "wait",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: "penalty",
    });

    expect(freeKickStats["opponent:2"].shotAttempts).toBe(1);
    expect(penaltyStats["opponent:2"].shotAttempts).toBe(1);
    expect(penaltyStats["opponent:2"].penaltyMisses).toBe(1);
  });

  it("counts a penalty save_touch rebound as a penalty save for the goalkeeper", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "wait",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "rebound",
        scoredBy: null,
        reboundKeptBy: "opponent",
        setPieceAwarded: null,
      },
      actors,
      possession: "user",
      isBigChance: false,
      setPieceType: "penalty",
    });

    expect(nextStats["user:1"]).toMatchObject({
      shotAttempts: 1,
      shotsOnTarget: 1,
      penaltyMisses: 1,
    });
    expect(nextStats["opponent:4"]).toMatchObject({
      saves: 1,
      penaltySaves: 1,
    });
  });

  it("counts opponent misses and posts as shot attempts", () => {
    const missStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "wait",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "miss",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: null,
    });

    const postStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "wait",
      outcome: "success",
      transition: null,
      shotResult: {
        happened: true,
        outcome: "post",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: null,
    });

    expect(missStats["opponent:2"]).toMatchObject({
      shotAttempts: 1,
      shotsMissed: 1,
    });
    expect(postStats["opponent:2"]).toMatchObject({
      shotAttempts: 1,
      shotsMissed: 1,
    });
  });
});
