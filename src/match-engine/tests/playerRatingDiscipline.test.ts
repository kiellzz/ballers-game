import { describe, expect, it } from "vitest";

import { applyEventToPlayerMatchStats } from "../core/playerMatchStats";
import { calculatePlayerRating } from "../playerRating";
import { emptyStatLine, type FoulResult, type MatchActors } from "../matchTypes";
import type {
  GoalkeeperMatchPlayer,
  OutfieldMatchPlayer,
} from "../matchTypes";

const userPlayer: OutfieldMatchPlayer = {
  id: 1,
  name: "User Midfielder",
  overall: 84,
  position: "CM",
  nationality: "Brazil",
  height: 180,
  role: "outfield",
  stats: {
    pace: 78,
    shooting: 74,
    passing: 84,
    dribbling: 81,
    defending: 72,
    physical: 76,
  },
};

const opponentPlayer: OutfieldMatchPlayer = {
  id: 2,
  name: "Opponent Midfielder",
  overall: 82,
  position: "CM",
  nationality: "Argentina",
  height: 178,
  role: "outfield",
  stats: {
    pace: 77,
    shooting: 71,
    passing: 81,
    dribbling: 79,
    defending: 70,
    physical: 74,
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
  userPlayer,
  opponentPlayer,
  userGoalkeeper,
  opponentGoalkeeper,
};

function createBaseStats() {
  return {
    "user:1": emptyStatLine(),
    "opponent:2": emptyStatLine(),
    "user:3": emptyStatLine(),
    "opponent:4": emptyStatLine(),
  };
}

function createFoulResult(overrides: Partial<FoulResult>): FoulResult {
  return {
    committed: true,
    by: "user",
    card: "none",
    playerId: null,
    playerSide: null,
    sentOff: false,
    dismissalType: "none",
    setPieceAwarded: "freekick",
    awardedTo: "opponent",
    description: "Foul awarded.",
    ...overrides,
  };
}

describe("discipline impact on player rating", () => {
  it("reduces rating after a yellow card", () => {
    const baseStats = createBaseStats();
    const nextStats = applyEventToPlayerMatchStats(baseStats, null, {
      action: "slide_tackle",
      outcome: "fail",
      transition: null,
      shotResult: {
        happened: false,
        outcome: null,
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      foulResult: createFoulResult({
        card: "yellow",
        playerId: 1,
        playerSide: "user",
      }),
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["user:1"].yellowCards).toBe(1);
    expect(calculatePlayerRating(nextStats["user:1"], "CM")).toBeLessThan(
      calculatePlayerRating(baseStats["user:1"], "CM")
    );
  });

  it("counts a second yellow as caution plus dismissal", () => {
    const nextStats = applyEventToPlayerMatchStats(createBaseStats(), null, {
      action: "slide_tackle",
      outcome: "fail_high",
      transition: null,
      shotResult: {
        happened: false,
        outcome: null,
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      foulResult: createFoulResult({
        card: "red",
        playerId: 1,
        playerSide: "user",
        sentOff: true,
        dismissalType: "second_yellow",
      }),
      actors,
      possession: "opponent",
      isBigChance: false,
      setPieceType: null,
    });

    expect(nextStats["user:1"]).toMatchObject({
      yellowCards: 1,
      dismissals: 1,
    });
  });
});
