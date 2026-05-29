import { describe, expect, it } from "vitest";

import { resolveFoul } from "../fouls/foulEngine";
import type {
  DuelContext,
  GoalkeeperMatchPlayer,
  OutfieldMatchPlayer,
} from "../matchTypes";

const userAttacker: OutfieldMatchPlayer = {
  id: 1,
  name: "User Attacker",
  overall: 84,
  position: "LW",
  nationality: "Brazil",
  height: 176,
  role: "outfield",
  stats: {
    pace: 87,
    shooting: 78,
    passing: 76,
    dribbling: 85,
    defending: 42,
    physical: 68,
  },
};

const userDefender: OutfieldMatchPlayer = {
  id: 2,
  name: "User Defender",
  overall: 82,
  position: "RB",
  nationality: "Brazil",
  height: 180,
  role: "outfield",
  stats: {
    pace: 79,
    shooting: 52,
    passing: 74,
    dribbling: 70,
    defending: 83,
    physical: 77,
  },
};

const opponentAttacker: OutfieldMatchPlayer = {
  id: 10,
  name: "Opponent Attacker",
  overall: 84,
  position: "RW",
  nationality: "Argentina",
  height: 177,
  role: "outfield",
  stats: {
    pace: 86,
    shooting: 79,
    passing: 75,
    dribbling: 84,
    defending: 43,
    physical: 67,
  },
};

const opponentDefender: OutfieldMatchPlayer = {
  id: 11,
  name: "Opponent Defender",
  overall: 82,
  position: "LB",
  nationality: "Spain",
  height: 181,
  role: "outfield",
  stats: {
    pace: 80,
    shooting: 51,
    passing: 73,
    dribbling: 71,
    defending: 82,
    physical: 78,
  },
};

const userGoalkeeper: GoalkeeperMatchPlayer = {
  id: 90,
  name: "User Goalkeeper",
  overall: 83,
  position: "GK",
  nationality: "Brazil",
  height: 190,
  role: "goalkeeper",
  stats: {
    diving: 82,
    reflexes: 84,
    speed: 58,
    handling: 81,
    kicking: 73,
    positioning: 82,
  },
};

const opponentGoalkeeper: GoalkeeperMatchPlayer = {
  id: 91,
  name: "Opponent Goalkeeper",
  overall: 83,
  position: "GK",
  nationality: "Spain",
  height: 189,
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

function makeDribbleContext(possession: "user" | "opponent"): DuelContext {
  return {
    action: "dribble",
    zone: "atk_mid",
    lane: "left",
    possession,
    situationType: "open_play",
    setPieceType: null,
    actors:
      possession === "user"
        ? {
            userPlayer: userAttacker,
            opponentPlayer: opponentDefender,
            userGoalkeeper,
            opponentGoalkeeper,
          }
        : {
            userPlayer: userDefender,
            opponentPlayer: opponentAttacker,
            userGoalkeeper,
            opponentGoalkeeper,
          },
  };
}

describe("resolveFoul", () => {
  it("keeps drawn-foul probability side-neutral in mirrored contexts", () => {
    const random = () => 0.16;

    const userAttackResult = resolveFoul({
      context: makeDribbleContext("user"),
      outcome: "success",
      random,
    });

    const opponentAttackResult = resolveFoul({
      context: makeDribbleContext("opponent"),
      outcome: "success",
      random,
    });

    expect(userAttackResult.committed).toBe(true);
    expect(opponentAttackResult.committed).toBe(true);
    expect(userAttackResult.by).toBe("opponent");
    expect(opponentAttackResult.by).toBe("user");
  });
});
