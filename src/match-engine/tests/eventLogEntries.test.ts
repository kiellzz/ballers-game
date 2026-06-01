import { describe, expect, it } from "vitest";

import { buildHistoryEventLogEntries } from "../ui_ux/eventLogEntries";
import type { MatchHistoryEntry } from "../ui_ux/useMatchEngine";
import type { Player } from "../../types/PlayerTypes";

const userAttacker: Player = {
  id: 1,
  name: "User Attacker",
  overall: 86,
  position: "ST",
  nationality: "Brazil",
  height: 181,
  stats: {} as Player["stats"],
};

const userDefender: Player = {
  id: 2,
  name: "User Defender",
  overall: 82,
  position: "CB",
  nationality: "Brazil",
  height: 186,
  stats: {} as Player["stats"],
};

const opponentDefender: Player = {
  id: 11,
  name: "Opponent Defender",
  overall: 80,
  position: "CB",
  nationality: "Argentina",
  height: 184,
  stats: {} as Player["stats"],
};

function createHistoryEntry(
  overrides: Partial<MatchHistoryEntry>
): MatchHistoryEntry {
  return {
    turn: 1,
    id: "history-1",
    minute: 18,
    actionType: "slide_tackle",
    outcome: "fail",
    narration: "A late challenge stops the move.",
    attackerName: userAttacker.name,
    defenderName: opponentDefender.name,
    goalkeeperName: undefined,
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
    fromZone: "atk_third",
    fromLane: "center",
    ...overrides,
  };
}

describe("buildHistoryEventLogEntries", () => {
  it("returns duel and yellow-card entries for the same history row", () => {
    const entries = buildHistoryEventLogEntries({
      entry: createHistoryEntry({
        cardType: "yellow",
        cardedPlayerId: 11,
        cardedPlayerName: opponentDefender.name,
        cardedPlayerSide: "opponent",
      }),
      userPlayers: [userAttacker, userDefender],
      opponentPlayers: [opponentDefender],
      userAssignedPositions: new Map([[userAttacker.name, "ST"]]),
      opponentAssignedPositions: new Map([[opponentDefender.name, "CB"]]),
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: "duel",
      attacker: userAttacker,
      defender: opponentDefender,
      action: "Slide tackle",
      outcome: "Stopped",
    });
    expect(entries[1]).toMatchObject({
      id: "history-1-card",
      kind: "card",
      player: opponentDefender,
      cardType: "yellow",
      action: "Slide tackle",
      outcome: "Yellow card",
    });
  });

  it("labels second-yellow dismissals distinctly", () => {
    const entries = buildHistoryEventLogEntries({
      entry: createHistoryEntry({
        cardType: "red",
        cardedPlayerId: 11,
        cardedPlayerName: opponentDefender.name,
        cardedPlayerSide: "opponent",
        dismissalType: "second_yellow",
      }),
      userPlayers: [userAttacker, userDefender],
      opponentPlayers: [opponentDefender],
      userAssignedPositions: new Map(),
      opponentAssignedPositions: new Map(),
    });

    expect(entries[1]).toMatchObject({
      kind: "card",
      cardType: "red",
      outcome: "Second yellow",
    });
  });
});
