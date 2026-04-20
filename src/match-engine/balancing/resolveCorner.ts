import type { EventOutcome } from "../matchTypes";

export type CornerChoice = "short" | "cross" | "olympic";

export type CornerResult =
  | "short_kept"
  | "cross_claimed"
  | "cross_cleared"
  | "cross_box"
  | "cross_bigchance"
  | "goal"
  | "miss";

export interface CornerTaker {
  passing: number;
  shooting: number;
  overall: number;
}

export interface CornerGoalkeeper {
  handling: number;
  positioning: number;
  diving: number;
}

export interface ResolveCornerInput {
  choice: CornerChoice;
  taker: CornerTaker;
  goalkeeper: CornerGoalkeeper;
  random?: () => number;
}

export interface ResolveCornerOutput {
  choice: CornerChoice;
  result: CornerResult;

  /**
   * Só usado em "cross".
   * Para short/olympic fica null.
   */
  eventOutcome: EventOutcome | null;

  /**
   * Transparência / debug / UI
   */
  goalChance: number;
  missChance: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveCorner(input: ResolveCornerInput): ResolveCornerOutput {
  const {
    choice,
    taker,
    goalkeeper,
    random = Math.random,
  } = input;

  const takerPower =
    taker.passing * 0.7 +
    taker.shooting * 0.2 +
    taker.overall * 0.1;

  const goalkeeperPower =
    goalkeeper.handling * 0.4 +
    goalkeeper.positioning * 0.3 +
    goalkeeper.diving * 0.3;

  // ============================================================
  // 1) SHORT — sempre mantém a posse
  // ============================================================
  if (choice === "short") {
    return {
      choice,
      result: "short_kept",
      eventOutcome: null,
      goalChance: 0,
      missChance: 0,
    };
  }

  // ============================================================
  // 2) CROSS — traduz para EventOutcome e depois para CornerResult
  // ============================================================
  if (choice === "cross") {
    const crossScore =
      taker.passing * 0.55 +
      taker.overall * 0.2 +
      taker.shooting * 0.1 -
      (goalkeeperPower * 0.15);

    let successHighChance = clamp(
      16 + (crossScore - 75) * 0.45,
      8,
      28
    );

    let successChance = clamp(
      36 + (crossScore - 75) * 0.35,
      24,
      48
    );

    let failChance = clamp(
      28 - (crossScore - 75) * 0.2,
      16,
      36
    );

    let failHighChance =
      100 - successHighChance - successChance - failChance;

    failHighChance = clamp(failHighChance, 8, 28);

    const total =
      successHighChance + successChance + failChance + failHighChance;

    const scale = 100 / total;

    successHighChance *= scale;
    successChance *= scale;
    failChance *= scale;
    failHighChance *= scale;

    const roll = random() * 100;

    let eventOutcome: EventOutcome;

    if (roll < failHighChance) {
      eventOutcome = "fail_high";
    } else if (roll < failHighChance + failChance) {
      eventOutcome = "fail";
    } else if (roll < failHighChance + failChance + successChance) {
      eventOutcome = "success";
    } else {
      eventOutcome = "success_high";
    }

    let result: CornerResult;

    switch (eventOutcome) {
      case "fail_high":
        result = "cross_claimed";
        break;
      case "fail":
        result = "cross_cleared";
        break;
      case "success":
        result = "cross_box";
        break;
      case "success_high":
        result = "cross_bigchance";
        break;
      default: {
        const exhaustiveCheck: never = eventOutcome;
        throw new Error(`EventOutcome de escanteio não tratado: ${exhaustiveCheck}`);
      }
    }

    return {
      choice,
      result,
      eventOutcome,
      goalChance: 0,
      missChance: 0,
    };
  }

  // ============================================================
  // 3) OLYMPIC — apenas goal ou miss
  // ============================================================
  const trickPower =
    taker.passing * 0.55 +
    taker.shooting * 0.35 +
    taker.overall * 0.1;

  const goalChance = clamp(
    0.25 + (trickPower - 80) * 0.06 - (goalkeeperPower - 75) * 0.02,
    0.1,
    2
  );

  const roll = random() * 100;
  const result: CornerResult = roll < goalChance ? "goal" : "miss";

  return {
    choice,
    result,
    eventOutcome: null,
    goalChance,
    missChance: 100 - goalChance,
  };
}