export type FreeKickPlacement = "over_wall" | "around_wall";

export type FreeKickDistance = "short" | "mid" | "long";

export type FreeKickResult =
  | "goal"
  | "save_clean"
  | "save_touch"
  | "blocked_wall"
  | "miss";

export type FreeKickKeeperChoice = "left" | "right" | "center";

export interface FreeKickTaker {
  shooting: number;
  passing: number;
  overall: number;
}

export interface FreeKickGoalkeeper {
  reflexes: number;
  diving: number;
}

export interface ResolveFkInput {
  placement: FreeKickPlacement;
  distance: FreeKickDistance;
  taker: FreeKickTaker;
  goalkeeper: FreeKickGoalkeeper;
  random?: () => number;
}

export interface ResolveFkOutput {
  placement: FreeKickPlacement;
  distance: FreeKickDistance;
  keeperChoice: FreeKickKeeperChoice;
  result: FreeKickResult;
  blockedChance: number;
  missChance: number;
  scoreChance: number;
  saveChance: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDistanceModifier(distance: FreeKickDistance): number {
  switch (distance) {
    case "short":
      return 10;
    case "mid":
      return 0;
    case "long":
      return -14;
    default:
      return 0;
  }
}

function getPlacementModifier(placement: FreeKickPlacement): number {
  switch (placement) {
    case "over_wall":
      return 2;
    case "around_wall":
      return -10;
    default:
      return 0;
  }
}

// Keeper always dives to the correct side — purely visual, does not
// affect the outcome probability (see resolveFk below).
function pickKeeperChoice(placement: FreeKickPlacement): FreeKickKeeperChoice {
  return placement === "over_wall" ? "left" : "right";
}

export function resolveFk(input: ResolveFkInput): ResolveFkOutput {
  const {
    placement,
    distance,
    taker,
    goalkeeper,
    random = Math.random,
  } = input;

  const takerPower =
    taker.shooting * 0.58 +
    taker.passing * 0.34 +
    taker.overall * 0.08;

  const goalkeeperPower =
    goalkeeper.reflexes * 0.52 +
    goalkeeper.diving * 0.48;

  // Keeper direction is now purely cosmetic — always correct side.
  const keeperChoice = pickKeeperChoice(placement);

  let blockedChance: number;

  if (placement === "over_wall") {
    blockedChance = clamp(
      30 - (takerPower - 75) * 0.35 - getDistanceModifier(distance) * 0.6,
      20,
      48
    );
  } else {
    // around_wall goes around the wall — can never be blocked
    blockedChance = 0;
  }

  let missChance: number;

  if (placement === "around_wall") {
    missChance = clamp(
      24 - (takerPower - 75) * 0.45 - getDistanceModifier(distance) * 0.45,
      16,
      36
    );
  } else {
    missChance = clamp(
      10 - (takerPower - 75) * 0.25 - getDistanceModifier(distance) * 0.35,
      4,
      18
    );
  }

  const baseChance = 28 + (takerPower - goalkeeperPower) * 0.25;

  let scoreChance =
    baseChance +
    getDistanceModifier(distance) +
    getPlacementModifier(placement);

  scoreChance = clamp(scoreChance, 12, 58);

  const blockedRoll = random() * 100;

  if (blockedRoll < blockedChance) {
    return {
      placement,
      distance,
      keeperChoice,
      result: "blocked_wall",
      blockedChance,
      missChance,
      scoreChance,
      saveChance: 0,
    };
  }

  const missRoll = random() * 100;

  if (missRoll < missChance) {
    return {
      placement,
      distance,
      keeperChoice,
      result: "miss",
      blockedChance,
      missChance,
      scoreChance,
      saveChance: 0,
    };
  }

  // Outcome is determined purely by scoreChance vs goalkeeper power —
  // keeperChoice no longer influences the probability at all.
  let result: FreeKickResult = "goal";

  const duelRoll = random() * 100;

  if (duelRoll < scoreChance) {
    result = "goal";
  } else {
    const touchSaveChance = clamp(
      36 + (goalkeeperPower - takerPower) * 0.25,
      22,
      55
    );
    const touchRoll = random() * 100;
    result = touchRoll < touchSaveChance ? "save_touch" : "save_clean";
  }

  const saveChance =
    result === "save_clean" || result === "save_touch"
      ? 100 - scoreChance
      : 0;

  return {
    placement,
    distance,
    keeperChoice,
    result,
    blockedChance,
    missChance,
    scoreChance,
    saveChance,
  };
}