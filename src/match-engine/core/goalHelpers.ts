import { getWhoAssisted } from "../ui_ux/whoAssisted";
import type {
  DuelContext,
  EventTransition,
  GoalDetails,
  MatchGoalRecord,
  PossessionSide,
} from "../matchTypes";

export function getPossessionPlayerId(context: DuelContext): number {
  return context.possession === "user"
    ? context.actors.userPlayer.id
    : context.actors.opponentPlayer.id;
}

export function buildGoalDetails(params: {
  scorerId: number | null;
  scorerSide: PossessionSide | null;
  lastTouchPlayerId: number | null;
  lastTouchSide: PossessionSide | null;
  allowAssist?: boolean;
}): GoalDetails | null {
  const {
    scorerId,
    scorerSide,
    lastTouchPlayerId,
    lastTouchSide,
    allowAssist = true,
  } = params;

  if (scorerId === null || scorerSide === null) {
    return null;
  }

  return {
    scorerId,
    scorerSide,
    assistPlayerId: allowAssist
      ? getWhoAssisted({
          scorerId,
          scorerSide,
          lastTouchPlayerId,
          lastTouchSide,
        })
      : null,
  };
}

export function createLastGoalRecord(params: {
  goalDetails: GoalDetails | null;
  fromZone: EventTransition["fromZone"];
  fromLane: EventTransition["fromLane"];
  minute: number;
  turn: number;
}): MatchGoalRecord | null {
  const { goalDetails, fromZone, fromLane, minute, turn } = params;

  if (!goalDetails) {
    return null;
  }

  return {
    id: `goal-${turn}-${goalDetails.scorerSide}-${goalDetails.scorerId}`,
    scorerId: goalDetails.scorerId,
    scorerSide: goalDetails.scorerSide,
    assistPlayerId: goalDetails.assistPlayerId,
    minute,
    fromZone,
    fromLane,
  };
}