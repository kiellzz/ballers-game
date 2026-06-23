import { describe, expect, it } from "vitest";
import {
  completeDraftCampaign,
  createEmptyDraftCampaign,
  getDraftCampaignLeaders,
  recordDraftMatch,
} from "./draftCampaign";

describe("draft campaign", () => {
  it("aggregates ratings, goals and assists across rounds", () => {
    let campaign = createEmptyDraftCampaign();
    campaign = recordDraftMatch({
      campaign,
      round: 0,
      score: { user: 2, opponent: 1 },
      performances: [
        { playerId: 1, playerName: "Alpha", rating: 8, goals: 1, assists: 0 },
        { playerId: 2, playerName: "Beta", rating: 7, goals: 0, assists: 1 },
      ],
    });
    campaign = recordDraftMatch({
      campaign,
      round: 1,
      score: { user: 1, opponent: 1 },
      penaltyShootoutScore: { user: 5, opponent: 4 },
      performances: [
        { playerId: 1, playerName: "Alpha", rating: 9, goals: 2, assists: 1 },
        { playerId: 2, playerName: "Beta", rating: 8, goals: 0, assists: 2 },
      ],
    });

    expect(campaign.playerStats["1"]).toMatchObject({
      appearances: 2,
      ratingTotal: 17,
      goals: 3,
      assists: 1,
    });
    expect(campaign.matchResults).toEqual([
      {
        round: 0,
        userScore: 2,
        opponentScore: 1,
        penaltyShootoutScore: null,
      },
      {
        round: 1,
        userScore: 1,
        opponentScore: 1,
        penaltyShootoutScore: { user: 5, opponent: 4 },
      },
    ]);
    expect(getDraftCampaignLeaders(campaign)).toMatchObject({
      mvp: [{ playerId: 1, value: 8.5 }],
      topScorers: [{ playerId: 1, value: 3 }],
      topAssisters: [{ playerId: 2, value: 3 }],
    });
  });

  it("preserves tied leaders and returns no scoring leader at zero", () => {
    let campaign = createEmptyDraftCampaign();
    campaign = recordDraftMatch({
      campaign,
      round: 0,
      score: { user: 0, opponent: 0 },
      performances: [
        { playerId: 1, playerName: "Alpha", rating: 8.04, goals: 0, assists: 0 },
        { playerId: 2, playerName: "Beta", rating: 8.03, goals: 0, assists: 0 },
      ],
    });

    const leaders = getDraftCampaignLeaders(campaign);
    expect(leaders.mvp).toHaveLength(2);
    expect(leaders.topScorers).toEqual([]);
    expect(leaders.topAssisters).toEqual([]);
  });

  it("does not record the same round twice", () => {
    const first = recordDraftMatch({
      campaign: createEmptyDraftCampaign(),
      round: 0,
      score: { user: 1, opponent: 0 },
      performances: [
        { playerId: 1, playerName: "Alpha", rating: 8, goals: 1, assists: 0 },
      ],
    });
    const duplicate = recordDraftMatch({
      campaign: first,
      round: 0,
      score: { user: 9, opponent: 0 },
      performances: [
        { playerId: 1, playerName: "Alpha", rating: 10, goals: 5, assists: 5 },
      ],
    });

    expect(duplicate).toBe(first);
  });

  it("stores the campaign outcome", () => {
    const campaign = completeDraftCampaign(createEmptyDraftCampaign(), {
      kind: "eliminated",
      round: 2,
    });
    expect(campaign.outcome).toEqual({ kind: "eliminated", round: 2 });
  });
});
