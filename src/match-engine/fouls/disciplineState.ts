import type {
  MatchDisciplinaryState,
  MatchTeam,
  NumericalAdvantageState,
  PlayerDisciplinaryState,
  PossessionSide,
} from "../matchTypes";

const EMPTY_PLAYER_DISCIPLINE: PlayerDisciplinaryState = {
  yellowCards: 0,
  redCard: false,
  sentOff: false,
  dismissalType: "none",
};

export function createInitialDisciplinaryState(params: {
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
}): MatchDisciplinaryState {
  const { userTeam, opponentTeam } = params;
  const state: MatchDisciplinaryState = {};

  for (const player of userTeam.starters) {
    state[getDisciplinaryKey("user", player.id)] = createEmptyPlayerDiscipline();
  }

  for (const player of opponentTeam.starters) {
    state[getDisciplinaryKey("opponent", player.id)] =
      createEmptyPlayerDiscipline();
  }

  return state;
}

export function createEmptyPlayerDiscipline(): PlayerDisciplinaryState {
  return {
    yellowCards: 0,
    redCard: false,
    sentOff: false,
    dismissalType: "none",
  };
}

export function getDisciplinaryKey(
  side: PossessionSide,
  playerId: number
): string {
  return `${side}:${playerId}`;
}

export function getPlayerDisciplinaryState(
  disciplinaryState: MatchDisciplinaryState,
  side: PossessionSide,
  playerId: number
): PlayerDisciplinaryState {
  return (
    disciplinaryState[getDisciplinaryKey(side, playerId)] ?? EMPTY_PLAYER_DISCIPLINE
  );
}

export function getSentOffPlayerIds(
  disciplinaryState: MatchDisciplinaryState,
  side: PossessionSide
): Set<number> {
  const sentOffIds = new Set<number>();
  const prefix = `${side}:`;

  for (const [key, playerState] of Object.entries(disciplinaryState)) {
    if (!key.startsWith(prefix) || !playerState.sentOff) {
      continue;
    }

    const playerId = Number(key.slice(prefix.length));

    if (!Number.isNaN(playerId)) {
      sentOffIds.add(playerId);
    }
  }

  return sentOffIds;
}

export function getTeamSentOffCount(
  disciplinaryState: MatchDisciplinaryState,
  side: PossessionSide
): number {
  let count = 0;
  const prefix = `${side}:`;

  for (const [key, playerState] of Object.entries(disciplinaryState)) {
    if (key.startsWith(prefix) && playerState.sentOff) {
      count += 1;
    }
  }

  return count;
}

export function getNumericalAdvantageState(
  disciplinaryState: MatchDisciplinaryState
): NumericalAdvantageState {
  return {
    userSentOffCount: getTeamSentOffCount(disciplinaryState, "user"),
    opponentSentOffCount: getTeamSentOffCount(disciplinaryState, "opponent"),
  };
}
