import { getActionDefinition } from "./events";

import type {
  DuelContext,
  EventOutcome,
  RandomizedOutcome,
} from "../matchTypes";

interface RandomizeEventParams {
  context: DuelContext;
  rawDelta: number;
  random?: () => number;
}

export function randomizeEventOutcome(
  params: RandomizeEventParams
): RandomizedOutcome {
  const { context, rawDelta, random = Math.random } = params;

  const actionDefinition = getActionDefinition(context.action);

  const volatilityApplied = actionDefinition.volatility;
  const randomSwing = getRandomSwing(volatilityApplied, random);
  const finalDelta = rawDelta + randomSwing;
  const outcome = getOutcomeFromDelta(finalDelta);

  return {
    outcome,
    randomSwing,
    finalDelta,
    volatilityApplied,
  };
}

function getRandomSwing(volatility: number, random: () => number): number {
  const safeVolatility = Math.max(0, Math.min(1, volatility));
  const maxSwing = 14 * safeVolatility;

  // Triangular distribution:
  // values near 0 are more common,
  // positive / negative extremes are rarer.
  const centeredRandom = random() + random() - 1;

  return centeredRandom * maxSwing;
}

function getOutcomeFromDelta(delta: number): EventOutcome {
  if (delta <= - 8)  return "fail_high";
  if (delta <  -0.5) return "fail";
  if (delta <   8)  return "success";
  return "success_high";
}
