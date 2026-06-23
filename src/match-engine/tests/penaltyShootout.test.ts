import { describe, expect, it } from "vitest";
import {
  createPenaltyShootout,
  getCurrentPenaltyTakerCycleIds,
  getPenaltyShootoutScore,
  recordPenaltyShootoutAttempt,
  type PenaltyShootoutState,
} from "../penaltyShootout";

function kick(
  state: PenaltyShootoutState,
  scored: boolean,
  takerId = state.attempts.length + 1
) {
  return recordPenaltyShootoutAttempt({
    state,
    side: state.currentSide,
    takerId,
    scored,
  });
}

describe("penalty shootout", () => {
  it("ends the initial series when the lead becomes unreachable", () => {
    let state = createPenaltyShootout("user");

    state = kick(state, false);
    state = kick(state, true);
    state = kick(state, false);
    state = kick(state, true);
    state = kick(state, false);
    state = kick(state, true);

    expect(getPenaltyShootoutScore(state)).toEqual({ user: 0, opponent: 3 });
    expect(state.winner).toBe("opponent");
    expect(state.attempts).toHaveLength(6);
  });

  it("waits for both sides before deciding sudden death", () => {
    let state = createPenaltyShootout("opponent");

    for (let index = 0; index < 10; index += 1) state = kick(state, true);
    state = kick(state, true);

    expect(state.winner).toBeNull();

    state = kick(state, false);
    expect(state.winner).toBe("opponent");
  });

  it("does not repeat takers until the eligible cycle is complete", () => {
    let state = createPenaltyShootout("user");
    state = kick(state, true, 10);
    state = kick(state, true, 20);
    state = kick(state, true, 11);
    state = kick(state, true, 21);

    expect(getCurrentPenaltyTakerCycleIds(state, "user", 3)).toEqual([10, 11]);

    state = kick(state, true, 12);
    expect(getCurrentPenaltyTakerCycleIds(state, "user", 3)).toEqual([]);
  });

  it("supports either side winning the coin toss", () => {
    const state = createPenaltyShootout("opponent");
    expect(state.startingSide).toBe("opponent");
    expect(state.currentSide).toBe("opponent");
  });
});
