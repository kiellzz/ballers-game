import { ACTION_DEFINITIONS } from "../balancing/events";
import type { ActionType, EventOutcome, ShotOutcome } from "../matchTypes";

const EVENT_OUTCOME_LABELS: Record<EventOutcome, string> = {
  success_high: "Clean success",
  success: "Successful",
  fail: "Stopped",
  fail_high: "Shut down",
};

const SHOT_OUTCOME_LABELS: Record<ShotOutcome, string> = {
  goal: "Goal",
  save: "Saved",
  rebound: "Rebound",
  post: "Off the post",
  miss: "Missed",
  blocked: "Blocked",
};

export function getMatchActionLabel(action: ActionType): string {
  return ACTION_DEFINITIONS[action]?.label ?? humanizeToken(action);
}

export function getMatchOutcomeLabel(params: {
  outcome: EventOutcome;
  shotOutcome?: ShotOutcome | null;
}): string {
  const { outcome, shotOutcome = null } = params;

  if (shotOutcome) {
    return SHOT_OUTCOME_LABELS[shotOutcome] ?? humanizeToken(shotOutcome);
  }

  return EVENT_OUTCOME_LABELS[outcome] ?? humanizeToken(outcome);
}

function humanizeToken(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
