import { getActionDefinition } from "../balancing/events";

import type {
  CardType,
  DuelContext,
  EventOutcome,
  FoulResult,
} from "../matchTypes";

interface ResolveCardParams {
  context: DuelContext;
  outcome: EventOutcome;
  foulResult: FoulResult;
  random?: () => number;
}

interface CardEngineResult {
  card: CardType;
  sentOff: boolean;
}

export function resolveCard(params: ResolveCardParams): CardEngineResult {
  const { context, outcome, foulResult, random = Math.random } = params;

  if (!foulResult.committed) {
    return {
      card: "none",
      sentOff: false,
    };
  }

  const actionDefinition = getActionDefinition(context.action);

  if (!actionDefinition.canCauseCard) {
    return {
      card: "none",
      sentOff: false,
    };
  }

  const redChance = getRedCardChance({
    action: context.action,
    outcome,
    foulResult,
  });

  const yellowChance = getYellowCardChance({
    action: context.action,
    outcome,
    foulResult,
  });

  const redRoll = random();

  if (redRoll < redChance) {
    return {
      card: "red",
      sentOff: true,
    };
  }

  const yellowRoll = random();

  if (yellowRoll < yellowChance) {
    return {
      card: "yellow",
      sentOff: false,
    };
  }

  return {
    card: "none",
    sentOff: false,
  };
}

function getYellowCardChance(params: {
  action: DuelContext["action"];
  outcome: EventOutcome;
  foulResult: FoulResult;
}): number {
  const { action, outcome, foulResult } = params;

  let chance = 0;

  switch (action) {
    case "slide_tackle":
      chance = 0.42;
      break;

    case "tackle":
      chance = 0.2;
      break;

    case "shoulder_charge":
      chance = 0.18;
      break;

    case "block":
      chance = 0.08;
      break;

    default:
      chance = 0.05;
      break;
  }

  if (outcome === "fail_high") {
    chance += 0.2;
  } else if (outcome === "fail") {
    chance += 0.08;
  } else if (outcome === "success_high") {
    chance -= 0.08;
  }

  if (foulResult.setPieceAwarded === "penalty") {
    chance += 0.08;
  }

  return clamp(chance, 0, 0.95);
}

function getRedCardChance(params: {
  action: DuelContext["action"];
  outcome: EventOutcome;
  foulResult: FoulResult;
}): number {
  const { action, outcome, foulResult } = params;

  let chance = 0;

  switch (action) {
    case "slide_tackle":
      chance = 0.1;
      break;

    case "tackle":
      chance = 0.03;
      break;

    case "shoulder_charge":
      chance = 0.025;
      break;

    default:
      chance = 0.01;
      break;
  }

  if (outcome === "fail_high") {
    chance += 0.12;
  } else if (outcome === "fail") {
    chance += 0.03;
  }

  if (foulResult.setPieceAwarded === "penalty") {
    chance += 0.07;
  }

  return clamp(chance, 0, 0.6);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}