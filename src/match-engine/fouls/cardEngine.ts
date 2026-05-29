import { getActionDefinition } from "../balancing/events";
import {
  getDisciplinaryKey,
  getPlayerDisciplinaryState,
  getTeamSentOffCount,
} from "./disciplineState";

import type {
  ActionType,
  CardType,
  DismissalType,
  DuelContext,
  EventOutcome,
  FoulResult,
  MatchDisciplinaryState,
  MatchPlayer,
  PlayerDisciplinaryState,
  PossessionSide,
} from "../matchTypes";

interface ResolveCardParams {
  context: DuelContext;
  outcome: EventOutcome;
  foulResult: FoulResult;
  disciplinaryState: MatchDisciplinaryState;
  random?: () => number;
}

interface CardEngineResult {
  card: CardType;
  playerId: number | null;
  playerSide: PossessionSide | null;
  sentOff: boolean;
  dismissalType: DismissalType;
  disciplinaryState: MatchDisciplinaryState;
}

type CardChanceMode = "caused" | "drawn";

interface CardChanceProfile {
  action: ActionType;
  mode: CardChanceMode;
}

export function resolveCard(params: ResolveCardParams): CardEngineResult {
  const {
    context,
    outcome,
    foulResult,
    disciplinaryState,
    random = Math.random,
  } = params;

  if (!foulResult.committed) {
    return createEmptyCardResult(disciplinaryState);
  }

  if (!foulResult.by) {
    return createEmptyCardResult(disciplinaryState);
  }

  const cardProfile = getCardChanceProfile({
    context,
    outcome,
    foulResult,
  });

  if (!cardProfile) {
    return createEmptyCardResult(disciplinaryState);
  }

  const playerSide = foulResult.by;
  const player = getCardedPlayer(context, playerSide);
  const currentDiscipline = getPlayerDisciplinaryState(
    disciplinaryState,
    playerSide,
    player.id
  );
  const teamSentOffCount = getTeamSentOffCount(disciplinaryState, playerSide);

  const redChance = getRedCardChance({
    action: cardProfile.action,
    outcome,
    foulResult,
    mode: cardProfile.mode,
  });

  const yellowChance = getYellowCardChance({
    action: cardProfile.action,
    outcome,
    foulResult,
    mode: cardProfile.mode,
  });

  const redRoll = random();

  const rawCard: CardType =
    redRoll < redChance
      ? "red"
      : random() < yellowChance
        ? "yellow"
        : "none";

  if (rawCard === "none") {
    return createEmptyCardResult(disciplinaryState);
  }

  const resolution = resolveAppliedCard({
    player,
    rawCard,
    currentDiscipline,
    teamSentOffCount,
  });

  if (resolution.card === "none") {
    return createEmptyCardResult(disciplinaryState);
  }

  const nextPlayerDiscipline: PlayerDisciplinaryState = {
    yellowCards: resolution.yellowCards,
    redCard: resolution.sentOff,
    sentOff: resolution.sentOff,
    dismissalType: resolution.dismissalType,
  };

  return {
    card: resolution.card,
    playerId: player.id,
    playerSide,
    sentOff: resolution.sentOff,
    dismissalType: resolution.dismissalType,
    disciplinaryState: {
      ...disciplinaryState,
      [getDisciplinaryKey(playerSide, player.id)]: nextPlayerDiscipline,
    },
  };
}

function getYellowCardChance(params: {
  action: DuelContext["action"];
  outcome: EventOutcome;
  foulResult: FoulResult;
  mode: CardChanceMode;
}): number {
  const { action, outcome, foulResult, mode } = params;

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

  chance += getYellowOutcomeModifier(outcome, mode);

  if (foulResult.setPieceAwarded === "penalty") {
    chance += 0.08;
  }

  return clamp(chance, 0, 0.95);
}

function getRedCardChance(params: {
  action: DuelContext["action"];
  outcome: EventOutcome;
  foulResult: FoulResult;
  mode: CardChanceMode;
}): number {
  const { action, outcome, foulResult, mode } = params;

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

  chance += getRedOutcomeModifier(outcome, mode);

  if (foulResult.setPieceAwarded === "penalty") {
    chance += 0.07;
  }

  return clamp(chance, 0, 0.6);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createEmptyCardResult(
  disciplinaryState: MatchDisciplinaryState
): CardEngineResult {
  return {
    card: "none",
    playerId: null,
    playerSide: null,
    sentOff: false,
    dismissalType: "none",
    disciplinaryState,
  };
}

function getCardedPlayer(
  context: DuelContext,
  playerSide: PossessionSide
): MatchPlayer {
  return playerSide === "user"
    ? context.actors.userPlayer
    : context.actors.opponentPlayer;
}

function getCardChanceProfile(params: {
  context: DuelContext;
  outcome: EventOutcome;
  foulResult: FoulResult;
}): CardChanceProfile | null {
  const { context, outcome, foulResult } = params;
  const actionDefinition = getActionDefinition(context.action);

  if (actionDefinition.canCauseCard) {
    return {
      action: context.action,
      mode: "caused",
    };
  }

  if (!actionDefinition.canDrawFoul || !foulResult.committed) {
    return null;
  }

  const inferredAction = inferDrawnFoulCardAction({
    action: context.action,
    zone: context.zone,
    outcome,
    foulResult,
  });

  if (!inferredAction) {
    return null;
  }

  return {
    action: inferredAction,
    mode: "drawn",
  };
}

function inferDrawnFoulCardAction(params: {
  action: DuelContext["action"];
  zone: DuelContext["zone"];
  outcome: EventOutcome;
  foulResult: FoulResult;
}): ActionType | null {
  const { action, zone, outcome, foulResult } = params;

  switch (action) {
    case "dribble":
      if (
        foulResult.setPieceAwarded === "penalty" ||
        zone === "atk_box" ||
        zone === "atk_bigchance" ||
        zone === "atk_nearbox" ||
        outcome === "success_high"
      ) {
        return "slide_tackle";
      }

      return "tackle";

    case "sprint":
      if (
        foulResult.setPieceAwarded === "penalty" ||
        zone === "atk_box" ||
        zone === "atk_bigchance" ||
        zone === "atk_nearbox" ||
        outcome === "success_high"
      ) {
        return "slide_tackle";
      }

      return "shoulder_charge";

    case "shield":
      return "shoulder_charge";

    case "forward_pass":
      return "tackle";

    default:
      return null;
  }
}

function getYellowOutcomeModifier(
  outcome: EventOutcome,
  mode: CardChanceMode
): number {
  if (mode === "drawn") {
    switch (outcome) {
      case "success_high":
        return 0.12;
      case "success":
        return 0.06;
      case "fail":
        return -0.02;
      case "fail_high":
        return -0.05;
      default:
        return 0;
    }
  }

  switch (outcome) {
    case "fail_high":
      return 0.2;
    case "fail":
      return 0.08;
    case "success_high":
      return -0.08;
    default:
      return 0;
  }
}

function getRedOutcomeModifier(
  outcome: EventOutcome,
  mode: CardChanceMode
): number {
  if (mode === "drawn") {
    switch (outcome) {
      case "success_high":
        return 0.08;
      case "success":
        return 0.02;
      case "fail_high":
        return -0.01;
      default:
        return 0;
    }
  }

  switch (outcome) {
    case "fail_high":
      return 0.12;
    case "fail":
      return 0.03;
    default:
      return 0;
  }
}

function resolveAppliedCard(params: {
  player: MatchPlayer;
  rawCard: Exclude<CardType, "none">;
  currentDiscipline: PlayerDisciplinaryState;
  teamSentOffCount: number;
}): {
  card: CardType;
  yellowCards: number;
  sentOff: boolean;
  dismissalType: DismissalType;
} {
  const { player, rawCard, currentDiscipline, teamSentOffCount } = params;

  if (currentDiscipline.sentOff) {
    return {
      card: "none",
      yellowCards: currentDiscipline.yellowCards,
      sentOff: currentDiscipline.sentOff,
      dismissalType: currentDiscipline.dismissalType,
    };
  }

  if (player.role === "goalkeeper") {
    if (currentDiscipline.yellowCards >= 1) {
      return {
        card: "none",
        yellowCards: currentDiscipline.yellowCards,
        sentOff: false,
        dismissalType: "none",
      };
    }

    return {
      card: "yellow",
      yellowCards: 1,
      sentOff: false,
      dismissalType: "none",
    };
  }

  if (rawCard === "red") {
    if (teamSentOffCount >= 3) {
      return {
        card: "yellow",
        yellowCards: currentDiscipline.yellowCards + 1,
        sentOff: false,
        dismissalType: "none",
      };
    }

    return {
      card: "red",
      yellowCards: currentDiscipline.yellowCards,
      sentOff: true,
      dismissalType: "straight_red",
    };
  }

  const nextYellowCards = currentDiscipline.yellowCards + 1;

  if (nextYellowCards >= 2 && teamSentOffCount < 3) {
    return {
      card: "red",
      yellowCards: nextYellowCards,
      sentOff: true,
      dismissalType: "second_yellow",
    };
  }

  return {
    card: "yellow",
    yellowCards: nextYellowCards,
    sentOff: false,
    dismissalType: "none",
  };
}
