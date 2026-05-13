import { getActionDefinition } from "./events";

import type {
  AnyStat,
  DuelContext,
  DuelScores,
  MatchPlayer,
  SideScoreBreakdown,
  StatBreakdownEntry,
  ActionDefinition,
} from "../matchTypes";

export function resolveDuel(context: DuelContext): DuelScores {
  const actionDefinition = getActionDefinition(context.action);

  const offensivePlayer = getOffensivePlayer(context);
  const defensivePlayer = getDefensivePlayer(context);

  const offensiveWeights = actionDefinition.offensiveWeights;
  const defensiveWeights = getContextualDefensiveWeights(context, actionDefinition);

  const offensive = buildScoreBreakdown(offensivePlayer, offensiveWeights);
  const defensive = buildScoreBreakdown(defensivePlayer, defensiveWeights);

  const offensiveWeightSum = offensiveWeights.reduce((sum, w) => sum + w.weight, 0);
  const defensiveWeightSum = defensiveWeights.reduce((sum, w) => sum + w.weight, 0);

  const normalizedOffensive = offensiveWeightSum > 0
    ? offensive.total / offensiveWeightSum
    : 0;
  const normalizedDefensive = defensiveWeightSum > 0
    ? defensive.total / defensiveWeightSum
    : 0;

  const rawDelta = (normalizedOffensive - normalizedDefensive) / 10;

  return {
    offensive,
    defensive,
    rawDelta,
  };
}

function getContextualDefensiveWeights(
  context: DuelContext,
  actionDefinition: ActionDefinition
): Array<{ stat: AnyStat; weight: number }> {
  if (
    context.zone === "def_bigchance" &&
    context.action === "dribble"
  ) {
    return [
      { stat: "overall",     weight: 0.4 },
      { stat: "positioning", weight: 1.0 },
      { stat: "reflexes",    weight: 0.8 },
      { stat: "diving",      weight: 0.6 },
    ];
  }

  return actionDefinition.defensiveWeights;
}

function getOffensivePlayer(context: DuelContext): MatchPlayer {
  if (context.zone === "def_bigchance") {
    return context.possession === "opponent"
      ? context.actors.opponentPlayer
      : context.actors.userPlayer;
  }

  return context.possession === "user"
    ? context.actors.userPlayer
    : context.actors.opponentPlayer;
}

function getDefensivePlayer(context: DuelContext): MatchPlayer {
  if (context.zone === "def_bigchance") {
    return context.actors.userGoalkeeper;
  }

  if (context.zone === "atk_bigchance") {
    return context.actors.opponentGoalkeeper;
  }

  return context.possession === "user"
    ? context.actors.opponentPlayer
    : context.actors.userPlayer;
}

function buildScoreBreakdown(
  player: MatchPlayer,
  weights: Array<{ stat: AnyStat; weight: number }>
): SideScoreBreakdown {
  const entries: StatBreakdownEntry[] = weights.map(({ stat, weight }) => {
    const baseValue = getPlayerStatValue(player, stat);
    const contribution = baseValue * weight;

    return {
      stat,
      weight,
      baseValue,
      contribution,
    };
  });

  const total = entries.reduce((sum, entry) => sum + entry.contribution, 0);

  return {
    total,
    entries,
  };
}

function getPlayerStatValue(player: MatchPlayer, stat: AnyStat): number {
  if (stat === "overall") {
    return player.overall;
  }

  if (stat === "height") {
    return player.height / 2;
  }

  if (player.role === "outfield") {
    switch (stat) {
      case "pace":
      case "shooting":
      case "passing":
      case "dribbling":
      case "defending":
      case "physical":
        return player.stats[stat];

      case "diving":
      case "reflexes":
      case "speed":
      case "handling":
      case "kicking":
      case "positioning":
        return 0;

      default:
        return 0;
    }
  }

  if (player.role === "goalkeeper") {
    switch (stat) {
      case "diving":
      case "reflexes":
      case "speed":
      case "handling":
      case "kicking":
      case "positioning":
        return player.stats[stat];

      case "pace":
      case "shooting":
      case "passing":
      case "dribbling":
      case "defending":
      case "physical":
        return 0;

      default:
        return 0;
    }
  }

  return 0;
}