import { describe, expect, it } from "vitest";

import { createInitialMatchState } from "../core/matchEngine";
import { getDisciplinaryKey } from "../fouls/disciplineState";
import type {
  GoalkeeperMatchPlayer,
  MatchTeam,
  OutfieldMatchPlayer,
} from "../matchTypes";
import {
  applyPendingOpponentSubstitutions,
  applyPendingUserSubstitutions,
  getDisplayedUserStarters,
  getUserMatchParticipants,
  maybeQueueOpponentSubstitution,
  requestUserSubstitution,
} from "../subs/substitutionEngine";

const userGoalkeeper: GoalkeeperMatchPlayer = {
  id: 1,
  name: "User Goalkeeper",
  overall: 84,
  position: "GK",
  nationality: "Brazil",
  height: 190,
  role: "goalkeeper",
  stats: {
    diving: 84,
    reflexes: 86,
    speed: 52,
    handling: 83,
    kicking: 78,
    positioning: 85,
  },
};

const userStarter: OutfieldMatchPlayer = {
  id: 9,
  name: "User Starter",
  overall: 82,
  position: "ST",
  lineupPosition: "ST",
  nationality: "Brazil",
  height: 182,
  role: "outfield",
  stats: {
    pace: 83,
    shooting: 84,
    passing: 72,
    dribbling: 80,
    defending: 38,
    physical: 76,
  },
};

const userMidfielder: OutfieldMatchPlayer = {
  ...userStarter,
  id: 8,
  name: "User Midfielder",
  position: "CM",
  lineupPosition: "CM",
  stats: {
    pace: 74,
    shooting: 70,
    passing: 81,
    dribbling: 79,
    defending: 71,
    physical: 73,
  },
};

const benchStriker: OutfieldMatchPlayer = {
  ...userStarter,
  id: 19,
  name: "Bench Striker",
  overall: 79,
  lineupPosition: undefined,
};

const opponentGoalkeeper: GoalkeeperMatchPlayer = {
  ...userGoalkeeper,
  id: 91,
  name: "Opponent Goalkeeper",
  nationality: "Spain",
};

const opponentStarter: OutfieldMatchPlayer = {
  ...userStarter,
  id: 29,
  name: "Opponent Starter",
  nationality: "Argentina",
};

const opponentMidfielder: OutfieldMatchPlayer = {
  ...userMidfielder,
  id: 28,
  name: "Opponent Midfielder",
  nationality: "Argentina",
};

const opponentWinger: OutfieldMatchPlayer = {
  ...userStarter,
  id: 27,
  name: "Opponent Winger",
  position: "RW",
  lineupPosition: "RW",
  nationality: "Argentina",
};

const opponentBenchStriker: OutfieldMatchPlayer = {
  ...benchStriker,
  id: 39,
  name: "Opponent Bench Striker",
  nationality: "Argentina",
};

const opponentBenchMidfielder: OutfieldMatchPlayer = {
  ...userMidfielder,
  id: 38,
  name: "Opponent Bench Midfielder",
  lineupPosition: undefined,
  nationality: "Argentina",
};

const userTeam: MatchTeam = {
  teamId: "user",
  teamName: "User",
  starters: [userGoalkeeper, userStarter, userMidfielder],
};

const opponentTeam: MatchTeam = {
  teamId: "opponent",
  teamName: "Opponent",
  starters: [opponentGoalkeeper, opponentStarter, opponentMidfielder, opponentWinger],
};

function createState() {
  return createInitialMatchState({
    userTeam,
    opponentTeam,
    userBench: [benchStriker],
    random: () => 0.5,
  });
}

function applyQueuedSubs(state: ReturnType<typeof createState>) {
  const applied = applyPendingUserSubstitutions({
    userTeam: state.userTeam,
    substitutionState: state.substitutionState,
    disciplinaryState: state.disciplinaryState,
  });

  return {
    ...state,
    userTeam: applied.userTeam,
    substitutionState: applied.substitutionState,
  };
}

describe("substitutionEngine", () => {
  it("keeps the current starter displayed until the queued substitution is applied", () => {
    const state = createState();
    const queued = requestUserSubstitution({
      state,
      outPlayerId: userStarter.id,
      inPlayerId: benchStriker.id,
    });

    expect(queued.ok).toBe(true);
    expect(
      getDisplayedUserStarters(queued.state).some(
        (player) => player.id === userStarter.id
      )
    ).toBe(true);
    expect(
      getDisplayedUserStarters(queued.state).some(
        (player) => player.id === benchStriker.id
      )
    ).toBe(false);
    expect(queued.state.substitutionState.userBench).toHaveLength(0);

    const appliedState = applyQueuedSubs(queued.state);
    const participantIds = getUserMatchParticipants(appliedState).map(
      (player) => player.id
    );

    expect(appliedState.userTeam.starters.some((player) => player.id === benchStriker.id)).toBe(
      true
    );
    expect(
      getDisplayedUserStarters(appliedState).some(
        (player) => player.id === benchStriker.id
      )
    ).toBe(true);
    expect(participantIds).toContain(userStarter.id);
    expect(participantIds).toContain(benchStriker.id);
    expect(appliedState.playerMatchStats[`user:${userStarter.id}`]).toBeDefined();
    expect(appliedState.playerMatchStats[`user:${benchStriker.id}`]).toBeDefined();
  });

  it("cancels a queued substitution if the outgoing player is sent off before the next situation", () => {
    const state = createState();
    const queued = requestUserSubstitution({
      state,
      outPlayerId: userStarter.id,
      inPlayerId: benchStriker.id,
    });

    expect(queued.ok).toBe(true);

    const disciplinaryKey = getDisciplinaryKey("user", userStarter.id);
    const sentOffState = {
      ...queued.state,
      disciplinaryState: {
        ...queued.state.disciplinaryState,
        [disciplinaryKey]: {
          ...queued.state.disciplinaryState[disciplinaryKey],
          redCard: true,
          sentOff: true,
          dismissalType: "straight_red" as const,
        },
      },
    };

    const applied = applyPendingUserSubstitutions({
      userTeam: sentOffState.userTeam,
      substitutionState: sentOffState.substitutionState,
      disciplinaryState: sentOffState.disciplinaryState,
    });

    expect(applied.userTeam.starters.some((player) => player.id === benchStriker.id)).toBe(
      false
    );
    expect(applied.substitutionState.completedUserSubstitutions).toHaveLength(0);
    expect(
      applied.substitutionState.userBench.some(
        (player) => player.id === benchStriker.id
      )
    ).toBe(true);
    expect(applied.substitutionState.substitutedOutUserPlayerIds).not.toContain(
      userStarter.id
    );
    expect(applied.substitutionState.substitutedInUserPlayerIds).not.toContain(
      benchStriker.id
    );
  });

  it("does not display a queued substitution as active once the match is finished", () => {
    const state = createState();
    const queued = requestUserSubstitution({
      state,
      outPlayerId: userStarter.id,
      inPlayerId: benchStriker.id,
    });

    const finishedState = {
      ...queued.state,
      context: {
        ...queued.state.context,
        phase: "finished" as const,
      },
    };

    const displayedIds = getDisplayedUserStarters(finishedState).map(
      (player) => player.id
    );

    expect(displayedIds).toContain(userStarter.id);
    expect(displayedIds).not.toContain(benchStriker.id);
  });

  it("does not queue opponent substitutions before the 46th minute", () => {
    const state = createInitialMatchState({
      userTeam,
      opponentTeam,
      opponentBench: [opponentBenchStriker],
      random: () => 0.1,
    });

    const queued = maybeQueueOpponentSubstitution({
      state: {
        ...state,
        context: {
          ...state.context,
          clock: { minute: 45 },
        },
      },
      random: () => 0.1,
    });

    expect(queued.substitutionState.pendingOpponentSubstitutions).toHaveLength(0);
  });

  it("prioritizes low-rated and yellow-carded opponent players for substitution", () => {
    const state = createInitialMatchState({
      userTeam,
      opponentTeam,
      opponentBench: [opponentBenchStriker, opponentBenchMidfielder],
      random: () => 0.1,
    });

    const yellowKey = getDisciplinaryKey("opponent", opponentStarter.id);
    const ratedState = {
      ...state,
      context: {
        ...state.context,
        clock: { minute: 61 },
      },
      playerMatchStats: {
        ...state.playerMatchStats,
        [`opponent:${opponentStarter.id}`]: {
          ...state.playerMatchStats[`opponent:${opponentStarter.id}`],
          failedActions: 12,
          lostPossessions: 8,
          failedDribbles: 4,
          yellowCards: 1,
        },
        [`opponent:${opponentMidfielder.id}`]: {
          ...state.playerMatchStats[`opponent:${opponentMidfielder.id}`],
          goals: 1,
          successfulActions: 9,
          successfulPasses: 18,
        },
        [`opponent:${opponentWinger.id}`]: {
          ...state.playerMatchStats[`opponent:${opponentWinger.id}`],
          assists: 1,
          successfulDribbles: 3,
          successfulActions: 8,
        },
      },
      disciplinaryState: {
        ...state.disciplinaryState,
        [yellowKey]: {
          ...state.disciplinaryState[yellowKey],
          yellowCards: 1,
        },
      },
    };

    const queued = maybeQueueOpponentSubstitution({
      state: ratedState,
      random: () => 0.1,
    });

    expect(queued.substitutionState.pendingOpponentSubstitutions).toHaveLength(1);
    expect(
      queued.substitutionState.pendingOpponentSubstitutions[0]?.outPlayer.id
    ).toBe(opponentStarter.id);

    const applied = applyPendingOpponentSubstitutions({
      opponentTeam: queued.opponentTeam,
      substitutionState: queued.substitutionState,
      disciplinaryState: queued.disciplinaryState,
    });

    expect(
      applied.opponentTeam.starters.some(
        (player) => player.id === opponentBenchStriker.id
      )
    ).toBe(true);
  });

  it("respects the minimum interval between opponent substitutions", () => {
    const state = createInitialMatchState({
      userTeam,
      opponentTeam,
      opponentBench: [opponentBenchStriker, opponentBenchMidfielder],
      random: () => 0.1,
    });

    const queued = maybeQueueOpponentSubstitution({
      state: {
        ...state,
        context: {
          ...state.context,
          clock: { minute: 70 },
        },
      },
      random: () => 0.1,
    });

    expect(queued.substitutionState.opponentSubstitutionWindows).toContain(70);

    const blocked = maybeQueueOpponentSubstitution({
      state: {
        ...queued,
        context: {
          ...queued.context,
          clock: { minute: 75 },
        },
        substitutionState: {
          ...queued.substitutionState,
          pendingOpponentSubstitutions: [],
        },
      },
      random: () => 0.1,
    });

    expect(blocked.substitutionState.pendingOpponentSubstitutions).toHaveLength(0);
  });
});
