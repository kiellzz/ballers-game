import { describe, expect, it } from "vitest";
import {
  DRAFT_ROUNDS,
  generateDraftOpponents,
  getOpponentAverage,
  resolveDraftMatch,
} from "./draftOpponents";

describe("draft opponents", () => {
  it("creates four complete and correctly rated opponents", () => {
    for (let draftIndex = 0; draftIndex < 6; draftIndex += 1) {
      const opponents = generateDraftOpponents();

      expect(opponents).toHaveLength(4);
      opponents.forEach((opponent, index) => {
        const round = DRAFT_ROUNDS[index];
        const roundedAverage = Math.round(getOpponentAverage(opponent));

        expect(opponent.players).toHaveLength(11);
        expect(opponent.bench).toHaveLength(5);
        expect(roundedAverage).toBeGreaterThanOrEqual(round.averageMin);
        expect(roundedAverage).toBeLessThanOrEqual(round.averageMax);
      });
    }
  });

  it("resolves knockout progression", () => {
    expect(resolveDraftMatch(0, "win")).toEqual({ kind: "advance", nextRound: 1 });
    expect(resolveDraftMatch(2, "draw")).toEqual({ kind: "repeat" });
    expect(resolveDraftMatch(1, "loss")).toEqual({ kind: "eliminated" });
    expect(resolveDraftMatch(3, "win")).toEqual({ kind: "champion" });
  });
});
