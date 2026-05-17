import type { MatchEvent, MatchState } from "../matchTypes";

/**
 * Appends or replaces the last event in state.history (same-turn dedup)
 * and sets state.lastEvent. Shared by matchEngine.ts and setPieceResolver.ts.
 */
export function commitEvent(state: MatchState, event: MatchEvent): MatchState {
  const last = state.history[state.history.length - 1];
  const history =
    last !== undefined && last.turn === event.turn
      ? [...state.history.slice(0, -1), event]
      : [...state.history, event];
  return {
    ...state,
    history,
    lastEvent: event,
  };
}