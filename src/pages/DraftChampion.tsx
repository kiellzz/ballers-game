import { useEffect, useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import DraftCampaignHighlights from "../features/draft/DraftCampaignHighlights";
import { loadDraftProgress } from "../features/draft/draftUtils";
import type { DraftProgress } from "../features/draft/draftUtils";
import { DRAFT_ROUNDS } from "../opponents/draftOpponents";
import { triggerDraftChampionConfetti } from "../utils/confettiEffects";
import "./DraftSummary.css";
import "./DraftChampion.css";

type DraftChampionProps = {
  onContinue: () => void;
};

let lastDraftChampionConfettiAt = 0;

export default function DraftChampion({ onContinue }: DraftChampionProps) {
  const [progress] = useState<DraftProgress | null>(loadDraftProgress);

  useEffect(() => {
    const now = Date.now();

    if (now - lastDraftChampionConfettiAt < 3000) return;

    lastDraftChampionConfettiAt = now;
    triggerDraftChampionConfetti();
  }, []);

  return (
    <main className="draft-summary draft-summary--champion">
      <div className="draft-summary__glow" />
      <div className="draft-summary__content">
        <section className="draft-summary__panel">
          <header className="draft-summary__hero">
            <span className="draft-summary__kicker">
              <span aria-hidden="true">{"\u25C6"}</span>
              BALLERS DRAFT {"\u00B7"} CAMPAIGN COMPLETE
              <span aria-hidden="true">{"\u25C6"}</span>
            </span>
            <div className="draft-summary__icon-wrap" aria-hidden="true">
              <div className="draft-summary__icon-ring" />
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
            <div className="draft-summary__journey-track" aria-hidden="true" />
            {DRAFT_ROUNDS.map((round, index) => {
              const matchResult = progress?.campaign.matchResults.find(
                (result) => result.round === index
              );
              const state = index === DRAFT_ROUNDS.length - 1 ? "final" : "completed";

              return (
                <div
                  key={round.key}
                  className={`draft-summary__round draft-summary__round--${state}`}
                >
                  <div className="draft-summary__round-dot-wrap">
                    <span className="draft-summary__round-dot">{"\u2713"}</span>
                  </div>
                  <span className="draft-summary__round-label">{round.label}</span>
                  {matchResult ? (
                    <span className="draft-summary__round-score">
                      {matchResult.userScore}
                      <span className="draft-summary__round-score-sep">{"\u2013"}</span>
                      {matchResult.opponentScore}
                      {matchResult.penaltyShootoutScore ? (
                        <small>
                          PEN {matchResult.penaltyShootoutScore.user}
                          {"\u2013"}
                          {matchResult.penaltyShootoutScore.opponent}
                        </small>
                      ) : null}
                    </span>
                  ) : (
                    <small className="draft-summary__round-sub">
                      {state === "final" ? "Champion" : "Won"}
                    </small>
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
