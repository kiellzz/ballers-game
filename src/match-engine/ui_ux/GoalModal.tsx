import { useEffect } from "react";
import MatchModal from "../../components/match/MatchModal";
import type { Player } from "../../types/PlayerTypes";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { triggerGoalConfetti } from "../../utils/confettiEffects";
import { matchSound } from "../sounds/matchSound";
import type { PossessionSide } from "../matchTypes";
import "./GoalModal.css";

export interface GoalModalProps {
  isOpen: boolean;
  scorer: Player | null;
  assistPlayer?: Player | null;
  scorerSide: PossessionSide | null;
  onContinue: () => void;
}

export default function GoalModal({
  isOpen,
  scorer,
  assistPlayer = null,
  scorerSide,
  onContinue,
}: GoalModalProps) {
  const isUser = scorerSide === "user";

  // 🔥 Confetti + som do gol
  useEffect(() => {
    if (!isOpen) return;

    // Confetti só para gol do usuário
    if (isUser) {
      triggerGoalConfetti();
    }

    // Toca som do gol através do matchSound
    if (scorerSide) {
      matchSound.playGoal(scorerSide);
    }
  }, [isOpen, scorerSide]);

  if (!isOpen || !scorerSide) return null;

  const title = isUser ? "GOAL!!!" : "Opponent Goal";

  const subtitle = scorer
    ? isUser
      ? `${scorer.name} scores for your team`
      : `${scorer.name} finds the net!`
    : isUser
    ? "Your team scores."
    : "The opponent scores.";

  const toneClass = isUser ? "goal-modal--user" : "goal-modal--opponent";
  const testId = isUser ? "goal-modal-user" : "goal-modal-opponent";

  const headerContent = scorer ? (
    <div className={`goal-player ${toneClass}`}>
      <img
        src={getPlayerImage(scorer.name)}
        alt={scorer.name}
        className="goal-player__img"
        draggable={false}
      />

      <div className="goal-player__info">
        <span className="goal-player__label">
          {isUser ? "GOAL SCORER" : "OPPONENT SCORER"}
        </span>

        <span className="goal-player__name">{scorer.name}</span>

        <div className="goal-player__meta">
          <span className="goal-player__ovr">{scorer.overall}</span>
          <span className="goal-player__pos">{scorer.position}</span>

          {scorer.nationality && (
            <img
              src={getFlagUrl(scorer.nationality)}
              alt={scorer.nationality}
              className="goal-player__flag"
              draggable={false}
            />
          )}
        </div>

        {assistPlayer ? (
          <div className="goal-player__assist">
            Assist: <span>{assistPlayer.name}</span>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <MatchModal
      size="compact"
      isOpen={isOpen}
      eyebrow=""
      title={title}
      subtitle={subtitle}
      className={`goal-modal ${toneClass}`}
      headerContent={headerContent}
      primaryAction={
        <button
          type="button"
          className={`goal-modal__continue ${
            isUser
              ? "goal-modal__continue--user"
              : "goal-modal__continue--opponent"
          }`}
          onClick={onContinue}
          data-testid={`${testId}-continue-btn`}
          autoFocus
        >
          Continue
        </button>
      }
    >
      {null}
    </MatchModal>
  );
}