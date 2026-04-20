import type { Player } from "../../types/PlayerTypes";
import type { PossessionSide } from "../matchTypes";

export interface WhoScoredEventLike {
  isGoal?: boolean | null;
  scoredBy?: PossessionSide | null;
  scorerName?: string | null;
  scorerSide?: PossessionSide | null;
  userPlayers?: Player[];
  opponentPlayers?: Player[];
}

export interface WhoScoredResult {
  scorer: Player | null;
  scorerSide: PossessionSide | null;
}

const EMPTY: WhoScoredResult = {
  scorer: null,
  scorerSide: null,
};

export function getWhoScored(
  event: WhoScoredEventLike | null | undefined
): WhoScoredResult {
  if (!event?.isGoal) {
    return EMPTY;
  }

  const scorerSide = event.scoredBy ?? event.scorerSide ?? null;

  if (scorerSide !== "user" && scorerSide !== "opponent") {
    return EMPTY;
  }

  if (!event.scorerName) {
    return {
      scorer: null,
      scorerSide,
    };
  }

  const players = scorerSide === "user" ? event.userPlayers : event.opponentPlayers;

  if (!players || players.length === 0) {
    return {
      scorer: null,
      scorerSide,
    };
  }

  const found = players.find((p) => p.name === event.scorerName) ?? null;

  return {
    scorer: found,
    scorerSide,
  };
}