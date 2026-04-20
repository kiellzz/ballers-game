import type { PossessionSide } from "../matchTypes";

export function getWhoAssisted(params: {
  scorerId: number;
  scorerSide: PossessionSide;
  lastTouchPlayerId: number | null;
  lastTouchSide: PossessionSide | null;
}): number | null {
  const {
    scorerId,
    scorerSide,
    lastTouchPlayerId,
    lastTouchSide,
  } = params;

  if (lastTouchPlayerId === null) {
    return null;
  }

  if (lastTouchSide !== scorerSide) {
    return null;
  }

  if (lastTouchPlayerId === scorerId) {
    return null;
  }

  return lastTouchPlayerId;
}
