import {
  createEmptyPlayerDiscipline,
  getDisciplinaryKey,
  getPlayerDisciplinaryState,
} from "../fouls/disciplineState";
import { calculatePlayerRating } from "../playerRating";
import {
  emptyStatLine,
  type MatchPlayer,
  type MatchState,
  type MatchSubstitution,
  type MatchSubstitutionState,
  type MatchTeam,
  type PlayerMatchStatLine,
} from "../matchTypes";

export const DEFAULT_MAX_USER_SUBSTITUTIONS = 3;
export const DEFAULT_MAX_OPPONENT_SUBSTITUTIONS = 3;
const MIN_OPPONENT_SUB_MINUTE = 46;
const MIN_OPPONENT_SUB_INTERVAL = 8;
const OPPONENT_SUBSTITUTION_RANDOM_CHANCE = 0.45;

export function createInitialSubstitutionState(params?: {
  userBench?: MatchPlayer[];
  opponentBench?: MatchPlayer[];
  maxUserSubstitutions?: number;
  maxOpponentSubstitutions?: number;
}): MatchSubstitutionState {
  return {
    maxUserSubstitutions:
      params?.maxUserSubstitutions ?? DEFAULT_MAX_USER_SUBSTITUTIONS,
    userBench: params?.userBench ?? [],
    pendingUserSubstitutions: [],
    completedUserSubstitutions: [],
    substitutedOutUserPlayerIds: [],
    substitutedInUserPlayerIds: [],
    maxOpponentSubstitutions:
      params?.maxOpponentSubstitutions ?? DEFAULT_MAX_OPPONENT_SUBSTITUTIONS,
    opponentBench: params?.opponentBench ?? [],
    pendingOpponentSubstitutions: [],
    completedOpponentSubstitutions: [],
    substitutedOutOpponentPlayerIds: [],
    substitutedInOpponentPlayerIds: [],
    opponentSubstitutionWindows: [],
  };
}

export function getUserSubstitutionsUsed(
  substitutionState: MatchSubstitutionState
): number {
  return (
    substitutionState.completedUserSubstitutions.length +
    substitutionState.pendingUserSubstitutions.length
  );
}

export function getUserSubstitutionsLeft(
  substitutionState: MatchSubstitutionState
): number {
  return Math.max(
    0,
    substitutionState.maxUserSubstitutions -
      getUserSubstitutionsUsed(substitutionState)
  );
}

export function getOpponentSubstitutionsUsed(
  substitutionState: MatchSubstitutionState
): number {
  return (
    substitutionState.completedOpponentSubstitutions.length +
    substitutionState.pendingOpponentSubstitutions.length
  );
}

export function getSubstitutedOutUserPlayerIds(
  substitutionState: MatchSubstitutionState
): Set<number> {
  return new Set(substitutionState.substitutedOutUserPlayerIds);
}

export function getSubstitutedInUserPlayerIds(
  substitutionState: MatchSubstitutionState
): Set<number> {
  return new Set(substitutionState.substitutedInUserPlayerIds);
}

export function getSubstitutedOutOpponentPlayerIds(
  substitutionState: MatchSubstitutionState
): Set<number> {
  return new Set(substitutionState.substitutedOutOpponentPlayerIds);
}

export function getSubstitutedInOpponentPlayerIds(
  substitutionState: MatchSubstitutionState
): Set<number> {
  return new Set(substitutionState.substitutedInOpponentPlayerIds);
}

export function canMatchPlayerPlayInPosition(
  player: MatchPlayer,
  slotPosition: string
): boolean {
  const target = normalizePosition(slotPosition);
  const positions = [player.position, ...(player.secondaryPositions ?? [])];

  return positions.some((position) => normalizePosition(position) === target);
}

export function getDisplayedUserStarters(state: MatchState): MatchPlayer[] {
  return state.userTeam.starters;
}

export function getDisplayedOpponentStarters(state: MatchState): MatchPlayer[] {
  return state.opponentTeam.starters;
}

export function getUserMatchParticipants(state: MatchState): MatchPlayer[] {
  return uniquePlayers([
    ...state.userTeam.starters,
    ...state.substitutionState.completedUserSubstitutions.flatMap(
      ({ outPlayer, inPlayer }) => [outPlayer, inPlayer]
    ),
  ]);
}

export function getOpponentMatchParticipants(state: MatchState): MatchPlayer[] {
  return uniquePlayers([
    ...state.opponentTeam.starters,
    ...state.substitutionState.completedOpponentSubstitutions.flatMap(
      ({ outPlayer, inPlayer }) => [outPlayer, inPlayer]
    ),
  ]);
}

export function requestUserSubstitution(params: {
  state: MatchState;
  outPlayerId: number;
  inPlayerId: number;
}): {
  state: MatchState;
  ok: boolean;
  error: string | null;
} {
  const { state, outPlayerId, inPlayerId } = params;
  const error = getUserSubstitutionError(params);

  if (error) {
    return { state, ok: false, error };
  }

  const displayedStarters = getDisplayedUserStarters(state);
  const outPlayer = displayedStarters.find((player) => player.id === outPlayerId)!;
  const benchPlayer = state.substitutionState.userBench.find(
    (player) => player.id === inPlayerId
  )!;
  const inPlayer: MatchPlayer = {
    ...benchPlayer,
    lineupPosition: outPlayer.lineupPosition ?? outPlayer.position,
  };
  const substitution: MatchSubstitution = {
    outPlayer,
    inPlayer,
    requestedAtTurn: state.context.turn,
    requestedAtMinute: state.context.clock.minute,
    appliedAtMinute: null,
  };
  const disciplinedKey = getDisciplinaryKey("user", inPlayer.id);

  return {
    ok: true,
    error: null,
    state: {
      ...state,
      playerMatchStats: {
        ...state.playerMatchStats,
        [`user:${inPlayer.id}`]:
          state.playerMatchStats[`user:${inPlayer.id}`] ??
          createIncomingPlayerStatLine(inPlayer, {
            scoreForSide: state.context.score.opponent,
          }),
      },
      disciplinaryState: {
        ...state.disciplinaryState,
        [disciplinedKey]:
          state.disciplinaryState[disciplinedKey] ??
          createEmptyPlayerDiscipline(),
      },
      substitutionState: {
        ...state.substitutionState,
        userBench: state.substitutionState.userBench.filter(
          (player) => player.id !== inPlayerId
        ),
        pendingUserSubstitutions: [
          ...state.substitutionState.pendingUserSubstitutions,
          substitution,
        ],
        substitutedOutUserPlayerIds: [
          ...state.substitutionState.substitutedOutUserPlayerIds,
          outPlayerId,
        ],
        substitutedInUserPlayerIds: [
          ...state.substitutionState.substitutedInUserPlayerIds,
          inPlayerId,
        ],
      },
    },
  };
}

export function applyPendingUserSubstitutions(params: {
  userTeam: MatchTeam;
  substitutionState: MatchSubstitutionState;
  disciplinaryState?: MatchState["disciplinaryState"];
  currentMinute?: number;
}): {
  userTeam: MatchTeam;
  substitutionState: MatchSubstitutionState;
} {
  const { userTeam, substitutionState, disciplinaryState, currentMinute } = params;

  if (substitutionState.pendingUserSubstitutions.length === 0) {
    return { userTeam, substitutionState };
  }

  const { validSubstitutions, canceledSubstitutions } =
    splitPendingUserSubstitutions({
      substitutions: substitutionState.pendingUserSubstitutions,
      disciplinaryState,
    });

  const canceledOutIds = new Set(
    canceledSubstitutions.map(({ outPlayer }) => outPlayer.id)
  );
  const canceledInIds = new Set(
    canceledSubstitutions.map(({ inPlayer }) => inPlayer.id)
  );
  const completedSubstitutions = validSubstitutions.map((substitution) => ({
    ...substitution,
    appliedAtMinute:
      currentMinute ??
      substitution.appliedAtMinute ??
      substitution.requestedAtMinute,
  }));

  return {
    userTeam: {
      ...userTeam,
      starters: applySubstitutionsToStarters(
        userTeam.starters,
        validSubstitutions
      ),
    },
    substitutionState: {
      ...substitutionState,
      userBench: [
        ...substitutionState.userBench,
        ...canceledSubstitutions.map(({ inPlayer }) => restoreBenchPlayer(inPlayer)),
      ],
      completedUserSubstitutions: [
        ...substitutionState.completedUserSubstitutions,
        ...completedSubstitutions,
      ],
      pendingUserSubstitutions: [],
      substitutedOutUserPlayerIds: substitutionState.substitutedOutUserPlayerIds.filter(
        (playerId) => !canceledOutIds.has(playerId)
      ),
      substitutedInUserPlayerIds: substitutionState.substitutedInUserPlayerIds.filter(
        (playerId) => !canceledInIds.has(playerId)
      ),
    },
  };
}

export function maybeQueueOpponentSubstitution(params: {
  state: MatchState;
  random?: () => number;
}): MatchState {
  const { state, random = Math.random } = params;
  const substitution = selectOpponentSubstitutionCandidate({ state, random });

  if (!substitution) {
    return state;
  }

  const disciplinedKey = getDisciplinaryKey("opponent", substitution.inPlayer.id);

  return {
    ...state,
    playerMatchStats: {
      ...state.playerMatchStats,
      [`opponent:${substitution.inPlayer.id}`]:
        state.playerMatchStats[`opponent:${substitution.inPlayer.id}`] ??
        createIncomingPlayerStatLine(substitution.inPlayer, {
          scoreForSide: state.context.score.user,
        }),
    },
    disciplinaryState: {
      ...state.disciplinaryState,
      [disciplinedKey]:
        state.disciplinaryState[disciplinedKey] ?? createEmptyPlayerDiscipline(),
    },
    substitutionState: {
      ...state.substitutionState,
      opponentBench: state.substitutionState.opponentBench.filter(
        (player) => player.id !== substitution.inPlayer.id
      ),
      pendingOpponentSubstitutions: [
        ...state.substitutionState.pendingOpponentSubstitutions,
        substitution,
      ],
      substitutedOutOpponentPlayerIds: [
        ...state.substitutionState.substitutedOutOpponentPlayerIds,
        substitution.outPlayer.id,
      ],
      substitutedInOpponentPlayerIds: [
        ...state.substitutionState.substitutedInOpponentPlayerIds,
        substitution.inPlayer.id,
      ],
      opponentSubstitutionWindows: [
        ...state.substitutionState.opponentSubstitutionWindows,
        state.context.clock.minute,
      ],
    },
  };
}

export function applyPendingOpponentSubstitutions(params: {
  opponentTeam: MatchTeam;
  substitutionState: MatchSubstitutionState;
  disciplinaryState?: MatchState["disciplinaryState"];
  currentMinute?: number;
}): {
  opponentTeam: MatchTeam;
  substitutionState: MatchSubstitutionState;
} {
  const { opponentTeam, substitutionState, disciplinaryState, currentMinute } = params;

  if (substitutionState.pendingOpponentSubstitutions.length === 0) {
    return { opponentTeam, substitutionState };
  }

  const { validSubstitutions, canceledSubstitutions } =
    splitPendingSubstitutions({
      substitutions: substitutionState.pendingOpponentSubstitutions,
      disciplinaryState,
      side: "opponent",
    });

  const canceledOutIds = new Set(
    canceledSubstitutions.map(({ outPlayer }) => outPlayer.id)
  );
  const canceledInIds = new Set(
    canceledSubstitutions.map(({ inPlayer }) => inPlayer.id)
  );
  const completedSubstitutions = validSubstitutions.map((substitution) => ({
    ...substitution,
    appliedAtMinute:
      currentMinute ??
      substitution.appliedAtMinute ??
      substitution.requestedAtMinute,
  }));

  return {
    opponentTeam: {
      ...opponentTeam,
      starters: applySubstitutionsToStarters(
        opponentTeam.starters,
        validSubstitutions
      ),
    },
    substitutionState: {
      ...substitutionState,
      opponentBench: [
        ...substitutionState.opponentBench,
        ...canceledSubstitutions.map(({ inPlayer }) => restoreBenchPlayer(inPlayer)),
      ],
      completedOpponentSubstitutions: [
        ...substitutionState.completedOpponentSubstitutions,
        ...completedSubstitutions,
      ],
      pendingOpponentSubstitutions: [],
      substitutedOutOpponentPlayerIds:
        substitutionState.substitutedOutOpponentPlayerIds.filter(
          (playerId) => !canceledOutIds.has(playerId)
        ),
      substitutedInOpponentPlayerIds:
        substitutionState.substitutedInOpponentPlayerIds.filter(
          (playerId) => !canceledInIds.has(playerId)
        ),
    },
  };
}

function getUserSubstitutionError(params: {
  state: MatchState;
  outPlayerId: number;
  inPlayerId: number;
}): string | null {
  const { state, outPlayerId, inPlayerId } = params;

  if (state.context.phase === "finished") {
    return "The match is already finished.";
  }

  if (getUserSubstitutionsLeft(state.substitutionState) <= 0) {
    return "No substitutions remaining.";
  }

  const displayedStarters = getDisplayedUserStarters(state);
  const outPlayer = displayedStarters.find((player) => player.id === outPlayerId);

  if (!outPlayer) {
    return "The selected player is not in the active lineup.";
  }

  if (
    state.substitutionState.pendingUserSubstitutions.some(
      ({ inPlayer }) => inPlayer.id === outPlayerId
    )
  ) {
    return "A player queued to enter cannot leave before the next situation.";
  }

  if (
    getPlayerDisciplinaryState(
      state.disciplinaryState,
      "user",
      outPlayerId
    ).sentOff
  ) {
    return "Sent-off players cannot be substituted.";
  }

  const inPlayer = state.substitutionState.userBench.find(
    (player) => player.id === inPlayerId
  );

  if (!inPlayer) {
    return "The selected bench player is not available.";
  }

  const slotPosition = outPlayer.lineupPosition ?? outPlayer.position;

  if (!canMatchPlayerPlayInPosition(inPlayer, slotPosition)) {
    return `${inPlayer.name} cannot play ${slotPosition}.`;
  }

  return null;
}

function applySubstitutionsToStarters(
  starters: MatchPlayer[],
  substitutions: MatchSubstitution[]
): MatchPlayer[] {
  return substitutions.reduce(
    (currentStarters, { outPlayer, inPlayer }) =>
      currentStarters.map((starter) =>
        starter.id === outPlayer.id ? inPlayer : starter
      ),
    starters
  );
}

function splitPendingUserSubstitutions(params: {
  substitutions: MatchSubstitution[];
  disciplinaryState?: MatchState["disciplinaryState"];
}): {
  validSubstitutions: MatchSubstitution[];
  canceledSubstitutions: MatchSubstitution[];
} {
  const { substitutions, disciplinaryState } = params;

  return splitPendingSubstitutions({
    substitutions,
    disciplinaryState,
    side: "user",
  });
}

function createIncomingPlayerStatLine(
  player: MatchPlayer,
  params: { scoreForSide: number }
): PlayerMatchStatLine {
  const stats = emptyStatLine();
  const position = (player.lineupPosition ?? player.position).toLowerCase();

  stats.teamGoalsConceded = params.scoreForSide;
  stats.cleanSheetBonusEligible =
    position === "gk" ||
    position === "cb" ||
    position === "lb" ||
    position === "rb"
      ? 1
      : 0;

  return stats;
}

function uniquePlayers(players: MatchPlayer[]): MatchPlayer[] {
  const ids = new Set<number>();

  return players.filter((player) => {
    if (ids.has(player.id)) {
      return false;
    }

    ids.add(player.id);
    return true;
  });
}

function restoreBenchPlayer(player: MatchPlayer): MatchPlayer {
  return {
    ...player,
    lineupPosition: undefined,
  };
}

function normalizePosition(position: string): string {
  return position.trim().toUpperCase();
}

function splitPendingSubstitutions(params: {
  substitutions: MatchSubstitution[];
  disciplinaryState?: MatchState["disciplinaryState"];
  side: "user" | "opponent";
}): {
  validSubstitutions: MatchSubstitution[];
  canceledSubstitutions: MatchSubstitution[];
} {
  const { substitutions, disciplinaryState, side } = params;

  if (!disciplinaryState) {
    return {
      validSubstitutions: substitutions,
      canceledSubstitutions: [],
    };
  }

  return substitutions.reduce<{
    validSubstitutions: MatchSubstitution[];
    canceledSubstitutions: MatchSubstitution[];
  }>(
    (result, substitution) => {
      const outPlayerDiscipline = getPlayerDisciplinaryState(
        disciplinaryState,
        side,
        substitution.outPlayer.id
      );

      if (outPlayerDiscipline.sentOff) {
        result.canceledSubstitutions.push(substitution);
      } else {
        result.validSubstitutions.push(substitution);
      }

      return result;
    },
    {
      validSubstitutions: [],
      canceledSubstitutions: [],
    }
  );
}

function selectOpponentSubstitutionCandidate(params: {
  state: MatchState;
  random: () => number;
}): MatchSubstitution | null {
  const { state, random } = params;
  const minute = state.context.clock.minute;
  const substitutionState = state.substitutionState;

  if (state.context.phase === "finished") {
    return null;
  }

  if (minute < MIN_OPPONENT_SUB_MINUTE) {
    return null;
  }

  if (getOpponentSubstitutionsLeft(substitutionState) <= 0) {
    return null;
  }

  if (substitutionState.pendingOpponentSubstitutions.length > 0) {
    return null;
  }

  const lastWindow =
    substitutionState.opponentSubstitutionWindows[
      substitutionState.opponentSubstitutionWindows.length - 1
    ];

  if (
    lastWindow != null &&
    minute - lastWindow < MIN_OPPONENT_SUB_INTERVAL
  ) {
    return null;
  }

  if (random() > OPPONENT_SUBSTITUTION_RANDOM_CHANCE) {
    return null;
  }

  const starterCandidates = state.opponentTeam.starters
    .map((player) => ({
      player,
      rating: getMatchPlayerRating({
        state,
        side: "opponent",
        player,
      }),
      discipline: getPlayerDisciplinaryState(
        state.disciplinaryState,
        "opponent",
        player.id
      ),
    }))
    .filter(({ discipline }) => !discipline.sentOff)
    .filter(
      ({ player }) =>
        !substitutionState.pendingOpponentSubstitutions.some(
          ({ inPlayer }) => inPlayer.id === player.id
        )
    )
    .filter(({ player }) => !substitutionState.substitutedOutOpponentPlayerIds.includes(player.id));

  const rankedStarterCandidates = starterCandidates
    .map(({ player, rating, discipline }) => ({
      player,
      rating,
      score: scoreOpponentStarterForSubstitution({ rating, discipline }),
    }))
    .filter(({ score }) => score > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score);

  for (const starterCandidate of rankedStarterCandidates) {
    const slotPosition =
      starterCandidate.player.lineupPosition ?? starterCandidate.player.position;
    const benchCandidates = substitutionState.opponentBench
      .filter((player) => canMatchPlayerPlayInPosition(player, slotPosition))
      .map((player) => ({
        player,
        score: scoreOpponentBenchCandidate({
          starterRating: starterCandidate.rating,
          benchPlayer: player,
          slotPosition,
        }),
      }))
      .sort((a, b) => b.score - a.score);

    const bestBenchCandidate = benchCandidates[0];

    if (!bestBenchCandidate) {
      continue;
    }

    return {
      outPlayer: starterCandidate.player,
      inPlayer: {
        ...bestBenchCandidate.player,
        lineupPosition: slotPosition,
      },
      requestedAtTurn: state.context.turn,
      requestedAtMinute: minute,
      appliedAtMinute: null,
    };
  }

  return null;
}

function getOpponentSubstitutionsLeft(
  substitutionState: MatchSubstitutionState
): number {
  return Math.max(
    0,
    substitutionState.maxOpponentSubstitutions -
      (substitutionState.completedOpponentSubstitutions.length +
        substitutionState.pendingOpponentSubstitutions.length)
  );
}

function getMatchPlayerRating(params: {
  state: MatchState;
  side: "user" | "opponent";
  player: MatchPlayer;
}): number {
  const { state, side, player } = params;
  const stats =
    state.playerMatchStats[`${side}:${player.id}`] ?? emptyStatLine();

  return calculatePlayerRating(
    stats,
    player.lineupPosition ?? player.position
  );
}

function scoreOpponentStarterForSubstitution(params: {
  rating: number;
  discipline: ReturnType<typeof getPlayerDisciplinaryState>;
}): number {
  const { rating, discipline } = params;
  let score = 0;

  if (discipline.yellowCards > 0) {
    score += 25;
  }

  if (rating < 5) {
    score += 30 + (5 - rating) * 8;
  } else if (rating < 6) {
    score += 14 + (6 - rating) * 4;
  } else if (rating < 7.5) {
    score += Math.max(0, 7.5 - rating) * 1.5;
  } else {
    score -= 20 + (rating - 7.5) * 10;
  }

  return score;
}

function scoreOpponentBenchCandidate(params: {
  starterRating: number;
  benchPlayer: MatchPlayer;
  slotPosition: string;
}): number {
  const { starterRating, benchPlayer, slotPosition } = params;
  let score = benchPlayer.overall;

  if (canMatchPlayerPlayInPosition(benchPlayer, slotPosition)) {
    score += 8;
  }

  score += Math.max(0, 6.5 - starterRating) * 2;

  return score;
}
