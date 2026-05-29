// src/match-engine/balancing/duelEngine.ts

import { getActionDefinition } from "./events";
import { getManAdvantageDelta } from "./manAdvantage";

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

  const offensivePlayer = getOffensivePlayer(context, actionDefinition);
  const defensivePlayer = getDefensivePlayer(context, actionDefinition);

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

  
  const divisor =
  ["finish", "header", "long_shot", "wait"].includes(context.action) ? 16 :
  context.action === "rush_save" ? 13 :
  10;

  const baseDelta = (normalizedOffensive - normalizedDefensive) / divisor;
  const manAdvantageDelta = getManAdvantageDelta(context, actionDefinition);
  const rawDelta = baseDelta + manAdvantageDelta;

  return { offensive, defensive, rawDelta };
}

function getContextualDefensiveWeights(
  context: DuelContext,
  actionDefinition: ActionDefinition
): Array<{ stat: AnyStat; weight: number }> {
  // Goleiro em dribble na def_bigchance (ex: atacante dribla o goleiro)
  if (context.zone === "def_bigchance" && context.action === "dribble") {
    return [
      { stat: "overall",     weight: 0.4 },
      { stat: "positioning", weight: 1.0 },
      { stat: "reflexes",    weight: 0.8 },
      { stat: "diving",      weight: 0.6 },
    ];
  }

  // finish/header na atk_box: defensivo é um jogador de campo, não o goleiro
  // → usar pesos de outfield em vez de reflexes/positioning (stats de GK)
  if (
    context.zone === "atk_box" &&
    (context.action === "finish" || context.action === "header")
  ) {
    return [
      { stat: "overall",   weight: 0.43 },
      { stat: "defending", weight: 0.9  },
      { stat: "physical",  weight: 0.55 },
    ];
  }

  return actionDefinition.defensiveWeights;
}

function getOffensivePlayer(context: DuelContext, actionDefinition: ActionDefinition): MatchPlayer {
  // def_bigchance: goleiro do user executa rush_save ou wait
  if (context.zone === "def_bigchance") {
    return context.actors.userGoalkeeper;
  }

  // atk_bigchance: atacante com a bola finaliza (não é o goleiro adversário)
  if (context.zone === "atk_bigchance") {
    return context.possession === "user"
      ? context.actors.userPlayer
      : context.actors.opponentPlayer;
  }

  // Ações sem posse: executor é o defensor (sem a bola)
  if (!actionDefinition.requiresPossession) {
    return context.possession === "opponent"
      ? context.actors.userPlayer
      : context.actors.opponentPlayer;
  }

  // Ações com posse: executor é quem tem a bola
  return context.possession === "user"
    ? context.actors.userPlayer
    : context.actors.opponentPlayer;
}

function getDefensivePlayer(context: DuelContext, actionDefinition: ActionDefinition): MatchPlayer {
  // def_bigchance: atacante com a bola resiste ao goleiro
  if (context.zone === "def_bigchance") {
    return context.possession === "opponent"
      ? context.actors.opponentPlayer
      : context.actors.userPlayer;
  }

  // atk_bigchance: goleiro adversário resiste ao atacante
  if (context.zone === "atk_bigchance") {
    return context.actors.opponentGoalkeeper;
  }

  // Ações sem posse: quem resiste é o atacante (com a bola)
  if (!actionDefinition.requiresPossession) {
    return context.possession === "opponent"
      ? context.actors.opponentPlayer
      : context.actors.userPlayer;
  }

  // Ações com posse: quem resiste é o defensor (sem a bola)
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
    return { stat, weight, baseValue, contribution };
  });
  const total = entries.reduce((sum, entry) => sum + entry.contribution, 0);
  return { total, entries };
}

function getPlayerStatValue(player: MatchPlayer, stat: AnyStat): number {
  if (stat === "overall") return player.overall;
  if (stat === "height") return player.height / 2;

  if (player.role === "outfield") {
    switch (stat) {
      case "pace": case "shooting": case "passing":
      case "dribbling": case "defending": case "physical":
        return player.stats[stat];
      default: return 0;
    }
  }

  if (player.role === "goalkeeper") {
    switch (stat) {
      case "diving": case "reflexes": case "speed":
      case "handling": case "kicking": case "positioning":
        return player.stats[stat];
      default: return 0;
    }
  }

  return 0;
}
