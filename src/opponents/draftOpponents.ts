import {
  createRandomTeam,
  type OpponentTeam,
  type OpponentTier,
} from "./opponents";

export const DRAFT_ROUNDS = [
  {
    key: "round-of-16",
    label: "Round of 16",
    opponentName: "Rising Stars FC",
    tier: "low",
    averageMin: 82,
    averageMax: 83,
  },
  {
    key: "quarterfinal",
    label: "Quarterfinal",
    opponentName: "Prime Athletic",
    tier: "mid",
    averageMin: 84,
    averageMax: 85,
  },
  {
    key: "semifinal",
    label: "Semifinal",
    opponentName: "Elite Dominion",
    tier: "high",
    averageMin: 86,
    averageMax: 87,
  },
  {
    key: "final",
    label: "Final",
    opponentName: "World Legends XI",
    tier: "elite",
    averageMin: 89,
    averageMax: 90,
  },
] as const satisfies readonly {
  key: string;
  label: string;
  opponentName: string;
  tier: OpponentTier;
  averageMin: number;
  averageMax: number;
}[];

export type DraftRoundIndex = 0 | 1 | 2 | 3;
export type DraftMatchResult = "win" | "draw" | "loss";
export type DraftMatchResolution =
  | { kind: "eliminated" }
  | { kind: "repeat" }
  | { kind: "advance"; nextRound: DraftRoundIndex }
  | { kind: "champion" };

export function isDraftRoundIndex(value: unknown): value is DraftRoundIndex {
  return Number.isInteger(value) && typeof value === "number" && value >= 0 && value < DRAFT_ROUNDS.length;
}

export function resolveDraftMatch(
  currentRound: DraftRoundIndex,
  result: DraftMatchResult,
): DraftMatchResolution {
  if (result === "loss") return { kind: "eliminated" };
  if (result === "draw") return { kind: "repeat" };
  if (currentRound === DRAFT_ROUNDS.length - 1) return { kind: "champion" };
  return { kind: "advance", nextRound: (currentRound + 1) as DraftRoundIndex };
}

export function getOpponentAverage(opponent: OpponentTeam): number {
  if (opponent.players.length === 0) return 0;
  return opponent.players.reduce((total, player) => total + player.overall, 0) / opponent.players.length;
}

function createDraftRoundOpponent(roundIndex: DraftRoundIndex): OpponentTeam {
  const round = DRAFT_ROUNDS[roundIndex];
  let closestTeam: OpponentTeam | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  const targetAverage = (round.averageMin + round.averageMax) / 2;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const opponent = createRandomTeam(
      `draft-${round.key}`,
      round.opponentName,
      round.tier,
      round.averageMin,
      round.averageMax,
      { strictAverage: true },
    );
    const average = getOpponentAverage(opponent);
    const roundedAverage = Math.round(average);

    if (roundedAverage >= round.averageMin && roundedAverage <= round.averageMax) {
      return opponent;
    }

    const distance = Math.abs(average - targetAverage);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestTeam = opponent;
    }
  }

  throw new Error(
    `Unable to generate ${round.label} opponent inside the ${round.averageMin}-${round.averageMax} range` +
      (closestTeam ? ` (closest average: ${getOpponentAverage(closestTeam).toFixed(2)})` : ""),
  );
}

export function generateDraftOpponents(): OpponentTeam[] {
  return DRAFT_ROUNDS.map((_, index) => createDraftRoundOpponent(index as DraftRoundIndex));
}
