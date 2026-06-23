import {
  isDraftRoundIndex,
  type DraftRoundIndex,
} from "../../opponents/draftOpponents";

export type DraftCampaignOutcome =
  | { kind: "eliminated"; round: DraftRoundIndex }
  | { kind: "champion"; round: DraftRoundIndex };

export interface DraftCampaignPlayerStats {
  playerId: number;
  playerName: string;
  appearances: number;
  ratingTotal: number;
  goals: number;
  assists: number;
}

export interface DraftCampaignState {
  matchesPlayed: number;
  recordedRounds: DraftRoundIndex[];
  matchResults: DraftCampaignMatchResult[];
  playerStats: Record<string, DraftCampaignPlayerStats>;
  outcome: DraftCampaignOutcome | null;
}

export interface DraftCampaignMatchResult {
  round: DraftRoundIndex;
  userScore: number;
  opponentScore: number;
  penaltyShootoutScore: {
    user: number;
    opponent: number;
  } | null;
}

export interface DraftMatchPlayerPerformance {
  playerId: number;
  playerName: string;
  rating: number;
  goals: number;
  assists: number;
}

export interface DraftCampaignLeader {
  playerId: number;
  playerName: string;
  value: number;
}

export interface DraftCampaignLeaders {
  mvp: DraftCampaignLeader[];
  topScorers: DraftCampaignLeader[];
  topAssisters: DraftCampaignLeader[];
}

export function createEmptyDraftCampaign(): DraftCampaignState {
  return {
    matchesPlayed: 0,
    recordedRounds: [],
    matchResults: [],
    playerStats: {},
    outcome: null,
  };
}

export function recordDraftMatch(params: {
  campaign: DraftCampaignState;
  round: DraftRoundIndex;
  performances: DraftMatchPlayerPerformance[];
  score: { user: number; opponent: number };
  penaltyShootoutScore?: { user: number; opponent: number } | null;
}): DraftCampaignState {
  const { campaign, round, performances, score, penaltyShootoutScore = null } = params;

  if (campaign.recordedRounds.includes(round)) return campaign;

  const playerStats = { ...campaign.playerStats };

  for (const performance of performances) {
    const key = String(performance.playerId);
    const previous = playerStats[key] ?? {
      playerId: performance.playerId,
      playerName: performance.playerName,
      appearances: 0,
      ratingTotal: 0,
      goals: 0,
      assists: 0,
    };

    playerStats[key] = {
      ...previous,
      playerName: performance.playerName,
      appearances: previous.appearances + 1,
      ratingTotal: previous.ratingTotal + performance.rating,
      goals: previous.goals + performance.goals,
      assists: previous.assists + performance.assists,
    };
  }

  return {
    ...campaign,
    matchesPlayed: campaign.matchesPlayed + 1,
    recordedRounds: [...campaign.recordedRounds, round],
    matchResults: [
      ...campaign.matchResults,
      {
        round,
        userScore: score.user,
        opponentScore: score.opponent,
        penaltyShootoutScore,
      },
    ],
    playerStats,
  };
}

export function completeDraftCampaign(
  campaign: DraftCampaignState,
  outcome: DraftCampaignOutcome
): DraftCampaignState {
  return { ...campaign, outcome };
}

export function getDraftCampaignLeaders(
  campaign: DraftCampaignState
): DraftCampaignLeaders {
  const players = Object.values(campaign.playerStats);
  const averageRatings = players
    .filter((player) => player.appearances > 0)
    .map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      value: roundRating(player.ratingTotal / player.appearances),
    }));

  const highestAverage = Math.max(
    0,
    ...averageRatings.map((player) => player.value)
  );
  const highestGoals = Math.max(0, ...players.map((player) => player.goals));
  const highestAssists = Math.max(0, ...players.map((player) => player.assists));

  return {
    mvp: averageRatings.filter((player) => player.value === highestAverage),
    topScorers:
      highestGoals === 0
        ? []
        : players
            .filter((player) => player.goals === highestGoals)
            .map((player) => ({
              playerId: player.playerId,
              playerName: player.playerName,
              value: player.goals,
            })),
    topAssisters:
      highestAssists === 0
        ? []
        : players
            .filter((player) => player.assists === highestAssists)
            .map((player) => ({
              playerId: player.playerId,
              playerName: player.playerName,
              value: player.assists,
            })),
  };
}

export function normalizeDraftCampaign(value: unknown): DraftCampaignState {
  if (!value || typeof value !== "object") return createEmptyDraftCampaign();

  const raw = value as Partial<DraftCampaignState>;
  const recordedRounds = Array.isArray(raw.recordedRounds)
    ? raw.recordedRounds.filter(isDraftRoundIndex)
    : [];
  const matchResults = normalizeMatchResults(raw.matchResults);
  const playerStats: Record<string, DraftCampaignPlayerStats> = {};

  if (raw.playerStats && typeof raw.playerStats === "object") {
    for (const candidate of Object.values(raw.playerStats)) {
      if (!candidate || typeof candidate !== "object") continue;

      const stat = candidate as Partial<DraftCampaignPlayerStats>;
      if (
        typeof stat.playerId !== "number" ||
        typeof stat.playerName !== "string" ||
        typeof stat.appearances !== "number" ||
        typeof stat.ratingTotal !== "number" ||
        typeof stat.goals !== "number" ||
        typeof stat.assists !== "number"
      ) {
        continue;
      }

      playerStats[String(stat.playerId)] = {
        playerId: stat.playerId,
        playerName: stat.playerName,
        appearances: Math.max(0, stat.appearances),
        ratingTotal: Math.max(0, stat.ratingTotal),
        goals: Math.max(0, stat.goals),
        assists: Math.max(0, stat.assists),
      };
    }
  }

  const outcome = normalizeOutcome(raw.outcome);

  return {
    matchesPlayed:
      typeof raw.matchesPlayed === "number"
        ? Math.max(0, raw.matchesPlayed)
        : recordedRounds.length,
    recordedRounds,
    matchResults,
    playerStats,
    outcome,
  };
}

function normalizeMatchResults(value: unknown): DraftCampaignMatchResult[] {
  if (!Array.isArray(value)) return [];

  const seenRounds = new Set<DraftRoundIndex>();
  const results: DraftCampaignMatchResult[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;

    const result = candidate as Partial<DraftCampaignMatchResult>;
    if (
      !isDraftRoundIndex(result.round) ||
      seenRounds.has(result.round) ||
      typeof result.userScore !== "number" ||
      typeof result.opponentScore !== "number"
    ) {
      continue;
    }

    const shootout = result.penaltyShootoutScore;
    const penaltyShootoutScore =
      shootout &&
      typeof shootout.user === "number" &&
      typeof shootout.opponent === "number"
        ? {
            user: Math.max(0, Math.floor(shootout.user)),
            opponent: Math.max(0, Math.floor(shootout.opponent)),
          }
        : null;

    seenRounds.add(result.round);
    results.push({
      round: result.round,
      userScore: Math.max(0, Math.floor(result.userScore)),
      opponentScore: Math.max(0, Math.floor(result.opponentScore)),
      penaltyShootoutScore,
    });
  }

  return results;
}

function normalizeOutcome(value: unknown): DraftCampaignOutcome | null {
  if (!value || typeof value !== "object") return null;

  const outcome = value as Partial<DraftCampaignOutcome>;
  if (
    (outcome.kind === "eliminated" || outcome.kind === "champion") &&
    isDraftRoundIndex(outcome.round)
  ) {
    return { kind: outcome.kind, round: outcome.round };
  }

  return null;
}

function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}
