import type { PossessionSide } from "../matchTypes";
import type { MatchHistoryEntry } from "./useMatchEngine";

export type SummaryEventType = "goal" | "red_card";

export interface SummaryEventEntry {
  type: SummaryEventType;
  minute: number;
  primaryName: string;
  secondaryLabel: string | null;
  secondaryValue: string | null;
}

function buildGoalEntry(event: MatchHistoryEntry): SummaryEventEntry | null {
  if (!event.scorerName) {
    return null;
  }

  return {
    type: "goal",
    primaryName: event.scorerName + (event.isPenaltyGoal ? " (P)" : ""),
    secondaryLabel: event.assisterName ? "Assist" : null,
    secondaryValue: event.assisterName,
    minute: event.minute,
  };
}

function buildRedCardEntry(event: MatchHistoryEntry): SummaryEventEntry | null {
  if (!event.cardedPlayerName) {
    return null;
  }

  return {
    type: "red_card",
    primaryName: event.cardedPlayerName,
    secondaryLabel:
      event.dismissalType === "second_yellow" ? "Second yellow" : "Red card",
    secondaryValue: null,
    minute: event.minute,
  };
}

export function buildSummaryEntries(
  side: PossessionSide,
  history: MatchHistoryEntry[]
): SummaryEventEntry[] {
  return history.reduce<SummaryEventEntry[]>((entries, event) => {
    if (event.isGoal && event.scorerSide === side) {
      const goalEntry = buildGoalEntry(event);
      if (goalEntry) {
        entries.push(goalEntry);
      }
    }

    if (event.cardType === "red" && event.cardedPlayerSide === side) {
      const redCardEntry = buildRedCardEntry(event);
      if (redCardEntry) {
        entries.push(redCardEntry);
      }
    }

    return entries;
  }, []);
}
