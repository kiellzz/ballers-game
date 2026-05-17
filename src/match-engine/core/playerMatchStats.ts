import type {
  ActionType,
  EventOutcome,
  EventTransition,
  GoalDetails,
  MatchActors,
  PlayerMatchStats,
  PossessionSide,
  SetPieceType,
  ShotResult,
} from "../matchTypes";
import { emptyStatLine } from "../matchTypes";

// ─── Key builders ─────────────────────────────────────────────────────────────

function defenderSide(possession: PossessionSide): PossessionSide {
  return possession === "user" ? "opponent" : "user";
}

function attackerKey(possession: PossessionSide, actors: MatchActors): string {
  const id =
    possession === "user"
      ? actors.userPlayer.id
      : actors.opponentPlayer.id;
  return `${possession}:${id}`;
}

function defenderKey(possession: PossessionSide, actors: MatchActors): string {
  const side = defenderSide(possession);
  const id =
    side === "user"
      ? actors.userPlayer.id
      : actors.opponentPlayer.id;
  return `${side}:${id}`;
}

function statGkKey(side: PossessionSide, actors: MatchActors): string {
  const gk = side === "user" ? actors.userGoalkeeper : actors.opponentGoalkeeper;
  return `${side}:${gk.id}`;
}

// ─── Context type ─────────────────────────────────────────────────────────────

export interface EventStatContext {
  action: ActionType;
  outcome: EventOutcome | null;
  transition: EventTransition | null;
  shotResult: ShotResult;
  actors: MatchActors;
  possession: PossessionSide;
  isBigChance?: boolean;
  setPieceType?: SetPieceType | null;
}

// ─── Main function ────────────────────────────────────────────────────────────

export function applyEventToPlayerMatchStats(
  playerMatchStats: PlayerMatchStats,
  goalDetails: GoalDetails | null,
  ctx: EventStatContext
): PlayerMatchStats {
  const next: PlayerMatchStats = { ...playerMatchStats };

  function get(key: string) {
    return next[key] ? { ...next[key] } : emptyStatLine();
  }

  const {
    action,
    outcome,
    transition,
    shotResult,
    actors,
    possession,
    isBigChance = false,
    setPieceType = null,
  } = ctx;

  const atkKey  = attackerKey(possession, actors);
  const defKey  = defenderKey(possession, actors);
  const defSide = defenderSide(possession);

  const isSuccess = outcome === "success" || outcome === "success_high";
  const isFail    = outcome === "fail"    || outcome === "fail_high";

  // ── 0. Mark clean-sheet eligible roles ──────────────────────────────────────
  {
    const userGKKey = statGkKey("user", actors);
    const oppGKKey  = statGkKey("opponent", actors);
    const ugk = get(userGKKey);
    const ogk = get(oppGKKey);
    ugk.cleanSheetBonusEligible = 1;
    ogk.cleanSheetBonusEligible = 1;
    next[userGKKey] = ugk;
    next[oppGKKey]  = ogk;

    const userPos = actors.userPlayer.position.toLowerCase();
    const oppPos  = actors.opponentPlayer.position.toLowerCase();
    if (["cb", "lb", "rb"].includes(userPos)) {
      const st = get(`user:${actors.userPlayer.id}`);
      st.cleanSheetBonusEligible = 1;
      next[`user:${actors.userPlayer.id}`] = st;
    }
    if (["cb", "lb", "rb"].includes(oppPos)) {
      const st = get(`opponent:${actors.opponentPlayer.id}`);
      st.cleanSheetBonusEligible = 1;
      next[`opponent:${actors.opponentPlayer.id}`] = st;
    }
  }

  // ── 1. Goals, assists & GK/defense conceded tracking ────────────────────────
  if (goalDetails) {
    const scorerKey = `${goalDetails.scorerSide}:${goalDetails.scorerId}`;
    const sc = get(scorerKey);
    sc.goals += 1;
    next[scorerKey] = sc;

    if (goalDetails.assistPlayerId !== null) {
      const assistKey = `${goalDetails.scorerSide}:${goalDetails.assistPlayerId}`;
      const as = get(assistKey);
      as.assists += 1;
      next[assistKey] = as;
    }

    const concedingSide: PossessionSide =
      goalDetails.scorerSide === "user" ? "opponent" : "user";
    const gkk   = statGkKey(concedingSide, actors);
    const gkSt  = get(gkk);
    gkSt.goalsConceded += 1;
    if (action === "long_shot") {
      gkSt.weakGoalsConceded += 1;
    }
    next[gkk] = gkSt;

    for (const key of Object.keys(next)) {
      if (!key.startsWith(`${concedingSide}:`)) continue;
      const st = get(key);
      st.teamGoalsConceded = (st.teamGoalsConceded ?? 0) + 1;
      if (key !== gkk && st.cleanSheetBonusEligible > 0) {
        st.concededByDefense += 1;
      }
      next[key] = st;
    }

    for (const key of Object.keys(next)) {
      if (!key.startsWith(`${goalDetails.scorerSide}:`)) continue;
      const st = get(key);
      st.teamGoalsScored = (st.teamGoalsScored ?? 0) + 1;
      next[key] = st;
    }
  }

  // ── 2. Shots on target & GK saves ───────────────────────────────────────────
  if (shotResult.happened && shotResult.outcome === "save") {
    const atk = get(atkKey);
    atk.shotsOnTarget += 1;
    next[atkKey] = atk;

    const gkk  = statGkKey(defSide, actors);
    const gkSt = get(gkk);
    gkSt.saves += 1;
    if (outcome === "success_high") {
      gkSt.highSaves += 1;
    }
    if (setPieceType === "penalty") {
      gkSt.penaltySaves += 1;
    }
    next[gkk] = gkSt;
  }

  if (action === "long_shot" || action === "finish" || action === "header") {
    const atk = get(atkKey);
    const isRealBigChance = transition?.createdBigChance ?? isBigChance;
    atk.shotAttempts += 1;

    if (shotResult.happened && (shotResult.outcome === "miss" || shotResult.outcome === "post")) {
      atk.shotsMissed += 1;
      if (isRealBigChance) atk.bigChanceMisses += 1;
    }

    if (shotResult.happened && shotResult.outcome === "blocked") {
      atk.shotsBlocked += 1;
      if (isRealBigChance) atk.bigChanceMisses += 1;
    }

    next[atkKey] = atk;
  }

  if (setPieceType === "penalty" && shotResult.happened && shotResult.outcome !== "goal") {
    const atk = get(atkKey);
    atk.penaltyMisses += 1;
    next[atkKey] = atk;
  }

  // ── 3. Open-play outcome tracking ───────────────────────────────────────────
  if (outcome !== null) {

    // 3a. Volume action counters
    {
      const atk = get(atkKey);
      if (isSuccess) {
        atk.successfulActions += 1;
      } else if (outcome === "fail_high") {
        atk.failedHighActions += 1;
      } else {
        atk.failedActions += 1;
      }
      next[atkKey] = atk;
    }

    // 3b. Duel result
    const isDefensiveAction =
      action === "intercept" ||
      action === "tackle" ||
      action === "slide_tackle" ||
      action === "block" ||
      action === "shoulder_charge" ||
      action === "emergency_clearance" ||
      action === "clearance" ||
      action === "gk_clearance";

    if (!isDefensiveAction) {
      if (isSuccess) {
        const atk = get(atkKey);
        const def = get(defKey);
        atk.duelWins   += 1;
        def.duelLosses += 1;
        next[atkKey] = atk;
        next[defKey] = def;
      }

      if (isFail) {
        const atk = get(atkKey);
        const def = get(defKey);
        atk.duelLosses += 1;
        def.duelWins   += 1;
        next[atkKey] = atk;
        next[defKey] = def;
      }
    }

    // 3c. Offensive skill actions
    if (action === "dribble") {
      const atk = get(atkKey);
      if (isSuccess) atk.successfulDribbles += 1;
      if (isFail)    atk.failedDribbles     += 1;
      next[atkKey] = atk;
    }

    if (action === "cross" && isSuccess) {
      const atk = get(atkKey);
      atk.crosses += 1;
      next[atkKey] = atk;
    }

    if (
      isSuccess &&
      (action === "side_pass" || action === "forward_pass" || action === "long_pass")
    ) {
      const atk = get(atkKey);
      atk.successfulPasses = (atk.successfulPasses ?? 0) + 1;
      next[atkKey] = atk;
    }

    if (
      isSuccess &&
      transition?.createdBigChance &&
      (action === "forward_pass" || action === "long_pass" || action === "side_pass")
    ) {
      const atk = get(atkKey);
      atk.keyPasses += 1;
      next[atkKey] = atk;
    }

    if (isSuccess && transition?.createdBigChance) {
      const atk = get(atkKey);
      atk.bigChancesCreated += 1;
      next[atkKey] = atk;
    }

    if (
      isFail &&
      transition !== null &&
      transition.toPossession !== possession &&
      (action === "dribble" ||
        action === "sprint" ||
        action === "shield" ||
        action === "forward_pass" ||
        action === "long_pass" ||
        action === "side_pass" ||
        action === "cross")
    ) {
      const atk = get(atkKey);
      atk.lostPossessions += 1;
      next[atkKey] = atk;
    }

    // 3d. Defensive skill actions
    if (
      isSuccess &&
      (action === "intercept" ||
        action === "tackle" ||
        action === "slide_tackle" ||
        action === "block" ||
        action === "shoulder_charge" ||
        action === "emergency_clearance" ||
        action === "clearance" ||
        action === "gk_clearance")
    ) {
      const def = get(atkKey);
      def.defensiveActions += 1;
      if (action === "tackle" || action === "slide_tackle") def.tacklesWon    += 1;
      if (action === "intercept")                           def.interceptions += 1;
      if (action === "block")                               def.blocks        += 1;
      if (
        action === "clearance" ||
        action === "emergency_clearance" ||
        action === "gk_clearance"
      ) {
        def.clearances += 1;
      }
      next[atkKey] = def;
    }
  }

  return next;
}