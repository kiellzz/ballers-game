import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldX } from "lucide-react";
import DraftCampaignHighlights from "../features/draft/DraftCampaignHighlights";
import { loadDraftProgress } from "../features/draft/draftUtils";
import { DRAFT_ROUNDS } from "../opponents/draftOpponents";
import type { DraftProgress } from "../features/draft/draftUtils";
import "./DraftSummary.css";

interface DraftSummaryProps {
  onContinue: () => void;
}

export default function DraftSummary({ onContinue }: DraftSummaryProps) {
  const navigate = useNavigate();
  const [progress] = useState<DraftProgress | null>(loadDraftProgress);
  const outcome = progress?.campaign.outcome ?? null;

  useEffect(() => {
    if (!progress || !outcome) {
      navigate("/draft-lineup", { replace: true });
      return;
    }

    if (outcome.kind === "champion") {
      navigate("/draft-champion", { replace: true });
    }
  }, [navigate, outcome, progress]);

  if (!progress || !outcome || outcome.kind !== "eliminated") return null;

  const round = DRAFT_ROUNDS[outcome.round];

  return (
    <main className="draft-summary">
      <div className="draft-summary__glow" />
      <div className="draft-summary__content">
        <section className="draft-summary__panel">
          <header className="draft-summary__hero">
            <span className="draft-summary__kicker">BALLERS DRAFT · CAMPAIGN COMPLETE</span>
            <div className="draft-summary__icon-wrap" aria-hidden="true">
              <ShieldX className="draft-summary__icon" size={42} strokeWidth={1.5} />
            </div>
            <h1>CAMPAIGN OVER</h1>
            <p className="draft-summary__result">
              Eliminated in the <strong>{round.label}</strong>
            </p>
            <span className="draft-summary__matches">
              {progress.campaign.matchesPlayed} {progress.campaign.matchesPlayed === 1 ? "match" : "matches"} played
            </span>
          </header>

          <div className="draft-summary__journey" aria-label="Draft campaign progress">
            {DRAFT_ROUNDS.map((draftRound, index) => {
              const matchResult = progress.campaign.matchResults.find(
                (result) => result.round === index
              );
              const state =
                index < outcome.round
                  ? "completed"
                  : index === outcome.round
                    ? "eliminated"
                    : "upcoming";

              return (
                <div
                  key={draftRound.key}
                  className={`draft-summary__round draft-summary__round--${state}`}
                >
                  <span className="draft-summary__round-dot">
                    {state === "completed" ? "✓" : index + 1}
                  </span>
                  <span className="draft-summary__round-label">{draftRound.label}</span>
                  {matchResult ? (
                    <span className="draft-summary__round-score">
                      {matchResult.userScore} - {matchResult.opponentScore}
                      {matchResult.penaltyShootoutScore ? (
                        <small>
                          (PEN {matchResult.penaltyShootoutScore.user} -{" "}
                          {matchResult.penaltyShootoutScore.opponent})
                        </small>
                      ) : null}
                    </span>
                  ) : (
                    <small>
                      {state === "completed"
                        ? "Won"
                        : state === "eliminated"
                          ? "Eliminated"
                          : "Not reached"}
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
          <DraftCampaignHighlights campaign={progress.campaign} />

          <button className="draft-summary__continue" type="button" onClick={onContinue}>
            <span>Return to game modes</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </div>
    </main>
  );
}
