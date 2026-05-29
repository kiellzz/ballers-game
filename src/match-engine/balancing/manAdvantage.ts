import type { ActionDefinition, DuelContext, PossessionSide } from "../matchTypes";

const MAN_ADVANTAGE_DELTA_PER_RED = 1.35;

export function getManAdvantageDelta(
  context: DuelContext,
  actionDefinition: ActionDefinition
): number {
  if (context.situationType !== "open_play" || !context.numericalAdvantage) {
    return 0;
  }

  const {
    userSentOffCount,
    opponentSentOffCount,
  } = context.numericalAdvantage;

  const userAdvantage = opponentSentOffCount - userSentOffCount;

  if (userAdvantage === 0) {
    return 0;
  }

  const duelInitiator = getDuelInitiatorSide(context, actionDefinition);
  const favoredSide: PossessionSide = userAdvantage > 0 ? "user" : "opponent";
  const swing = Math.abs(userAdvantage) * MAN_ADVANTAGE_DELTA_PER_RED;

  return duelInitiator === favoredSide ? swing : -swing;
}

function getDuelInitiatorSide(
  context: DuelContext,
  actionDefinition: ActionDefinition
): PossessionSide {
  if (actionDefinition.requiresPossession) {
    return context.possession;
  }

  return context.possession === "user" ? "opponent" : "user";
}
