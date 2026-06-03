import { ACTION_DEFINITIONS } from "../balancing/events";
import type {
  ActionType,
  DismissalType,
  EventOutcome,
  ShotOutcome,
  Zone,
} from "../matchTypes";

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

export function getCardOutcomeLabel(
  cardType: "yellow" | "red",
  dismissalType: DismissalType | null
): string {
  if (cardType === "yellow") {
    return "Yellow card";
  }

  return dismissalType === "second_yellow" ? "Second yellow" : "Red card";
}

export function getFallbackEventNarration(): string {
  return "Play without description.";
}

export function getCurrentPhaseText(params: {
  isUserAttacking: boolean;
  zone: Zone | string;
  attackerName?: string | null;
  defenderName?: string | null;
}): string {
  const { isUserAttacking, zone, attackerName, defenderName } = params;

  const attackerText = attackerName
    ? `${attackerName} drives the attack forward.`
    : "The attack is building.";

  const duelText =
    attackerName && defenderName
      ? `${attackerName} faces ${defenderName}.`
      : attackerText;

  if (isUserAttacking) {
    switch (zone) {
      case "def_box":
      case "def_nearbox":
      case "def_third":
        return "Your team tries to build from the back.";
      case "def_mid":
      case "atk_mid":
      case "atk_third":
      case "atk_nearbox":
        return duelText;
      case "atk_box":
      case "atk_bigchance":
        return attackerName
          ? `${attackerName} arrives dangerously inside the box.`
          : "Your team arrives dangerously inside the box.";
      default:
        return attackerText;
    }
  }

  switch (zone) {
    case "atk_box":
    case "atk_nearbox":
    case "atk_third":
      return attackerName
        ? `${attackerName} is putting your defense under pressure.`
        : "The opponent is putting your defense under pressure.";
    case "atk_mid":
    case "def_mid":
      return duelText;
    case "def_third":
    case "def_nearbox":
      return attackerName
        ? `${attackerName} advances towards your box.`
        : "The opponent advances towards your box.";
    case "def_box":
    case "def_bigchance":
      return attackerName
        ? `${attackerName} is threatening inside the box.`
        : "The opponent is threatening inside the box.";
    default:
      return attackerText;
  }
}

function humanizeToken(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
