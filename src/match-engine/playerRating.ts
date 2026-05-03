import type { PlayerMatchStatLine } from "./matchTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RATING = 5.8;
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
// KEY CHANGES vs previous version
//   • BASE_RATING          6.0  → 5.8   (anchors distribution lower)
//   • successfulAction     cut ~25 %    (was the main inflation driver: fires on every open-play success)
//   • duelWin / duelLoss   cut ~25 %    (double-counts with successfulAction / failedAction)
//   • defensiveAction      cut ~15–25 % (high-volume stat for def/mid)
//   • save (GK)            0.6  → 0.45  (multiple saves per game were too generous)
//   • cleanSheetGk         1.0  → 0.7   (reward trimmed; saves already give value)
//   • cleanSheetDef        0.6  → 0.4
//   • goal ATT             2.0  → 1.8   (still the biggest single boost, just slightly tighter)
//   • bigChanceCreated ATT 0.68 → 0.5   (was stacking too easily with keyPass)
//   • keyPass ATT          0.5  → 0.4
//   • shotOnTarget ATT     0.4  → 0.3   (on-target shots are common for forwards)
//   • pass weights         slight trim  (volume stat)
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
    // Offensive (rare for GK — tiny weights)
    goal:               0.6,
    assist:             0.3,
    keyPass:            0.06,   // 0.08 → 0.06
    bigChanceCreated:   0.12,   // 0.15 → 0.12
    successfulDribble:  0.04,   // 0.05 → 0.04
    cross:              0.04,   // 0.05 → 0.04
    shotOnTarget:       0.0,
    pass:               0.015,  // 0.02 → 0.015

    // Defensive (core GK stats)
    save:               0.45,
    defensiveAction:    0.08,   // 0.15 → 0.08  (gk_clearance dispara muito)

    // Negative
    goalConceded:      -0.5,
    failedDribble:     -0.05,
    lostPossession:    -0.10,

    // Volume actions — GK distribui muito, peso mínimo
    successfulAction:   0.01,   // 0.03 → 0.01
    failedAction:      -0.04,   // -0.06 → -0.04
    failedHighAction:  -0.08,   // -0.10 → -0.08
    duelWin:            0.06,   // 0.15 → 0.06  (cada distribuição gera duelWin)
    duelLoss:          -0.10,   // -0.15 → -0.10

    // Shot-related (N/A for GK as attacker)
    shotAttempt:        0,
    shotMiss:           0,
    shotBlocked:        0,
    bigChanceMiss:      0,

    // Defensive specifics
    tackleWon:          0.20,   // 0.25 → 0.20
    interception:       0.15,   // 0.20 → 0.15
    block:              0.15,   // 0.20 → 0.15
    clearance:          0.06,   // 0.12 → 0.06  (gk_clearance é rotineiro)

    // Team/GK exclusives
    concededByDefense:  0,
    weakGoalConceded:  -0.30,
    highSave:           0.25,   // 0.30 → 0.25
    penaltySave:        0.50,
    cleanSheetGk:       0.70,   // 1.00 → 0.70  ★ main change
    cleanSheetDef:      0,
  },

  // ── Defender ───────────────────────────────────────────────────────────────
  def: {
    goal:               1.2,
    assist:             0.9,
    keyPass:            0.20,   // 0.25 → 0.20
    bigChanceCreated:   0.28,   // 0.35 → 0.28
    successfulDribble:  0.08,   // 0.10 → 0.08
    cross:              0.12,   // 0.15 → 0.12
    shotOnTarget:       0.15,   // 0.20 → 0.15
    pass:               0.022,  // 0.03 → 0.022

    save:               0.0,
    defensiveAction:    0.35,   // 0.30 → 0.35
    goalConceded:       0.0,
    failedDribble:     -0.10,
    lostPossession:    -0.15,
    successfulAction:   0.038,  // 0.032 → 0.038
    failedAction:      -0.06,
    failedHighAction:  -0.12,
    duelWin:            0.18,   // 0.15 → 0.18
    duelLoss:          -0.15,
    shotAttempt:        0.04,
    shotMiss:          -0.10,
    shotBlocked:       -0.05,
    bigChanceMiss:     -0.20,
    tackleWon:          0.28,   // 0.25 → 0.28
    interception:       0.24,   // 0.20 → 0.24
    block:              0.22,   // 0.20 → 0.22
    clearance:          0.14,   // 0.12 → 0.14
    concededByDefense: -0.25,   // -0.30 → -0.25
    weakGoalConceded:   0,
    highSave:           0,
    penaltySave:        0,
    cleanSheetGk:       0,
    cleanSheetDef:      0.55,   // 0.40 → 0.55
  },

  // ── Midfielder ─────────────────────────────────────────────────────────────
  mid: {
    goal:               1.5,
    assist:             1.2,
    keyPass:            0.35,   // 0.42 → 0.35
    bigChanceCreated:   0.42,   // 0.50 → 0.42
    successfulDribble:  0.15,   // 0.20 → 0.15
    cross:              0.15,   // 0.20 → 0.15
    shotOnTarget:       0.22,   // 0.30 → 0.22
    pass:               0.025,  // 0.035 → 0.025

    save:               0.0,
    defensiveAction:    0.22,   // 0.30 → 0.22  ★ main change

    goalConceded:       0.0,
    failedDribble:     -0.10,
    lostPossession:    -0.12,

    successfulAction:   0.035,  // 0.05 → 0.035
    failedAction:      -0.06,
    failedHighAction:  -0.12,
    duelWin:            0.15,   // 0.20 → 0.15
    duelLoss:          -0.15,   // -0.20 → -0.15

    shotAttempt:        0.04,   // 0.05 → 0.04
    shotMiss:          -0.20,
    shotBlocked:       -0.15,
    bigChanceMiss:     -0.30,

    tackleWon:          0.25,   // 0.30 → 0.25
    interception:       0.20,   // 0.25 → 0.20
    block:              0.20,   // 0.25 → 0.20
    clearance:          0.12,   // 0.15 → 0.12

    concededByDefense:  0,
    weakGoalConceded:   0,
    highSave:           0,
    penaltySave:        0,
    cleanSheetGk:       0,
    cleanSheetDef:      0,
  },

  // ── Attacker ───────────────────────────────────────────────────────────────
  att: {
    goal:               1.80,   // 2.00 → 1.80
    assist:             1.40,
    keyPass:            0.40,   // 0.50 → 0.40
    bigChanceCreated:   0.50,   // 0.68 → 0.50  ★ main change (was stacking with keyPass)
    successfulDribble:  0.22,   // 0.30 → 0.22
    cross:              0.20,   // 0.25 → 0.20
    shotOnTarget:       0.30,   // 0.40 → 0.30
    pass:               0.022,  // 0.03 → 0.022

    save:               0.0,
    defensiveAction:    0.08,   // 0.10 → 0.08

    goalConceded:       0.0,
    failedDribble:     -0.20,
    lostPossession:    -0.20,

    successfulAction:   0.032,  // 0.045 → 0.032
    failedAction:      -0.06,
    failedHighAction:  -0.12,
    duelWin:            0.15,   // 0.20 → 0.15
    duelLoss:          -0.15,   // -0.20 → -0.15

    shotAttempt:        0.04,   // 0.05 → 0.04
    shotMiss:          -0.30,
    shotBlocked:       -0.20,
    bigChanceMiss:     -0.60,

    tackleWon:          0.25,   // 0.30 → 0.25
    interception:       0.20,   // 0.25 → 0.20
    block:              0.20,   // 0.25 → 0.20
    clearance:          0.12,   // 0.15 → 0.12

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

  // Team goals scored bonus — scales with how many goals the team scored,
  // with sqrt for diminishing returns (a 5-0 win doesn't over-inflate).
  // Weight by sector: GK/DEF benefit most from team context; ATT already
  // earns heavily via goal and assist weights.
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

export type RatingTier = "elite" | "good" | "average" | "poor" | "bad";

/**
 * Maps a numeric rating to a display tier used for badge colouring.
 *
 *  elite   ≥ 8.5  →  gold
 *  good    ≥ 7.0  →  green
 *  average ≥ 6.0  →  yellow
 *  poor    ≥ 5.0  →  orange
 *  bad     < 5.0  →  red
 */
export function getRatingTier(rating: number): RatingTier {
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