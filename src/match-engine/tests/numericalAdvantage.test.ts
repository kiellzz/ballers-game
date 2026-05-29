import { describe, expect, it } from "vitest";

import { resolveDuel } from "../balancing/duelEngine";
import type {
  DuelContext,
  GoalkeeperMatchPlayer,
  OutfieldMatchPlayer,
} from "../matchTypes";

const attacker: OutfieldMatchPlayer = {
  id: 1,
  name: "Attacker",
  overall: 84,
  position: "CAM",
  nationality: "Brazil",
  height: 178,
  role: "outfield",
  stats: {
    pace: 82,
    shooting: 80,
    passing: 84,
    dribbling: 86,
    defending: 42,
    physical: 71,
  },
};

const defender: OutfieldMatchPlayer = {
  id: 2,
  name: "Defender",
  overall: 82,
  position: "CB",
  nationality: "Italy",
  height: 186,
  role: "outfield",
  stats: {
    pace: 73,
    shooting: 38,
    passing: 70,
    dribbling: 58,
    defending: 85,
    physical: 82,
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
    speed: 55,
    handling: 80,
    kicking: 72,
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
    speed: 55,
    handling: 80,
    kicking: 72,
    positioning: 82,
  },
};

function makeContext(
  userSentOffCount: number,
  opponentSentOffCount: number
): DuelContext {
  return {
    action: "dribble",
    zone: "atk_mid",
    lane: "center",
    possession: "user",
    situationType: "open_play",
    setPieceType: null,
    actors: {
      userPlayer: attacker,
      opponentPlayer: defender,
      userGoalkeeper,
      opponentGoalkeeper,
    },
    numericalAdvantage: {
      userSentOffCount,
      opponentSentOffCount,
    },
  };
}

describe("numerical advantage in duels", () => {
  it("scales linearly in favour of the team with more players", () => {
    const even = resolveDuel(makeContext(0, 0)).rawDelta;
    const plusOne = resolveDuel(makeContext(0, 1)).rawDelta;
    const plusTwo = resolveDuel(makeContext(0, 2)).rawDelta;

    expect(plusOne - even).toBeCloseTo(1.35, 5);
    expect(plusTwo - plusOne).toBeCloseTo(1.35, 5);
  });

  it("hurts the side that is a player down", () => {
    const even = resolveDuel(makeContext(0, 0)).rawDelta;
    const downOne = resolveDuel(makeContext(1, 0)).rawDelta;

    expect(downOne).toBeLessThan(even);
    expect(even - downOne).toBeCloseTo(1.35, 5);
  });
});
