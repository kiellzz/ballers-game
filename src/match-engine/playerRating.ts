import type { PlayerMatchStatLine } from "./matchTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RATING = 6.0;
const MIN_RATING = 4.0;
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
// ─────────────────────────────────────────────────────────────────────────────

interface RatingWeights {
  // Offensive
  goal: number;
  assist: number;
  keyPass: number;        // pass that directly leads to a shot
  bigChanceCreated: number;
  successfulDribble: number;
  cross: number;          // successful cross
  shotOnTarget: number;
  // Defensive
  save: number;           // goalkeeper save
  defensiveAction: number; // tackle / intercept / block / clearance won
  // Negative
  goalConceded: number;   // for GK only
  failedDribble: number;
  lostPossession: number;
}

const WEIGHTS: Record<PositionGroup, RatingWeights> = {
  gk: {
    goal: 0.6,
    assist: 0.3,
    keyPass: 0.1,
    bigChanceCreated: 0.2,
    successfulDribble: 0.05,
    cross: 0.05,
    shotOnTarget: 0.0,
    save: 0.7,
    defensiveAction: 0.2,
    goalConceded: -0.7,
    failedDribble: -0.05,
    lostPossession: -0.1,
  },
  def: {
    goal: 1.2,
    assist: 0.9,
    keyPass: 0.3,
    bigChanceCreated: 0.4,
    successfulDribble: 0.1,
    cross: 0.15,
    shotOnTarget: 0.2,
    save: 0.0,
    defensiveAction: 0.4,
    goalConceded: 0.0,
    failedDribble: -0.1,
    lostPossession: -0.15,
  },
  mid: {
    goal: 1.5,
    assist: 1.2,
    keyPass: 0.5,
    bigChanceCreated: 0.6,
    successfulDribble: 0.2,
    cross: 0.2,
    shotOnTarget: 0.3,
    save: 0.0,
    defensiveAction: 0.3,
    goalConceded: 0.0,
    failedDribble: -0.1,
    lostPossession: -0.12,
  },
  att: {
    goal: 2.0,
    assist: 1.4,
    keyPass: 0.6,
    bigChanceCreated: 0.8,
    successfulDribble: 0.3,
    cross: 0.25,
    shotOnTarget: 0.4,
    save: 0.0,
    defensiveAction: 0.1,
    goalConceded: 0.0,
    failedDribble: -0.15,
    lostPossession: -0.1,
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
 * @param isGoalkeeper Pass true for the goalkeeper so save/concede weights apply.
 * @returns            A floating-point rating clamped to [4.0, 10.0].
 */
export function calculatePlayerRating(
  stats: PlayerMatchStatLine,
  position: string,
): number {
  const group = getPositionGroup(position);
  const w = WEIGHTS[group];

  const delta =
    stats.goals              * w.goal +
    stats.assists            * w.assist +
    stats.keyPasses          * w.keyPass +
    stats.bigChancesCreated  * w.bigChanceCreated +
    stats.successfulDribbles * w.successfulDribble +
    stats.crosses            * w.cross +
    stats.shotsOnTarget      * w.shotOnTarget +
    stats.saves              * w.save +
    stats.defensiveActions   * w.defensiveAction +
    stats.goalsConceded      * w.goalConceded +
    stats.failedDribbles     * w.failedDribble +
    stats.lostPossessions    * w.lostPossession;

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