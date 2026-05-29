import { describe, expect, it } from "vitest";

import { buildSummaryEntries } from "../ui_ux/summaryEvents";
import type { MatchHistoryEntry } from "../ui_ux/useMatchEngine";

function createHistoryEntry(
  overrides: Partial<MatchHistoryEntry>
): MatchHistoryEntry {
  return {
    turn: 1,
    id: "event-1",
    minute: 12,
    actionType: "finish",
    outcome: "success_high",
    narration: "Event narration.",
    attackerName: "Attacker",
    defenderName: "Defender",
    goalkeeperName: "Goalkeeper",
    duelType: null,
    isGoal: false,
    shotOutcome: null,
    scoredBy: null,
    scorerName: null,
    scorerSide: null,
    assisterName: null,
    isPenaltyGoal: false,
    cardType: null,
    cardedPlayerId: null,
    cardedPlayerName: null,
    cardedPlayerSide: null,
    dismissalType: null,
    setPieceType: null,
    fromZone: "atk_box",
    fromLane: "center",
    ...overrides,
  };
}

describe("buildSummaryEntries", () => {
  it("includes goals and red cards for the selected side in match order", () => {
    const history: MatchHistoryEntry[] = [
      createHistoryEntry({
        turn: 2,
        id: "goal-user",
        minute: 15,
        isGoal: true,
        scorerName: "Romario",
        scorerSide: "user",
        assisterName: "Rivaldo",
      }),
      createHistoryEntry({
        turn: 3,
        id: "yellow-user",
        minute: 28,
        cardType: "yellow",
        cardedPlayerName: "Dunga",
        cardedPlayerSide: "user",
      }),
      createHistoryEntry({
        turn: 4,
        id: "red-user",
        minute: 63,
        cardType: "red",
        cardedPlayerName: "Cafu",
        cardedPlayerSide: "user",
        dismissalType: "straight_red",
      }),
      createHistoryEntry({
        turn: 5,
        id: "red-opponent",
        minute: 79,
        cardType: "red",
        cardedPlayerName: "Opponent Defender",
        cardedPlayerSide: "opponent",
        dismissalType: "second_yellow",
      }),
    ];

    expect(buildSummaryEntries("user", history)).toEqual([
      {
        type: "goal",
        primaryName: "Romario",
        secondaryLabel: "Assist",
        secondaryValue: "Rivaldo",
        minute: 15,
      },
      {
        type: "red_card",
        primaryName: "Cafu",
        secondaryLabel: "Red card",
        secondaryValue: null,
        minute: 63,
      },
    ]);
  });

  it("labels second-yellow dismissals explicitly", () => {
    const history: MatchHistoryEntry[] = [
      createHistoryEntry({
        turn: 6,
        id: "second-yellow",
        minute: 88,
        cardType: "red",
        cardedPlayerName: "Opponent Midfielder",
        cardedPlayerSide: "opponent",
        dismissalType: "second_yellow",
      }),
    ];

    expect(buildSummaryEntries("opponent", history)).toEqual([
      {
        type: "red_card",
        primaryName: "Opponent Midfielder",
        secondaryLabel: "Second yellow",
        secondaryValue: null,
        minute: 88,
      },
    ]);
  });
});
