import { describe, expect, it } from "vitest";
import type { Player } from "../../types/PlayerTypes";
import {
  drawFormationChoices,
  drawDraftBenchPosition,
  drawWeightedPlayers,
  getDraftPlayerWeight,
} from "./draftUtils";

function makePlayer(id: number, name: string, overall: number): Player {
  return {
    id,
    name,
    overall,
    position: "ST",
    nationality: "Brazil",
    height: 180,
    stats: {
      pace: 80,
      shooting: 80,
      passing: 80,
      dribbling: 80,
      defending: 40,
      physical: 70,
    },
  };
}

describe("draft draws", () => {
  it("draws three different formations", () => {
    const choices = drawFormationChoices(() => 0.5);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
  });

  it("makes higher overalls rarer", () => {
    expect(getDraftPlayerWeight(makePlayer(1, "High", 95)))
      .toBeLessThan(getDraftPlayerWeight(makePlayer(2, "Low", 80)));
  });

  it("never offers two cards of the same player", () => {
    const players = [
      makePlayer(1, "Same Player", 95),
      makePlayer(2, "Same Player", 90),
      makePlayer(3, "Player B", 88),
      makePlayer(4, "Player C", 85),
      makePlayer(5, "Player D", 82),
      makePlayer(6, "Player E", 80),
    ];

    const choices = drawWeightedPlayers(players, 4, () => 0);
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((player) => player.name)).size).toBe(4);
  });

  it("draws bench positions only from the selected formation", () => {
    const players = [
      makePlayer(1, "Striker", 85),
      { ...makePlayer(2, "Winger", 84), position: "RW" as const },
    ];

    expect(drawDraftBenchPosition(["GK", "CB", "ST"], players, () => 0.99))
      .toBe("ST");
  });
});
