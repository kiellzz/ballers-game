import { getActionDefinition } from "./events";

import type {
  AnyStat,
  DuelContext,
  DuelScores,
  MatchPlayer,
  SideScoreBreakdown,
  StatBreakdownEntry,
} from "../matchTypes";

export function resolveDuel(context: DuelContext): DuelScores {
  const actionDefinition = getActionDefinition(context.action);

  const offensivePlayer = getOffensivePlayer(context);
  const defensivePlayer = getDefensivePlayer(context);

  const offensive = buildScoreBreakdown(
    offensivePlayer,
    actionDefinition.offensiveWeights
  );

  const defensive = buildScoreBreakdown(
    defensivePlayer,
    actionDefinition.defensiveWeights
  );

  return {
    offensive,
    defensive,
    rawDelta: (offensive.total - defensive.total) / 10,
  };
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