import type { PossessionSide } from "./matchTypes";

export type PenaltyShootoutWinner = PossessionSide | null;

export interface PenaltyShootoutAttempt {
  side: PossessionSide;
  takerId: number;
  scored: boolean;
}

export interface PenaltyShootoutState {
  startingSide: PossessionSide;
  currentSide: PossessionSide;
  attempts: PenaltyShootoutAttempt[];
  winner: PenaltyShootoutWinner;
}

export interface PenaltyShootoutScore {
  user: number;
  opponent: number;
}

const INITIAL_KICKS_PER_SIDE = 5;

export function createPenaltyShootout(
  startingSide: PossessionSide
): PenaltyShootoutState {
  return {
    startingSide,
    currentSide: startingSide,
    attempts: [],
    winner: null,
  };
}

export function getPenaltyShootoutScore(
  state: PenaltyShootoutState
): PenaltyShootoutScore {
  return state.attempts.reduce<PenaltyShootoutScore>(
    (score, attempt) => {
      if (attempt.scored) score[attempt.side] += 1;
      return score;
    },
    { user: 0, opponent: 0 }
  );
}

export function getPenaltyShootoutAttempts(
  state: PenaltyShootoutState,
  side: PossessionSide
): PenaltyShootoutAttempt[] {
  return state.attempts.filter((attempt) => attempt.side === side);
}

export function getCurrentPenaltyTakerCycleIds(
  state: PenaltyShootoutState,
  side: PossessionSide,
  eligibleTakerCount: number
): number[] {
  if (eligibleTakerCount <= 0) return [];

  const attempts = getPenaltyShootoutAttempts(state, side);
  const cycleLength = attempts.length % eligibleTakerCount;

  if (cycleLength === 0) return [];
  return attempts.slice(-cycleLength).map((attempt) => attempt.takerId);
}

export function recordPenaltyShootoutAttempt(params: {
  state: PenaltyShootoutState;
  side: PossessionSide;
  takerId: number;
  scored: boolean;
}): PenaltyShootoutState {
  const { state, side, takerId, scored } = params;

  if (state.winner) return state;
  if (side !== state.currentSide) {
    throw new Error(`Expected ${state.currentSide} to take the next penalty.`);
  }

  const attempts = [...state.attempts, { side, takerId, scored }];
  const nextState: PenaltyShootoutState = {
    ...state,
    attempts,
    currentSide: side === "user" ? "opponent" : "user",
  };

  return {
    ...nextState,
    winner: resolvePenaltyShootoutWinner(nextState),
  };
}

function resolvePenaltyShootoutWinner(
  state: PenaltyShootoutState
): PenaltyShootoutWinner {
  const score = getPenaltyShootoutScore(state);
  const userAttempts = getPenaltyShootoutAttempts(state, "user").length;
  const opponentAttempts = getPenaltyShootoutAttempts(state, "opponent").length;
  const userRemaining = Math.max(0, INITIAL_KICKS_PER_SIDE - userAttempts);
  const opponentRemaining = Math.max(
    0,
    INITIAL_KICKS_PER_SIDE - opponentAttempts
  );
  const initialSeriesComplete =
    userAttempts >= INITIAL_KICKS_PER_SIDE &&
    opponentAttempts >= INITIAL_KICKS_PER_SIDE;

  if (!initialSeriesComplete) {
    if (score.user > score.opponent + opponentRemaining) return "user";
    if (score.opponent > score.user + userRemaining) return "opponent";
  }

  const pairComplete = userAttempts === opponentAttempts;

  if (initialSeriesComplete && pairComplete && score.user !== score.opponent) {
    return score.user > score.opponent ? "user" : "opponent";
  }

  return null;
}
