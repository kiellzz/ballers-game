import type { PlayerMatchStatLine } from "./matchTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RATING = 6.0;
const MIN_RATING = 0;
const MAX_RATING = 10.0;

// ─────────────────────────────────────────────────────────────────────────────
// Position group helpers
// ─────────────────────────────────────────────────────────────────────────────

type PositionGroup = "gk" | "def" | "mid" | "att";

function getPositionGroup(position: string): PositionGroup {
  const pos = position.toLowerCase().trim();
  if (pos === "gk") return "gk";
  if (["cb", "lb", "rb", "lwb", "rwb"].includes(pos)) return "def";
  if (["cm", "cdm", "cam", "lm", "rm"].includes(pos)) return "mid";
  return "att"; // ST, LW, RW, CF, SS, etc.
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating weights per position group
//
// Each weight is the delta applied PER occurrence of that stat.
// Negative weights reduce the rating.
//
// CALIBRATION TARGETS
//   Average match  → ~6.0–6.8
//   Good match     → ~7.0–7.8
//   Standout       → ~7.8–8.5
//   Exceptional    → rarely > 9.0
//
// LATEST CHANGES (defender rebalance)
//   • def defensiveAction  0.45  → 0.22  (volume stat, era excessivo)
//   • def duelWin          0.24  → 0.10  (zagueiro ganha 15-25 duelos, inflava muito)
//   • def duelLoss        -0.13  → -0.14 (leve aumento para equilibrar nerf do duelWin)
//   • def tackleWon        0.36  → 0.22  (ainda acima de mid, mas sem distorcer)
//   • def interception     0.32  → 0.22  (idem)
//   • def clearance        0.18  → 0.10  (ação básica do zagueiro, não deve valer tanto)
//   • def successfulAction 0.050 → 0.022 (alinhado com mid/att)
//   • def failedAction    -0.05  → -0.06 (alinhado com mid/att)
//   • def pass             0.028 → 0.018 (volume stat; levemente acima de mid por posse)
// ─────────────────────────────────────────────────────────────────────────────

interface RatingWeights {
  // Offensive
  goal: number;
  assist: number;
  keyPass: number;
  bigChanceCreated: number;
  successfulDribble: number;
  cross: number;
  shotOnTarget: number;
  pass: number;
  // Defensive
  save: number;
  defensiveAction: number;
  // Negative
  goalConceded: number;
  failedDribble: number;
  lostPossession: number;
  successfulAction: number;
  failedAction: number;
  failedHighAction: number;
  duelWin: number;
  duelLoss: number;
  shotAttempt: number;
  shotMiss: number;
  shotBlocked: number;
  bigChanceMiss: number;
  penaltyMiss: number;
  yellowCard: number;
  dismissal: number;
  tackleWon: number;
  interception: number;
  block: number;
  clearance: number;
  concededByDefense: number;
  weakGoalConceded: number;
  highSave: number;
  penaltySave: number;
  cleanSheetGk: number;
  cleanSheetDef: number;
}

const WEIGHTS: Record<PositionGroup, RatingWeights> = {
  // ── Goalkeeper ─────────────────────────────────────────────────────────────
  gk: {
    goal:               0.6,
    assist:             0.3,
    keyPass:            0.06,
    bigChanceCreated:   0.12,
    successfulDribble:  0.04,
    cross:              0.04,
    shotOnTarget:       0.0,
    pass:               0.015,

    save:               0.3,
    defensiveAction:    0.08,

    goalConceded:      -0.64,
    failedDribble:     -0.05,
    lostPossession:    -0.10,

    successfulAction:   0.01,
    failedAction:      -0.04,
    failedHighAction:  -0.08,
    duelWin:            0.06,
    duelLoss:          -0.10,

    shotAttempt:        0,
    shotMiss:           0,
    shotBlocked:        0,
    bigChanceMiss:      0,
    penaltyMiss:       -0.80,
    yellowCard:        -0.30,
    dismissal:         -1.20,

    tackleWon:          0.20,
    interception:       0.15,
    block:              0.15,
    clearance:          0.06,

    concededByDefense:  0,
    weakGoalConceded:  -0.8,
    highSave:           0.25,
    penaltySave:        0.6,
    cleanSheetGk:       0.70,
    cleanSheetDef:      0,
  },

  // ── Defender ───────────────────────────────────────────────────────────────
  def: {
    goal:               1.2,
    assist:             0.8,
    keyPass:            0.20,
    bigChanceCreated:   0.28,
    successfulDribble:  0.08,
    cross:              0.12,
    shotOnTarget:       0.15,
    pass:               0.018,  // 0.028 → 0.018  ★

    save:               0.0,
    defensiveAction:    0.22,   // 0.45  → 0.22   ★

    goalConceded:       0.0,
    failedDribble:     -0.08,
    lostPossession:    -0.12,
    successfulAction:   0.022,  // 0.050 → 0.022  ★
    failedAction:      -0.06,   // -0.05 → -0.06  ★
    failedHighAction:  -0.10,
    duelWin:            0.10,   // 0.24  → 0.10   ★
    duelLoss:          -0.14,   // -0.13 → -0.14  ★
    shotAttempt:        0.04,
    shotMiss:          -0.10,
    shotBlocked:       -0.05,
    bigChanceMiss:     -0.20,
    penaltyMiss:       -0.80,
    yellowCard:        -0.35,
    dismissal:         -1.20,
    tackleWon:          0.22,   // 0.36  → 0.22   ★
    interception:       0.22,   // 0.32  → 0.22   ★
    block:              0.30,
    clearance:          0.10,   // 0.18  → 0.10   ★
    concededByDefense: -0.22,
    weakGoalConceded:   0,
    highSave:           0,
    penaltySave:        0,
    cleanSheetGk:       0,
    cleanSheetDef:      0.65,
  },

  // ── Midfielder ─────────────────────────────────────────────────────────────
  mid: {
    goal:               1.2,
    assist:             0.8,
    keyPass:            0.35,
    bigChanceCreated:   0.42,
    successfulDribble:  0.15,
    cross:              0.15,
    shotOnTarget:       0.22,
    pass:               0.015,

    save:               0.0,
    defensiveAction:    0.22,

    goalConceded:       0.0,
    failedDribble:     -0.10,
    lostPossession:    -0.12,

    successfulAction:   0.022,
    failedAction:      -0.06,
    failedHighAction:  -0.12,
    duelWin:            0.08,
    duelLoss:          -0.15,

    shotAttempt:        0.04,
    shotMiss:          -0.20,
    shotBlocked:       -0.15,
    bigChanceMiss:     -0.30,
    penaltyMiss:       -0.80,
    yellowCard:        -0.35,
    dismissal:         -1.20,

    tackleWon:          0.25,
    interception:       0.20,
    block:              0.20,
    clearance:          0.12,

    concededByDefense:  0,
    weakGoalConceded:   0,
    highSave:           0,
    penaltySave:        0,
    cleanSheetGk:       0,
    cleanSheetDef:      0,
  },

  // ── Attacker ───────────────────────────────────────────────────────────────
  att: {
    goal:               1.2,
    assist:             0.8,
    keyPass:            0.30,
    bigChanceCreated:   0.38,
    successfulDribble:  0.16,
    cross:              0.14,
    shotOnTarget:       0.22,
    pass:               0.016,

    save:               0.0,
    defensiveAction:    0.08,

    goalConceded:       0.0,
    failedDribble:     -0.20,
    lostPossession:    -0.20,

    successfulAction:   0.022,
    failedAction:      -0.06,
    failedHighAction:  -0.12,
    duelWin:            0.12,
    duelLoss:          -0.15,

    shotAttempt:        0.03,
    shotMiss:          -0.30,
    shotBlocked:       -0.20,
    bigChanceMiss:     -0.60,
    penaltyMiss:       -0.80,
    yellowCard:        -0.35,
    dismissal:         -1.20,

    tackleWon:          0.25,
    interception:       0.20,
    block:              0.20,
    clearance:          0.12,

    concededByDefense:  0,
    weakGoalConceded:   0,
    highSave:           0,
    penaltySave:        0,
    cleanSheetGk:       0,
    cleanSheetDef:      0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates a player's match rating.
 *
 * @param stats        The PlayerMatchStatLine for this player.
 * @param position     The player's position string (e.g. "GK", "CB", "ST").
 * @returns            A floating-point rating clamped to [0, 10.0].
 */
export function calculatePlayerRating(
  stats: PlayerMatchStatLine,
  position: string,
): number {
  const group = getPositionGroup(position);
  const w = WEIGHTS[group];
  const hasCleanSheet = (stats.teamGoalsConceded ?? 0) === 0;
  const cleanSheetBonus =
    hasCleanSheet && stats.cleanSheetBonusEligible > 0
      ? group === "gk"
        ? w.cleanSheetGk
        : group === "def"
          ? w.cleanSheetDef
          : 0
      : 0;

  const TEAM_GOAL_BONUS_PER_GROUP: Record<PositionGroup, number> = {
    gk:  0.10,
    def: 0.12,
    mid: 0.08,
    att: 0.05,
  };
  const teamGoalsScored = stats.teamGoalsScored ?? 0;
  const teamGoalBonus =
    teamGoalsScored > 0
      ? TEAM_GOAL_BONUS_PER_GROUP[group] * Math.sqrt(teamGoalsScored)
      : 0;

  const delta =
    stats.goals              * w.goal +
    stats.assists            * w.assist +
    stats.keyPasses          * w.keyPass +
    stats.bigChancesCreated  * w.bigChanceCreated +
    stats.successfulDribbles * w.successfulDribble +
    stats.crosses            * w.cross +
    (stats.successfulPasses ?? 0) * w.pass +
    stats.shotsOnTarget      * w.shotOnTarget +
    stats.saves              * w.save +
    stats.highSaves          * w.highSave +
    stats.penaltySaves       * w.penaltySave +
    stats.defensiveActions   * w.defensiveAction +
    stats.goalsConceded      * w.goalConceded +
    stats.failedDribbles     * w.failedDribble +
    stats.lostPossessions    * w.lostPossession +
    stats.successfulActions  * w.successfulAction +
    stats.failedActions      * w.failedAction +
    stats.failedHighActions  * w.failedHighAction +
    stats.duelWins           * w.duelWin +
    stats.duelLosses         * w.duelLoss +
    stats.shotAttempts       * w.shotAttempt +
    stats.shotsMissed        * w.shotMiss +
    stats.shotsBlocked       * w.shotBlocked +
    stats.bigChanceMisses    * w.bigChanceMiss +
    (stats.penaltyMisses ?? 0) * w.penaltyMiss +
    stats.yellowCards        * w.yellowCard +
    stats.dismissals         * w.dismissal +
    stats.tacklesWon         * w.tackleWon +
    stats.interceptions      * w.interception +
    stats.blocks             * w.block +
    stats.clearances         * w.clearance +
    stats.concededByDefense  * w.concededByDefense +
    stats.weakGoalsConceded  * w.weakGoalConceded +
    cleanSheetBonus +
    teamGoalBonus;

  const raw = BASE_RATING + delta;
  return Math.round(clamp(raw, MIN_RATING, MAX_RATING) * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating colour helper (for UI badges)
// ─────────────────────────────────────────────────────────────────────────────

export type RatingTier = "perfect" | "elite" | "good" | "average" | "poor" | "bad";

/**
 * Maps a numeric rating to a display tier used for badge colouring.
 *
 *  perfect ≥ 10.0 →  special (reserved for a flawless match)
 *  elite   ≥ 8.5  →  gold
 *  good    ≥ 7.0  →  green
 *  average ≥ 6.0  →  yellow
 *  poor    ≥ 5.0  →  orange
 *  bad     < 5.0  →  red
 */
export function getRatingTier(rating: number): RatingTier {
  if (rating >= 10.0) return "perfect";
  if (rating >= 8.5) return "elite";
  if (rating >= 7.0) return "good";
  if (rating >= 6.0) return "average";
  if (rating >= 5.0) return "poor";
  return "bad";
}

/**
 * Returns the CSS class suffix for a given rating tier.
 * Usage: `rating-badge--${getRatingClass(rating)}`
 */
export function getRatingClass(rating: number): RatingTier {
  return getRatingTier(rating);
}
