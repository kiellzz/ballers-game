import { describe, expect, it } from "vitest";

import { resolveCard } from "../fouls/cardEngine";
import {
  createInitialDisciplinaryState,
  getDisciplinaryKey,
} from "../fouls/disciplineState";
import type {
  DuelContext,
  GoalkeeperMatchPlayer,
  MatchTeam,
  OutfieldMatchPlayer,
} from "../matchTypes";

const userDefender: OutfieldMatchPlayer = {
  id: 1,
  name: "User Defender",
  overall: 82,
  position: "CB",
  nationality: "Brazil",
  height: 186,
  role: "outfield",
  stats: {
    pace: 72,
    shooting: 40,
    passing: 68,
    dribbling: 60,
    defending: 84,
    physical: 81,
  },
};

const userTeammate2: OutfieldMatchPlayer = {
  ...userDefender,
  id: 2,
  name: "User Teammate 2",
};

const userTeammate3: OutfieldMatchPlayer = {
  ...userDefender,
  id: 3,
  name: "User Teammate 3",
};

const userTeammate4: OutfieldMatchPlayer = {
  ...userDefender,
  id: 4,
  name: "User Teammate 4",
};

const opponentAttacker: OutfieldMatchPlayer = {
  id: 10,
  name: "Opponent Attacker",
  overall: 84,
  position: "ST",
  nationality: "Argentina",
  height: 180,
  role: "outfield",
  stats: {
    pace: 85,
    shooting: 83,
    passing: 70,
    dribbling: 82,
    defending: 35,
    physical: 75,
  },
};

const userGoalkeeper: GoalkeeperMatchPlayer = {
  id: 90,
  name: "User Goalkeeper",
  overall: 85,
  position: "GK",
  nationality: "Brazil",
  height: 191,
  role: "goalkeeper",
  stats: {
    diving: 84,
    reflexes: 86,
    speed: 60,
    handling: 82,
    kicking: 74,
    positioning: 83,
  },
};

const opponentGoalkeeper: GoalkeeperMatchPlayer = {
  id: 91,
  name: "Opponent Goalkeeper",
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

const userTeam: MatchTeam = {
  teamId: "user",
  teamName: "User",
  starters: [
    userDefender,
    userTeammate2,
    userTeammate3,
    userTeammate4,
    userGoalkeeper,
  ],
};

const opponentTeam: MatchTeam = {
  teamId: "opponent",
  teamName: "Opponent",
  starters: [opponentAttacker, opponentGoalkeeper],
};

function makeSlideTackleContext(): DuelContext {
  return {
    action: "slide_tackle",
    zone: "def_third",
    lane: "center",
    possession: "opponent",
    situationType: "open_play",
    setPieceType: null,
    actors: {
      userPlayer: userDefender,
      opponentPlayer: opponentAttacker,
      userGoalkeeper,
      opponentGoalkeeper,
    },
  };
}

function makeGoalkeeperContext(): DuelContext {
  return {
    action: "rush_save",
    zone: "def_bigchance",
    lane: "center",
    possession: "opponent",
    situationType: "open_play",
    setPieceType: null,
    actors: {
      userPlayer: userGoalkeeper,
      opponentPlayer: opponentAttacker,
      userGoalkeeper,
      opponentGoalkeeper,
    },
  };
}

function makeDrawnFoulContext(possession: "user" | "opponent"): DuelContext {
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
            userPlayer: {
              ...opponentAttacker,
              id: userDefender.id,
              name: userDefender.name,
              position: "LW",
            },
            opponentPlayer: {
              ...userDefender,
              id: opponentAttacker.id,
              name: opponentAttacker.name,
              position: "RB",
            },
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

function mockRandomSequence(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

describe("resolveCard", () => {
  it("turns a second yellow into a red for outfield players", () => {
    const disciplinaryState = createInitialDisciplinaryState({
      userTeam,
      opponentTeam,
    });

    disciplinaryState[getDisciplinaryKey("user", userDefender.id)] = {
      yellowCards: 1,
      redCard: false,
      sentOff: false,
      dismissalType: "none",
    };

    const result = resolveCard({
      context: makeSlideTackleContext(),
      outcome: "fail",
      foulResult: {
        committed: true,
        by: "user",
        card: "none",
        playerId: null,
        playerSide: null,
        sentOff: false,
        dismissalType: "none",
        setPieceAwarded: "freekick",
        awardedTo: "opponent",
      },
      disciplinaryState,
      random: mockRandomSequence([0.99, 0]),
    });

    expect(result.card).toBe("red");
    expect(result.sentOff).toBe(true);
    expect(result.dismissalType).toBe("second_yellow");
    expect(
      result.disciplinaryState[getDisciplinaryKey("user", userDefender.id)]
    ).toMatchObject({
      yellowCards: 2,
      redCard: true,
      sentOff: true,
      dismissalType: "second_yellow",
    });
  });

  it("prevents goalkeepers from being sent off and caps them at one yellow", () => {
    const disciplinaryState = createInitialDisciplinaryState({
      userTeam: {
        ...userTeam,
        starters: [userGoalkeeper, userDefender],
      },
      opponentTeam,
    });

    const firstResult = resolveCard({
      context: makeGoalkeeperContext(),
      outcome: "fail_high",
      foulResult: {
        committed: true,
        by: "user",
        card: "none",
        playerId: null,
        playerSide: null,
        sentOff: false,
        dismissalType: "none",
        setPieceAwarded: "penalty",
        awardedTo: "opponent",
      },
      disciplinaryState,
      random: mockRandomSequence([0]),
    });

    expect(firstResult.card).toBe("yellow");
    expect(firstResult.sentOff).toBe(false);
    expect(
      firstResult.disciplinaryState[getDisciplinaryKey("user", userGoalkeeper.id)]
    ).toMatchObject({
      yellowCards: 1,
      redCard: false,
      sentOff: false,
    });

    const secondResult = resolveCard({
      context: makeGoalkeeperContext(),
      outcome: "fail_high",
      foulResult: {
        committed: true,
        by: "user",
        card: "none",
        playerId: null,
        playerSide: null,
        sentOff: false,
        dismissalType: "none",
        setPieceAwarded: "penalty",
        awardedTo: "opponent",
      },
      disciplinaryState: firstResult.disciplinaryState,
      random: mockRandomSequence([0]),
    });

    expect(secondResult.card).toBe("none");
    expect(secondResult.sentOff).toBe(false);
    expect(
      secondResult.disciplinaryState[getDisciplinaryKey("user", userGoalkeeper.id)]
    ).toMatchObject({
      yellowCards: 1,
      redCard: false,
      sentOff: false,
    });
  });

  it("downgrades a new sending-off incident to yellow when the team already has three reds", () => {
    const disciplinaryState = createInitialDisciplinaryState({
      userTeam,
      opponentTeam,
    });

    for (const player of [userTeammate2, userTeammate3, userTeammate4]) {
      disciplinaryState[getDisciplinaryKey("user", player.id)] = {
        yellowCards: 0,
        redCard: true,
        sentOff: true,
        dismissalType: "straight_red",
      };
    }

    const result = resolveCard({
      context: makeSlideTackleContext(),
      outcome: "fail_high",
      foulResult: {
        committed: true,
        by: "user",
        card: "none",
        playerId: null,
        playerSide: null,
        sentOff: false,
        dismissalType: "none",
        setPieceAwarded: "freekick",
        awardedTo: "opponent",
      },
      disciplinaryState,
      random: mockRandomSequence([0]),
    });

    expect(result.card).toBe("yellow");
    expect(result.sentOff).toBe(false);
    expect(result.dismissalType).toBe("none");
    expect(
      result.disciplinaryState[getDisciplinaryKey("user", userDefender.id)]
    ).toMatchObject({
      yellowCards: 1,
      redCard: false,
      sentOff: false,
      dismissalType: "none",
    });
  });

  it("can card the defending side on drawn fouls for both teams", () => {
    const userAttackResult = resolveCard({
      context: makeDrawnFoulContext("user"),
      outcome: "success",
      foulResult: {
        committed: true,
        by: "opponent",
        card: "none",
        playerId: null,
        playerSide: null,
        sentOff: false,
        dismissalType: "none",
        setPieceAwarded: "freekick",
        awardedTo: "user",
      },
      disciplinaryState: createInitialDisciplinaryState({
        userTeam,
        opponentTeam,
      }),
      random: mockRandomSequence([0.99, 0.1]),
    });

    expect(userAttackResult.card).toBe("yellow");
    expect(userAttackResult.playerSide).toBe("opponent");

    const opponentAttackResult = resolveCard({
      context: makeDrawnFoulContext("opponent"),
      outcome: "success",
      foulResult: {
        committed: true,
        by: "user",
        card: "none",
        playerId: null,
        playerSide: null,
        sentOff: false,
        dismissalType: "none",
        setPieceAwarded: "freekick",
        awardedTo: "opponent",
      },
      disciplinaryState: createInitialDisciplinaryState({
        userTeam,
        opponentTeam,
      }),
      random: mockRandomSequence([0.99, 0.1]),
    });

    expect(opponentAttackResult.card).toBe("yellow");
    expect(opponentAttackResult.playerSide).toBe("user");
  });
});
