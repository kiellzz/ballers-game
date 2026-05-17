/**
 * Calculates the next match minute with randomized progression.
 *
 * - Normal play (< 85 min): advances 0–3 minutes, triangular distribution
 *   centered around 1–2 (most common). Never allows more than 2 consecutive
 *   zero-minute turns to prevent the match from stalling.
 *
 * - Late game (≥ 85 min): advances 0 or 1 minute per action. Same
 *   consecutive-zero guard applies, guaranteeing the match ends within
 *   a reasonable number of actions after the 85th minute.
 */
export function calculateNextMinute(
  currentMinute: number,
  consecutiveZeros: number,
  random: () => number
): { nextMinute: number; nextConsecutiveZeros: number } {
  const isLateGame = currentMinute >= 85;

  // After 2 consecutive zero-minute turns, force at least 1 minute of progress
  const forceAdvance = consecutiveZeros >= 2;

  let delta: number;

  if (isLateGame) {
    delta = forceAdvance ? 1 : Math.round(random()); // 0 or 1
  } else {
    if (forceAdvance) {
      delta = Math.floor(random() * 3) + 1; // guaranteed 1, 2, or 3
    } else {
      // Triangular distribution: sum of two [0, 1.5] randoms → range 0–3, mean ~1.5
      delta = Math.round(random() * 1.5 + random() * 1.5);
    }
  }

  const nextMinute = Math.min(90, currentMinute + delta);
  const nextConsecutiveZeros = delta === 0 ? consecutiveZeros + 1 : 0;

  return { nextMinute, nextConsecutiveZeros };
}