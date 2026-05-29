import type {
  GoalkeeperMatchPlayer,
  Zone,
  PossessionSide,
  ShotResult,
  EventOutcome,
} from "../matchTypes";

type GoalkeeperBigChanceAction = "rush_save" | "wait";

export function resolveOpenPlayShot(params: {
  zone: Zone;
  possession: PossessionSide;
  outcome: EventOutcome;
  random: () => number;
  gkAction?: GoalkeeperBigChanceAction;
  goalkeeper?: GoalkeeperMatchPlayer | null;
}): ShotResult {
  const { zone, possession, outcome, random, gkAction, goalkeeper = null } = params;

  const inBigChanceZone = zone === "atk_bigchance" || zone === "def_bigchance";
  const inAtkBox = zone === "atk_box";
  const inDefBox = zone === "def_box";
  const inBox = inAtkBox || inDefBox;

  function saveResult(controlledChance: number): ShotResult {
    const controlled = random() < clampChance(controlledChance);

    return {
      happened: true,
      outcome: "save",
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: controlled ? null : "corner",
    };
  }

  function blockedResult(cornerChance: number): ShotResult {
    return {
      happened: true,
      outcome: "blocked",
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: random() < cornerChance ? "corner" : null,
    };
  }

  // Attack keeps only a small share of rebounds; most become loose balls.
  function reboundPossession(attackingSide: PossessionSide): PossessionSide | null {
    return random() < 0.2 ? attackingSide : null;
  }

  function goalResult(): ShotResult {
    return {
      happened: true,
      outcome: "goal",
      scoredBy: possession,
      reboundKeptBy: null,
      setPieceAwarded: null,
    };
  }

  function reboundResult(): ShotResult {
    return {
      happened: true,
      outcome: "rebound",
      scoredBy: null,
      reboundKeptBy: reboundPossession(possession),
      setPieceAwarded: null,
    };
  }

  function postResult(): ShotResult {
    return {
      happened: true,
      outcome: "post",
      scoredBy: null,
      reboundKeptBy: reboundPossession(possession),
      setPieceAwarded: null,
    };
  }

  function missResult(): ShotResult {
    return {
      happened: true,
      outcome: "miss",
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: null,
    };
  }

  // Corner as a direct result for long-range shots (no rebound, clean transition).
  function cornerResult(): ShotResult {
    return {
      happened: true,
      outcome: "save",
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: "corner",
    };
  }

  function clampChance(value: number): number {
    return Math.max(0, Math.min(0.95, value));
  }

  function clampSigned(value: number): number {
    return Math.max(-1, Math.min(1, value));
  }

  function getGoalkeeperShotModifiers(isBoxShot: boolean) {
    if (goalkeeper === null) {
      return {
        goalDelta: 0,
        saveBandDelta: 0,
        controlDelta: 0,
      };
    }

    const shotStoppingScore =
      goalkeeper.overall * 0.26 +
      goalkeeper.stats.reflexes * 0.28 +
      goalkeeper.stats.positioning * 0.22 +
      goalkeeper.stats.diving * 0.14 +
      goalkeeper.stats.handling * 0.1;

    const normalized = clampSigned((shotStoppingScore - 82) / 14);

    return isBoxShot
      ? {
          goalDelta: -normalized * 0.045,
          saveBandDelta: normalized * 0.05,
          controlDelta: normalized * 0.11,
        }
      : {
          goalDelta: -normalized * 0.065,
          saveBandDelta: normalized * 0.075,
          controlDelta: normalized * 0.16,
        };
  }

  if (inBigChanceZone) {
    const roll = random();

    const isDefBigChance = zone === "def_bigchance";
    const effectiveGkAction: GoalkeeperBigChanceAction | null =
      isDefBigChance ? (gkAction ?? "wait") : null;

    let goalMod = 0;
    let saveMod = 0;
    let reboundMod = 0;
    let blockMod = 0;
    let missMod = 0;
    let controlledSaveMod = 0;

    if (effectiveGkAction === "rush_save") {
      goalMod = -0.12;
      saveMod = 0.12;
      reboundMod = 0.03;
      blockMod = -0.01;
      missMod = -0.02;
      controlledSaveMod = -0.08;
    }

    if (effectiveGkAction === "wait") {
      goalMod = 0.04;
      saveMod = -0.04;
      reboundMod = -0.01;
      blockMod = 0;
      missMod = 0.01;
      controlledSaveMod = 0.06;
    }

    if (outcome === "success_high") {
      const goalThreshold = clampChance(0.82 + goalMod);
      // Wider save band absorbs what was rebound (was 0.10, now 0.14)
      const saveThreshold = clampChance(goalThreshold + Math.max(0, 0.14 + saveMod));
      // Rebound tightened to ~3%
      const reboundThreshold = clampChance(saveThreshold + 0.03);

      if (roll < goalThreshold) {
        return goalResult();
      }

      if (roll < saveThreshold) {
        return saveResult(clampChance(0.25 + controlledSaveMod));
      }

      if (roll < reboundThreshold) {
        return reboundResult();
      }

      return missResult();
    }

    if (outcome === "success") {
      const goalThreshold = clampChance(0.68 + goalMod);
      // Wider save band (was 0.14, now 0.16)
      const saveThreshold = clampChance(goalThreshold + Math.max(0, 0.16 + saveMod));
      // Rebound tightened to ~4% (was 0.05)
      const reboundThreshold = clampChance(saveThreshold + Math.max(0, 0.04 + reboundMod));
      const blockThreshold = clampChance(
        reboundThreshold + Math.max(0, 0.05 + blockMod)
      );

      if (roll < goalThreshold) {
        return goalResult();
      }

      if (roll < saveThreshold) {
        return saveResult(clampChance(0.30 + controlledSaveMod));
      }

      if (roll < reboundThreshold) {
        return reboundResult();
      }

      if (roll < blockThreshold) {
        return blockedResult(0.88);
      }

      return missResult();
    }

    if (outcome === "fail") {
      const saveThreshold = clampChance(0.34 + saveMod);
      const blockThreshold = clampChance(
        saveThreshold + Math.max(0, 0.24 + blockMod)
      );
      // Post tightened to ~3% (was 0.05)
      const postThreshold = clampChance(blockThreshold + Math.max(0, 0.03 + reboundMod));
      const missThreshold = clampChance(postThreshold + Math.max(0, 0.34 + missMod));

      if (roll < saveThreshold) {
        return saveResult(clampChance(0.32 + controlledSaveMod));
      }

      if (roll < blockThreshold) {
        return blockedResult(0.88);
      }

      if (roll < postThreshold) {
        return postResult();
      }

      if (roll < missThreshold) {
        return missResult();
      }

      // Fallback: was reboundResult(), now missResult().
      return missResult();
    }

    return missResult();
  }

  if (outcome === "success_high") {
    const roll = random();
    const gkModifiers = getGoalkeeperShotModifiers(inBox);

  if (inBox) {
      const goalThreshold = clampChance(0.58 + gkModifiers.goalDelta);
      const saveThreshold = clampChance(
        goalThreshold + Math.max(0, 0.14 + gkModifiers.saveBandDelta)
      );

      if (roll < goalThreshold) {
        return goalResult();
      }

      if (roll < saveThreshold) {
        return saveResult(0.80 + gkModifiers.controlDelta);
      }

      // Rebound: ~4% (0.72 -> 0.76)
      if (roll < clampChance(saveThreshold + 0.04)) {
        return reboundResult();
      }

      if (roll < clampChance(saveThreshold + 0.16)) {
        return blockedResult(0.55);
      }

      // Post: ~3% (0.88 -> 0.91)
      if (roll < clampChance(saveThreshold + 0.19)) {
        return postResult();
      }

      return missResult();
    }

    // Outside box - success_high.
    const goalThreshold = clampChance(0.18 + gkModifiers.goalDelta);
    const saveThreshold = clampChance(
      goalThreshold + Math.max(0, 0.24 + gkModifiers.saveBandDelta)
    );

    if (roll < goalThreshold) return goalResult();
    if (roll < saveThreshold) return saveResult(0.5 + gkModifiers.controlDelta);
    if (roll < clampChance(saveThreshold + 0.20)) return reboundResult();
    if (roll < clampChance(saveThreshold + 0.30)) return cornerResult();
    if (roll < clampChance(saveThreshold + 0.55)) return missResult();
    return postResult();
  }

  if (outcome === "success") {
    const roll = random();
    const gkModifiers = getGoalkeeperShotModifiers(inBox);

    if (inBox) {
      const goalThreshold = clampChance(0.38 + gkModifiers.goalDelta);
      const saveThreshold = clampChance(
        goalThreshold + Math.max(0, 0.16 + gkModifiers.saveBandDelta)
      );

      if (roll < goalThreshold) {
        return goalResult();
      }

      if (roll < saveThreshold) {
        return saveResult(0.70 + gkModifiers.controlDelta);
      }

      // Rebound: ~5% (0.54 -> 0.59, was 0.54 -> 0.62 = 8%)
      if (roll < clampChance(saveThreshold + 0.04)) {
        return reboundResult();
      }

      if (roll < clampChance(saveThreshold + 0.20)) {
        return blockedResult(0.55);
      }

      // Post: ~3% (0.74 -> 0.77, was 0.74 -> 0.84 = 10%)
      if (roll < clampChance(saveThreshold + 0.23)) {
        return postResult();
      }

      return missResult();
    }

    // Outside box - success.
    const goalThreshold = clampChance(0.10 + gkModifiers.goalDelta);
    const saveThreshold = clampChance(
      goalThreshold + Math.max(0, 0.22 + gkModifiers.saveBandDelta)
    );

    if (roll < goalThreshold) return goalResult();
    if (roll < saveThreshold) return saveResult(0.5 + gkModifiers.controlDelta);
    if (roll < clampChance(saveThreshold + 0.20)) return reboundResult();
    if (roll < clampChance(saveThreshold + 0.30)) return cornerResult();
    if (roll < clampChance(saveThreshold + 0.65)) return missResult();
    return postResult();
  }

  if (outcome === "fail") {
    const roll = random();
    const gkModifiers = getGoalkeeperShotModifiers(inBox);

    if (inBox) {
      if (roll < 0.38) {
        return blockedResult(0.92);
      }

      const saveThreshold = clampChance(0.56 + gkModifiers.saveBandDelta);

      if (roll < saveThreshold) {
        return saveResult(0.42 + gkModifiers.controlDelta);
      }

      // Post: ~2% (0.56 -> 0.58, was 0.56 -> 0.61 = 5%)
      if (roll < clampChance(saveThreshold + 0.02)) {
        return postResult();
      }

      return missResult();
    }

    // Outside box - fail.
    const saveThreshold = clampChance(0.22 + gkModifiers.saveBandDelta);
    if (roll < saveThreshold) return saveResult(1);
    if (roll < clampChance(saveThreshold + 0.12)) return cornerResult();
    if (roll < clampChance(saveThreshold + 0.775)) return missResult();
    return postResult();
  }

  return missResult();
}
