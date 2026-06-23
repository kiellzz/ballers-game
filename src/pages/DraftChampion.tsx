import { useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import DraftCampaignHighlights from "../features/draft/DraftCampaignHighlights";
import { loadDraftProgress } from "../features/draft/draftUtils";
import type { DraftProgress } from "../features/draft/draftUtils";
import { DRAFT_ROUNDS } from "../opponents/draftOpponents";
import "./DraftSummary.css";
import "./DraftChampion.css";

type DraftChampionProps = {
  onContinue: () => void;
};

export default function DraftChampion({ onContinue }: DraftChampionProps) {
  const [progress] = useState<DraftProgress | null>(loadDraftProgress);

  return (
    <main className="draft-summary draft-summary--champion">
      <div className="draft-summary__glow" />
      <div className="draft-summary__content">
        <section className="draft-summary__panel">
          <header className="draft-summary__hero">
            <span className="draft-summary__kicker">BALLERS DRAFT · CAMPAIGN COMPLETE</span>
            <div className="draft-summary__icon-wrap" aria-hidden="true">
              <Trophy className="draft-summary__icon" size={42} strokeWidth={1.5} />
            </div>
            <h1>CHAMPIONS!</h1>
            <p className="draft-summary__result">
              You conquered all four rounds and completed the <strong>Ballers Draft</strong>
            </p>
            <span className="draft-summary__matches">
              {progress?.campaign.matchesPlayed ?? 4} matches played
            </span>
          </header>

          <div className="draft-summary__journey" aria-label="Completed draft campaign">
            {DRAFT_ROUNDS.map((round, index) => {
              const matchResult = progress?.campaign.matchResults.find(
                (result) => result.round === index
              );

              return (
                <div
                  key={round.key}
                  className="draft-summary__round draft-summary__round--completed"
                >
                  <span className="draft-summary__round-dot">✓</span>
                  <span className="draft-summary__round-label">{round.label}</span>
                  {matchResult ? (
                    <span className="draft-summary__round-score">
                      {matchResult.userScore} - {matchResult.opponentScore}
                      {matchResult.penaltyShootoutScore ? (
                        <small>
                          PEN {matchResult.penaltyShootoutScore.user} -{" "}
                          {matchResult.penaltyShootoutScore.opponent}
                        </small>
                      ) : null}
                    </span>
                  ) : (
                    <small>Won</small>
                  )}
                </div>
              );
            })}
          </div>

          <div className="draft-summary__section-heading">
            <span>Campaign awards</span>
            <div />
          </div>

          {progress ? (
            <DraftCampaignHighlights campaign={progress.campaign} />
          ) : null}

          <button
            className="draft-summary__continue draft-champion__continue"
            type="button"
            onClick={onContinue}
          >
            <span>Return to game modes</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </div>
    </main>
  );
}
