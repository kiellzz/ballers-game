import { useEffect, useState, type CSSProperties } from "react";
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
  const totalSegments = Math.max(DRAFT_ROUNDS.length - 1, 1);
  const segmentPercent = 100 / totalSegments;
  const eliminatedStartPercent = (outcome.round / totalSegments) * 100;
  const eliminatedEndPercent =
    outcome.round < totalSegments
      ? Math.min(100, eliminatedStartPercent + segmentPercent / 2)
      : 100;
  const journeyTrackStyle = {
    "--draft-summary-complete-end": `${eliminatedStartPercent}%`,
    "--draft-summary-eliminated-start": `${eliminatedStartPercent}%`,
    "--draft-summary-eliminated-end": `${eliminatedEndPercent}%`,
  } as CSSProperties;

  return (
    <main className="draft-summary">
      <div className="draft-summary__glow" />
      <div className="draft-summary__content">
        <section className="draft-summary__panel">

          {/* ── Hero ── */}
          <header className="draft-summary__hero">
            <span className="draft-summary__kicker">
              <span aria-hidden="true">◆</span>
              BALLERS DRAFT · CAMPAIGN COMPLETE
              <span aria-hidden="true">◆</span>
            </span>

            <div className="draft-summary__icon-wrap" aria-hidden="true">
              <div className="draft-summary__icon-ring" />
              <ShieldX className="draft-summary__icon" size={38} strokeWidth={1.4} />
            </div>

            <h1>CAMPAIGN<br />OVER</h1>

            <p className="draft-summary__result">
              Eliminated in the <strong>{round.label}</strong>
            </p>
            <span className="draft-summary__matches">
              {progress.campaign.matchesPlayed}{" "}
              {progress.campaign.matchesPlayed === 1 ? "match" : "matches"} played
            </span>
          </header>

          {/* ── Journey tracker ── */}
          <div className="draft-summary__journey" aria-label="Draft campaign progress">
            <div
              className="draft-summary__journey-track"
              aria-hidden="true"
              style={journeyTrackStyle}
            />
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
                  <div className="draft-summary__round-dot-wrap">
                    <span className="draft-summary__round-dot">
                      {state === "completed" ? "✓" : state === "eliminated" ? "✕" : index + 1}
                    </span>
                  </div>
                  <span className="draft-summary__round-label">{draftRound.label}</span>
                  {matchResult ? (
                    <span className="draft-summary__round-score">
                      {matchResult.userScore}
                      <span className="draft-summary__round-score-sep">–</span>
                      {matchResult.opponentScore}
                      {matchResult.penaltyShootoutScore ? (
                        <small>
                          PEN {matchResult.penaltyShootoutScore.user}–
                          {matchResult.penaltyShootoutScore.opponent}
                        </small>
                      ) : null}
                    </span>
                  ) : (
                    <small className="draft-summary__round-sub">
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

          {/* ── Awards ── */}
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
