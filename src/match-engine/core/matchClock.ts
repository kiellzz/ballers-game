/**
 * Calculates the next match minute with randomized progression.
 *
 * - Normal play (< 83 min): advances 1 to 4 minutes with a flat random roll.
 *
 * - Late game (>= 83 min): advances 0 or 1 minute per action. Same
 *   consecutive-zero guard applies, guaranteeing the match ends within
 *   a reasonable number of actions after the 83rd minute.
 */
export function calculateNextMinute(
  currentMinute: number,
  consecutiveZeros: number,
  random: () => number
): { nextMinute: number; nextConsecutiveZeros: number } {
  const isLateGame = currentMinute >= 83;

  // After 2 consecutive zero-minute turns, force at least 1 minute of progress.
  const forceAdvance = consecutiveZeros >= 2;

  let delta: number;

  if (isLateGame) {
    delta = forceAdvance ? 1 : Math.round(random()); // 0 or 1
  } else {
    delta = Math.floor(random() * 4) + 1; // 1, 2, 3, or 4
  }

  const nextMinute = Math.min(90, currentMinute + delta);
  const nextConsecutiveZeros = delta === 0 ? consecutiveZeros + 1 : 0;

  return { nextMinute, nextConsecutiveZeros };
}
