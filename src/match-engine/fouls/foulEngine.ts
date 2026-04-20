import { getActionDefinition } from "../balancing/events";

import type {
  DuelContext,
  EventOutcome,
  FoulResult,
  SetPieceType,
  Zone,
} from "../matchTypes";

interface ResolveFoulParams {
  context: DuelContext;
  outcome: EventOutcome;
  random?: () => number;
}

export function resolveFoul(params: ResolveFoulParams): FoulResult {
  const { context, outcome, random = Math.random } = params;

  const actionDefinition = getActionDefinition(context.action);

  if (!actionDefinition.canCauseFoul && !actionDefinition.canDrawFoul) {
    return createNoFoulResult();
  }

  const foulChance = getFoulChance({
    action: context.action,
    zone: context.zone,
    outcome,
    canCauseFoul: actionDefinition.canCauseFoul,
    canDrawFoul: actionDefinition.canDrawFoul,
  });

  if (random() >= foulChance) {
    return createNoFoulResult();
  }

  const foulingSide = getFoulingSide(context);
  const awardedTo = foulingSide === "user" ? "opponent" : "user";
  const setPieceAwarded = getSetPieceAwarded(context.zone, awardedTo);

  return {
    committed: true,
    by: foulingSide,
    card: "none",
    setPieceAwarded,
    awardedTo,
    description: getFoulDescription(setPieceAwarded, context.zone),
  };
}

function createNoFoulResult(): FoulResult {
  return {
    committed: false,
    by: null,
    card: "none",
    setPieceAwarded: null,
    awardedTo: null,
    description: undefined,
  };
}

function getFoulingSide(context: DuelContext): "user" | "opponent" {
  return context.possession === "user" ? "opponent" : "user";
}

function getFoulChance(params: {
  action: DuelContext["action"];
  zone: Zone;
  outcome: EventOutcome;
  canCauseFoul?: boolean;
  canDrawFoul?: boolean;
}): number {
  const { action, zone, outcome, canCauseFoul, canDrawFoul } = params;

  let chance = 0;

  if (canCauseFoul) {
    switch (action) {
      case "slide_tackle":
        chance = 0.29;
        break;

      case "tackle":
        chance = 0.05;
        break;

      case "shoulder_charge":
        chance = 0.07;
        break;

      case "block":
        chance = 0.04;
        break;

      case "rush_save":
        chance = 0.08;
        break;

      case "wait":
        chance = 0.02;
        break;

      default:
        chance = 0.05;
        break;
    }
  }

  if (canDrawFoul) {
    switch (action) {
      case "dribble":
        chance = 0.16;
        break;

      case "shield":
        chance = 0.14;
        break;

      case "sprint":
        chance = 0.12;
        break;

      case "forward_pass":
        chance = 0.06;
        break;

      default:
        chance = Math.max(chance, 0.08);
        break;
    }
  }

  if (outcome === "fail_high") {
    chance += canCauseFoul ? 0.16 : 0.04;
  } else if (outcome === "fail") {
    chance += canCauseFoul ? 0.08 : 0.02;
  } else if (outcome === "success_high") {
    chance += canDrawFoul ? 0.05 : 0;
  } else if (outcome === "success") {
    chance += canDrawFoul ? 0.02 : 0.01;
  }

  chance += getZoneFoulBonus(zone);

  return clamp(chance, 0, 0.65);
}

function getZoneFoulBonus(zone: Zone): number {
  switch (zone) {
    case "def_third":
      return 0.08;

    case "atk_third":
      return 0.09;

    case "def_nearbox":
      return 0.09;

    case "atk_nearbox":
      return 0.13;

    case "def_box":
      return 0.13;

    case "atk_box":
      return 0.18;

    case "def_bigchance":
      return 0.15;

    case "atk_bigchance":
      return 0.20;

    default:
      return 0;
  }
}

function getSetPieceAwarded(
  zone: Zone,
  awardedTo: "user" | "opponent"
): SetPieceType {
  if (
    (awardedTo === "user" &&
      (zone === "atk_box" || zone === "atk_bigchance")) ||
    (awardedTo === "opponent" &&
      (zone === "def_box" || zone === "def_bigchance"))
  ) {
    return "penalty";
  }

  return "freekick";
}

function getFoulDescription(setPieceType: SetPieceType, zone: Zone): string {
  if (setPieceType === "penalty") {
    return "Foul inside or very near the box. Penalty awarded.";
  }

  if (
    zone === "atk_nearbox" ||
    zone === "atk_third" ||
    zone === "def_nearbox" ||
    zone === "def_third"
  ) {
    return "Dangerous foul. A free kick is coming.";
  }

  return "Foul awarded.";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
