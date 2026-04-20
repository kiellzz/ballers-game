import { getActionDefinition } from "./events";
import { getRestartAfterGoal } from "../goalRestart";

import type {
  DuelContext,
  EventOutcome,
  EventTransition,
  FoulResult,
  Lane,
  PossessionSide,
  SetPieceType,
  Zone,
  ShotResult,
} from "../matchTypes";

interface ResolveEventParams {
  context: DuelContext;
  outcome: EventOutcome;
  foulResult?: FoulResult | null;
  shotResult?: ShotResult | null;
  random?: () => number;
}

const OPEN_PLAY_ORDER: Zone[] = [
  "def_bigchance",
  "def_box",
  "def_nearbox",
  "def_third",
  "def_mid",
  "atk_mid",
  "atk_third",
  "atk_nearbox",
  "atk_box",
  "atk_bigchance",
];

export function resolveEventTransition(
  params: ResolveEventParams
): EventTransition {
  const {
    context,
    outcome,
    foulResult = null,
    shotResult = null,
    random = Math.random,
  } = params;

  const { zone, lane, possession, situationType, setPieceType } = context;
  const actionDefinition = getActionDefinition(context.action);

  // GK CLEARANCE -> OPEN PLAY RESET
  if (context.action === "gk_clearance") {
    const steps = random() < 0.5 ? 3 : 4;

    const nextZone =
      zone === "atk_goalkeeper"
        ? moveZone("atk_box", steps, "opponent")
        : moveZone("def_box", steps, "user");

    const nextLane = random() < 0.5 ? "left" : "right";

    const nextPossession: PossessionSide =
      zone === "atk_goalkeeper" ? "opponent" : "user";

    return {
      fromZone: zone,
      toZone: nextZone,
      fromLane: lane,
      toLane: normalizeLaneForZone(nextZone, nextLane, random),
      fromPossession: possession,
      toPossession: nextPossession,
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  const userSucceeded = outcome === "success" || outcome === "success_high";
  const opponentSucceeded = outcome === "fail" || outcome === "fail_high";

  if (situationType === "set_piece" && setPieceType) {
    return {
      fromZone: zone,
      toZone: zone,
      fromLane: lane,
      toLane: lane,
      fromPossession: possession,
      toPossession: possession,
      createdBigChance: false,
      nextSituationType: "set_piece",
      nextSetPieceType: setPieceType,
    };
  }

  if (
    foulResult?.committed &&
    foulResult.setPieceAwarded &&
    foulResult.awardedTo
  ) {
    const setPieceZone = getSetPieceZone({
      setPieceType: foulResult.setPieceAwarded,
      foulZone: zone,
      awardedTo: foulResult.awardedTo,
    });

    const setPieceLane = getSetPieceLane({
      setPieceType: foulResult.setPieceAwarded,
      foulZone: zone,
      currentLane: lane,
      random,
    });

    return {
      fromZone: zone,
      toZone: setPieceZone,
      fromLane: lane,
      toLane: normalizeLaneForZone(setPieceZone, setPieceLane, random),
      fromPossession: possession,
      toPossession: foulResult.awardedTo,
      createdBigChance:
        setPieceZone === "atk_bigchance" || setPieceZone === "def_bigchance",
      nextSituationType: "set_piece",
      nextSetPieceType: foulResult.setPieceAwarded,
    };
  }

  if (
    shotResult?.happened &&
    shotResult.outcome === "goal" &&
    shotResult.scoredBy
  ) {
    const restart = getRestartAfterGoal(shotResult.scoredBy);

    return {
      fromZone: zone,
      toZone: restart.nextZone,
      fromLane: lane,
      toLane: "center",
      fromPossession: possession,
      toPossession: restart.nextPossession,
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  if (
    shotResult?.happened &&
    shotResult.outcome === "save" &&
    shotResult.setPieceAwarded === null
  ) {
    const isUserShot = possession === "user";

    const nextZone: Zone = isUserShot ? "atk_goalkeeper" : "def_goalkeeper";

    const nextPossession: PossessionSide = isUserShot ? "opponent" : "user";

    return {
      fromZone: zone,
      toZone: nextZone,
      fromLane: lane,
      toLane: "center",
      fromPossession: possession,
      toPossession: nextPossession,
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  if (
    shotResult?.happened &&
    shotResult.outcome === "miss"
  ) {
    const isUserShot = possession === "user";

    return {
      fromZone: zone,
      toZone: isUserShot ? "atk_goalkeeper" : "def_goalkeeper",
      fromLane: lane,
      toLane: "center",
      fromPossession: possession,
      toPossession: isUserShot ? "opponent" : "user",
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  if (zone === "def_bigchance" && shotResult?.happened) {
    if (shotResult.outcome === "blocked") {
      const isCorner = shotResult.setPieceAwarded === "corner";

      return {
        fromZone: zone,
        toZone: isCorner ? "def_corner" : "def_box",
        fromLane: lane,
        toLane: isCorner ? (random() < 0.5 ? "left" : "right") : "center",
        fromPossession: possession,
        toPossession: isCorner ? "opponent" : "user",
        createdBigChance: false,
        nextSituationType: isCorner ? "set_piece" : "open_play",
        nextSetPieceType: isCorner ? "corner" : null,
      };
    }

    if (shotResult.outcome === "miss") {
      return {
        fromZone: zone,
        toZone: "def_goalkeeper",
        fromLane: lane,
        toLane: "center",
        fromPossession: possession,
        toPossession: "user",
        createdBigChance: false,
        nextSituationType: "open_play",
        nextSetPieceType: null,
      };
    }

    if (shotResult.outcome === "post" || shotResult.outcome === "rebound") {
      const attackerKeptBall = shotResult.reboundKeptBy === "opponent";

      return {
        fromZone: zone,
        toZone: attackerKeptBall ? "def_box" : "def_goalkeeper",
        fromLane: lane,
        toLane: "center",
        fromPossession: possession,
        toPossession: attackerKeptBall ? "opponent" : "user",
        createdBigChance: false,
        nextSituationType: "open_play",
        nextSetPieceType: null,
      };
    }
  }

  // CROSS FAIL -> resolvido de forma controlada (anti-loop)
if (
  context.action === "cross" &&
  (outcome === "fail" || outcome === "fail_high")
) {
  const cornerChance =
    zone === "atk_nearbox" || zone === "def_nearbox"
      ? 0.32
      : 0.18;

  const secondBallChance =
    zone === "atk_nearbox" || zone === "def_nearbox"
      ? 0.45
      : 0.35;

  const becomesCorner = random() < cornerChance;
  const secondBall = !becomesCorner && random() < secondBallChance;

  const goalkeeperZone: Zone =
    possession === "user" ? "atk_goalkeeper" : "def_goalkeeper";

  const cornerZone: Zone =
    possession === "user" ? "atk_corner" : "def_corner";

  const secondBallZone: Zone =
    possession === "user" ? "atk_nearbox" : "def_nearbox";

  const nextPossession: PossessionSide = becomesCorner
    ? possession
    : secondBall
      ? possession
      : possession === "user"
        ? "opponent"
        : "user";

  const nextZone = becomesCorner
    ? cornerZone
    : secondBall
      ? secondBallZone
      : goalkeeperZone;

  return {
    fromZone: zone,
    toZone: nextZone,
    fromLane: lane,
    toLane: becomesCorner
      ? lane === "left" || lane === "right"
        ? lane
        : random() < 0.5
          ? "left"
          : "right"
      : "center",
    fromPossession: possession,
    toPossession: nextPossession,
    createdBigChance: false,
    nextSituationType: becomesCorner ? "set_piece" : "open_play",
    nextSetPieceType: becomesCorner ? "corner" : null,
  };
}

  // DEF BIG CHANCE -> locked until resolved through a shot (mini duel between GK and attacker)
  if (zone === "def_bigchance" && situationType === "open_play") {
    return {
      fromZone: zone,
      toZone: zone,
      fromLane: lane,
      toLane: "center",
      fromPossession: possession,
      toPossession: possession,
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  // CLEARANCE / EMERGENCY_CLEARANCE -> special relief logic
  if (
    context.action === "clearance" ||
    context.action === "emergency_clearance"
  ) {
    return resolveClearanceTransition({ context, outcome, random });
  }

  if (userSucceeded) {
    const userCanRecoverDefensively =
      possession === "opponent" &&
      actionDefinition.defensiveRecoverRange !== undefined;

    if (userCanRecoverDefensively) {
      const steps = getDefensiveRecoverSteps({
        outcome,
        min: actionDefinition.defensiveRecoverRange?.min ?? 1,
        max: actionDefinition.defensiveRecoverRange?.max ?? 1,
        random,
      });

      const nextPossession: PossessionSide = "user";
      let nextZone = moveZone(zone, steps, "user");

      nextZone = normalizeAggressiveUserProgression({
        fromZone: zone,
        toZone: nextZone,
        outcome,
        actionType: context.action,
      });

      const nextLane = getNextLaneOnDefensiveRecovery({
        currentLane: lane,
        nextZone,
        random,
      });

      return {
        fromZone: zone,
        toZone: nextZone,
        fromLane: lane,
        toLane: normalizeLaneForZone(nextZone, nextLane),
        fromPossession: possession,
        toPossession: nextPossession,
        createdBigChance: false,
        nextSituationType: "open_play",
        nextSetPieceType: null,
      };
    }

    const steps = getSuccessSteps({
      outcome,
      min: actionDefinition.successAdvanceRange?.min ?? 1,
      max: actionDefinition.successAdvanceRange?.max ?? 1,
      random,
    });

    const createdBigChance =
      Boolean(actionDefinition.canCreateBigChance) &&
      shouldCreateBigChance({
        zone,
        outcome,
        actionType: context.action,
        random,
      });

    const nextPossession: PossessionSide = "user";

    let nextZone = createdBigChance
      ? "atk_bigchance"
      : moveZone(zone, steps, "user");

    nextZone = normalizeAggressiveUserProgression({
      fromZone: zone,
      toZone: nextZone,
      outcome,
      actionType: context.action,
    });

    const nextLane = getNextLaneOnSuccess({
      currentLane: lane,
      currentZone: zone,
      nextZone,
      actionType: context.action,
      random,
    });

    const normalizedZone = normalizeBigChanceExit(zone, nextZone);

    return {
      fromZone: zone,
      toZone: normalizedZone,
      fromLane: lane,
      toLane: normalizeLaneForZone(normalizedZone, nextLane),
      fromPossession: possession,
      toPossession: nextPossession,
      createdBigChance: normalizedZone === "atk_bigchance",
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  if (opponentSucceeded) {
    const steps = getFailSteps({
      outcome,
      min: actionDefinition.failRecoilRange?.min ?? 1,
      max: actionDefinition.failRecoilRange?.max ?? 1,
      random,
    });

    const nextPossession: PossessionSide = "opponent";
    let nextZone = moveZone(zone, steps, "opponent");

    nextZone = normalizeOpponentProgression({
      fromZone: zone,
      toZone: nextZone,
      outcome,
      actionType: context.action,
    });

    const nextLane = getNextLaneOnFailure({
      currentLane: lane,
      nextZone,
      random,
    });

    const normalizedZone = normalizeBigChanceExit(zone, nextZone);

    return {
      fromZone: zone,
      toZone: normalizedZone,
      fromLane: lane,
      toLane: normalizeLaneForZone(normalizedZone, nextLane),
      fromPossession: possession,
      toPossession: nextPossession,
      createdBigChance: normalizedZone === "def_bigchance",
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  return {
    fromZone: zone,
    toZone: zone,
    fromLane: lane,
    toLane: lane,
    fromPossession: possession,
    toPossession: possession,
    createdBigChance: false,
    nextSituationType: "open_play",
    nextSetPieceType: null,
  };
}

function resolveClearanceTransition(params: {
  context: DuelContext;
  outcome: EventOutcome;
  random: () => number;
}): EventTransition {
  const { context, outcome, random } = params;
  const { zone, lane, possession } = context;
  const isEmergency = context.action === "emergency_clearance";

  // Chance to keep possession: 20% for clearance, 15% for emergency_clearance
  const keepPossessionChance = isEmergency ? 0.15 : 0.2;

  const nextLane: Lane = random() < 0.5 ? "left" : "right";

  if (outcome === "success" || outcome === "success_high") {
    const keepsPossession = random() < keepPossessionChance;
    const nextPossession: PossessionSide = keepsPossession
      ? possession
      : possession === "user"
        ? "opponent"
        : "user";

    // clearance leaves the box; emergency_clearance travels even less far
    const nextZone = resolveClearanceSuccessZone({
      fromZone: zone,
      isEmergency,
      outcome,
      random,
    });

    return {
      fromZone: zone,
      toZone: nextZone,
      fromLane: lane,
      toLane: normalizeLaneForZone(nextZone, nextLane, random),
      fromPossession: possession,
      toPossession: nextPossession,
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    };
  }

  // fail / fail_high: opponent keeps possession in a dangerous zone
  const nextZone = resolveClearanceFailZone({ fromZone: zone, isEmergency });

  return {
    fromZone: zone,
    toZone: nextZone,
    fromLane: lane,
    toLane: normalizeLaneForZone(nextZone, "center", random),
    fromPossession: possession,
    toPossession: possession === "user" ? "opponent" : "user",
    createdBigChance: false,
    nextSituationType: "open_play",
    nextSetPieceType: null,
  };
}

function resolveClearanceSuccessZone(params: {
  fromZone: Zone;
  isEmergency: boolean;
  outcome: EventOutcome;
  random: () => number;
}): Zone {
  const { fromZone, isEmergency, outcome, random } = params;

  // emergency_clearance: the ball travels less far
  if (isEmergency) {
    if (fromZone === "def_bigchance" || fromZone === "def_box") {
      return random() < 0.6 ? "def_third" : "def_mid";
    }
    if (fromZone === "def_nearbox") {
      return random() < 0.5 ? "def_mid" : "atk_mid";
    }
    if (fromZone === "def_third") {
      return random() < 0.5 ? "def_mid" : "atk_mid";
    }
    // fallback: move forward by a reasonable step
    return "def_mid";
  }

  // normal clearance: the ball travels farther
  if (fromZone === "def_bigchance" || fromZone === "def_box") {
    if (outcome === "success_high") {
      return random() < 0.5 ? "atk_mid" : "def_mid";
    }
    return random() < 0.6 ? "def_mid" : "def_third";
  }

  if (fromZone === "def_nearbox") {
    if (outcome === "success_high") {
      return random() < 0.5 ? "atk_mid" : "atk_third";
    }
    return random() < 0.5 ? "atk_mid" : "def_mid";
  }

  if (fromZone === "def_third") {
    if (outcome === "success_high") {
      return random() < 0.5 ? "atk_third" : "atk_mid";
    }
    return random() < 0.5 ? "atk_mid" : "def_mid";
  }

  // more advanced zones: smaller relief
  return "def_mid";
}

function resolveClearanceFailZone(params: {
  fromZone: Zone;
  isEmergency: boolean;
}): Zone {
  const { fromZone, isEmergency } = params;

  if (isEmergency) {
    // desperate failure: the ball stays in a very dangerous zone
    if (fromZone === "def_bigchance") return "def_bigchance";
    if (fromZone === "def_box") return "def_box";
    return "def_nearbox";
  }

  // failed regular clearance: dangerous / semi-dangerous zone
  if (fromZone === "def_bigchance" || fromZone === "def_box") {
    return "def_box";
  }

  return "def_nearbox";
}

function getSuccessSteps(params: {
  outcome: EventOutcome;
  min: number;
  max: number;
  random: () => number;
}): number {
  const { outcome, min, max, random } = params;

  if (outcome === "success_high") {
    return randomInt(Math.max(min, max - 1), max, random);
  }

  return randomInt(min, max, random);
}

function getFailSteps(params: {
  outcome: EventOutcome;
  min: number;
  max: number;
  random: () => number;
}): number {
  const { outcome, min, max, random } = params;

  if (outcome === "fail_high") {
    return randomInt(Math.max(min, max - 1), max, random);
  }

  return randomInt(min, max, random);
}

function getDefensiveRecoverSteps(params: {
  outcome: EventOutcome;
  min: number;
  max: number;
  random: () => number;
}): number {
  const { outcome, min, max, random } = params;

  if (outcome === "success_high") {
    return randomInt(Math.max(min, max - 1), max, random);
  }

  return randomInt(min, max, random);
}

function moveZone(
  currentZone: Zone,
  steps: number,
  sideFavored: PossessionSide
): Zone {
  const currentIndex = OPEN_PLAY_ORDER.indexOf(currentZone);

  if (currentIndex === -1) {
    throw new Error(`Invalid zone: ${currentZone}`);
  }

  const direction = sideFavored === "user" ? 1 : -1;
  const nextIndex = clamp(
    currentIndex + steps * direction,
    0,
    OPEN_PLAY_ORDER.length - 1
  );

  return OPEN_PLAY_ORDER[nextIndex];
}

function shouldCreateBigChance(params: {
  zone: Zone;
  outcome: EventOutcome;
  actionType: DuelContext["action"];
  random: () => number;
}): boolean {
  const { zone, outcome, actionType, random } = params;

  if (outcome === "success_high") {
    if (zone === "atk_box") {
      if (
        actionType === "dribble" ||
        actionType === "sprint" ||
        actionType === "forward_pass" ||
        actionType === "cross"
      ) {
        return random() < 0.45;
      }

      return random() < 0.25;
    }

    if (zone === "atk_nearbox") {
      if (
        actionType === "dribble" ||
        actionType === "sprint" ||
        actionType === "forward_pass" ||
        actionType === "counterattack"
      ) {
        return random() < 0.3;
      }

      return random() < 0.15;
    }

    if (zone === "atk_third") {
      if (
        actionType === "dribble" ||
        actionType === "sprint" ||
        actionType === "forward_pass" ||
        actionType === "long_pass" ||
        actionType === "counterattack"
      ) {
        return random() < 0.12;
      }

      return random() < 0.06;
    }
  }

  if (outcome === "success") {
    if (zone === "atk_box") {
      if (actionType === "dribble" || actionType === "sprint") {
        return random() < 0.18;
      }

      return random() < 0.08;
    }

    if (zone === "atk_nearbox") {
      if (
        actionType === "dribble" ||
        actionType === "sprint" ||
        actionType === "forward_pass" ||
        actionType === "counterattack"
      ) {
        return random() < 0.1;
      }

      return random() < 0.04;
    }

    if (zone === "atk_third") {
      if (actionType === "counterattack" || actionType === "long_pass") {
        return random() < 0.04;
      }

      return false;
    }
  }

  return false;
}

function normalizeAggressiveUserProgression(params: {
  fromZone: Zone;
  toZone: Zone;
  outcome: EventOutcome;
  actionType: DuelContext["action"];
}): Zone {
  const { fromZone, toZone, outcome, actionType } = params;

  if (outcome !== "success" && outcome !== "success_high") {
    return toZone;
  }

  if (fromZone === "atk_mid" && toZone === "atk_mid") {
    return "atk_third";
  }

  if (fromZone === "atk_third" && toZone === "atk_third") {
    if (
      actionType === "dribble" ||
      actionType === "sprint" ||
      actionType === "forward_pass" ||
      actionType === "cross" ||
      actionType === "counterattack"
    ) {
      return "atk_nearbox";
    }
  }

  if (fromZone === "atk_nearbox" && toZone === "atk_nearbox") {
    if (
      actionType === "dribble" ||
      actionType === "sprint" ||
      actionType === "cross"
    ) {
      return "atk_box";
    }
  }

  if (
    fromZone === "def_mid" &&
    toZone === "atk_mid" &&
    outcome === "success_high"
  ) {
    return "atk_third";
  }

  if (
    fromZone === "def_third" &&
    toZone === "def_mid" &&
    outcome === "success_high"
  ) {
    return "atk_mid";
  }

  return toZone;
}

function normalizeOpponentProgression(params: {
  fromZone: Zone;
  toZone: Zone;
  outcome: EventOutcome;
  actionType: DuelContext["action"];
}): Zone {
  const { fromZone, toZone, outcome, actionType } = params;

  if (outcome !== "fail" && outcome !== "fail_high") {
    return toZone;
  }

  if (fromZone === "def_mid" && toZone === "def_mid") {
    return "atk_mid";
  }

  if (fromZone === "atk_mid" && toZone === "atk_mid") {
    if (
      actionType === "dribble" ||
      actionType === "sprint" ||
      actionType === "forward_pass" ||
      actionType === "counterattack"
    ) {
      return "def_mid";
    }
  }

  if (fromZone === "atk_third" && toZone === "atk_third") {
    return "def_mid";
  }

  if (fromZone === "atk_nearbox" && toZone === "atk_nearbox") {
    return "def_third";
  }

  return toZone;
}

function normalizeBigChanceExit(fromZone: Zone, nextZone: Zone): Zone {
  if (fromZone === "atk_bigchance" && nextZone === "atk_bigchance") {
    return "atk_box";
  }

  // FIXED: def_bigchance stays locked until resolved by a shot
  if (fromZone === "def_bigchance" && nextZone === "def_bigchance") {
    return "def_bigchance";
  }

  return nextZone;
}

function getSetPieceZone(params: {
  setPieceType: SetPieceType;
  foulZone: Zone;
  awardedTo: PossessionSide;
  preferredLane?: Lane;
  random?: () => number;
}): Zone {
  const { setPieceType, foulZone, awardedTo } = params;

  if (setPieceType === "penalty") {
    return awardedTo === "user" ? "atk_bigchance" : "def_bigchance";
  }

  if (setPieceType === "corner") {
    return awardedTo === "user" ? "atk_corner" : "def_corner";
  }

  return foulZone;
}

function getSetPieceLane(params: {
  setPieceType: SetPieceType;
  foulZone: Zone;
  currentLane: Lane;
  random: () => number;
}): Lane {
  const { setPieceType, foulZone, currentLane, random } = params;

  if (setPieceType === "penalty") {
    return "center";
  }

  if (setPieceType === "corner") {
    if (currentLane === "left" || currentLane === "right") {
      return currentLane;
    }

    return random() < 0.5 ? "left" : "right";
  }

  if (setPieceType === "freekick") {
    if (
      foulZone === "atk_nearbox" ||
      foulZone === "def_nearbox" ||
      foulZone === "atk_corner" ||
      foulZone === "def_corner"
    ) {
      return currentLane === "center"
        ? random() < 0.5
          ? "left"
          : "right"
        : currentLane;
    }

    return "center";
  }

  return currentLane;
}

function getNextLaneOnSuccess(params: {
  currentLane: Lane;
  currentZone: Zone;
  nextZone: Zone;
  actionType: DuelContext["action"];
  random: () => number;
}): Lane {
  const { currentLane, nextZone, actionType, random } = params;

  if (
    nextZone === "atk_box" ||
    nextZone === "def_box" ||
    nextZone === "atk_bigchance" ||
    nextZone === "def_bigchance"
  ) {
    return "center";
  }

  if (actionType === "cross") {
    return "center";
  }

  if (actionType === "side_pass") {
    if (currentLane === "center") {
      return random() < 0.5 ? "left" : "right";
    }
    return "center";
  }

  if (actionType === "dribble" || actionType === "sprint") {
    if (currentLane !== "center" && random() < 0.45) {
      return "center";
    }
  }

  if (
    (nextZone === "atk_nearbox" || nextZone === "def_nearbox") &&
    currentLane === "center"
  ) {
    return random() < 0.5 ? "left" : "right";
  }

  return currentLane;
}

function getNextLaneOnFailure(params: {
  currentLane: Lane;
  nextZone: Zone;
  random: () => number;
}): Lane {
  const { currentLane, nextZone, random } = params;

  if (
    nextZone === "atk_box" ||
    nextZone === "def_box" ||
    nextZone === "atk_bigchance" ||
    nextZone === "def_bigchance"
  ) {
    return "center";
  }

  if (currentLane === "center") {
    return random() < 0.5 ? "left" : "right";
  }

  return currentLane;
}

function getNextLaneOnDefensiveRecovery(params: {
  currentLane: Lane;
  nextZone: Zone;
  random: () => number;
}): Lane {
  const { currentLane, nextZone, random } = params;

  if (
    nextZone === "atk_box" ||
    nextZone === "def_box" ||
    nextZone === "atk_bigchance" ||
    nextZone === "def_bigchance"
  ) {
    return "center";
  }

  if (currentLane !== "center" && random() < 0.35) {
    return "center";
  }

  return currentLane;
}

function normalizeLaneForZone(
  zone: Zone,
  preferredLane: Lane,
  random?: () => number
): Lane {
  const rng = random ?? Math.random;

  if (zone === "atk_goalkeeper" || zone === "def_goalkeeper") {
    return "center";
  }

  if (
    zone === "atk_box" ||
    zone === "def_box" ||
    zone === "atk_bigchance" ||
    zone === "def_bigchance"
  ) {
    return "center";
  }

  if (
    zone === "atk_nearbox" ||
    zone === "def_nearbox" ||
    zone === "atk_corner" ||
    zone === "def_corner"
  ) {
    return preferredLane === "center"
      ? rng() < 0.5
        ? "left"
        : "right"
      : preferredLane;
  }

  return preferredLane;
}

function randomInt(min: number, max: number, random: () => number): number {
  if (max <= min) {
    return min;
  }

  return Math.floor(random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
