import { useEffect, useState } from "react";
import "../PenModal.css";
import MatchModal from "../../../components/match/MatchModal";
import { getPlayerImage } from "../../../utils/getPlayerImage";
import { getFlagUrl } from "../../../utils/getFlagUrl";
import type { Player } from "../../../types/PlayerTypes";
import PlayerCard from "../../../components/player-card/PlayerCard";

export type PenaltyChoice =
  | "top_left"
  | "bottom_left"
  | "center"
  | "top_right"
  | "bottom_right";

interface PenaltyResolution {
  shooterChoice: PenaltyChoice;
  keeperChoice: PenaltyChoice;
  result: "goal" | "save_clean" | "save_touch";
}

interface PenModalProps {
  isOpen: boolean;
  onPick: (choice: PenaltyChoice) => void;
  onContinue: () => void;
  onClose?: () => void;
  resolution?: PenaltyResolution | null;
  goalkeeperName?: string;
  goalkeeper?: Player;
  shooterName?: string;
  shooter?: Player;
}

const ZONES = [
  { id: "top_left", label: "", left: 7.5, top: 20.4, width: 28.5, height: 27.4 },
  { id: "top_right", label: "", left: 65.3, top: 20.4, width: 28.5, height: 27.4 },
  { id: "center", label: "", left: 36.0, top: 20.4, width: 29.3, height: 52.5 },
  { id: "bottom_left", label: "", left: 7.5, top: 47.8, width: 28.5, height: 25.3 },
  { id: "bottom_right", label: "", left: 65.3, top: 47.8, width: 28.5, height: 25.3 },
] as const;

export default function PenModal({
  isOpen,
  onPick,
  onContinue,
  resolution,
  goalkeeperName,
  goalkeeper,
  shooter,
}: PenModalProps) {
  const [phase, setPhase] = useState<"picking" | "kicking" | "result">("picking");
  const [shooterChoice, setShooterChoice] = useState<PenaltyChoice | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase("picking");
      setShooterChoice(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!resolution) return;

    setPhase("kicking");

    const t = setTimeout(() => {
      setPhase("result");
    }, 300);

    return () => clearTimeout(t);
  }, [resolution]);

  function handlePick(choice: PenaltyChoice) {
    if (phase !== "picking") return;

    setShooterChoice(choice);
    onPick(choice);
  }

  const shooterZone = ZONES.find(
    (z) => z.id === (resolution?.shooterChoice ?? shooterChoice)
  );

  const isRightSide =
    resolution?.keeperChoice === "top_right" ||
    resolution?.keeperChoice === "bottom_right";

  const deflectClass =
    resolution?.result === "save_touch"
      ? isRightSide
        ? "pen-ball--deflect-right"
        : "pen-ball--deflect-left"
      : "";

  const subtitle =
    phase === "picking"
      ? "Pick your shot placement."
      : phase === "kicking"
        ? "The ball is on its way..."
        : resolution?.result === "goal"
          ? "GOAL!!! 🎉"
          : resolution?.result === "save_clean"
            ? "WHAT A SAVE!"
            : resolution?.result === "save_touch"
              ? "SAVED!"
              : "";

  const headerContent = shooter ? (
    <div className="pen-shooter-row">
      <span className="pen-shooter-label">Penalty taker</span>

      <div className="pen-shooter-card-mini">
        <img
          src={getPlayerImage(shooter.name)}
          alt={shooter.name}
          className="pen-shooter-img"
          draggable={false}
        />

        <div className="pen-shooter-info">
          <span className="pen-shooter-name">{shooter.name}</span>

          <div className="pen-shooter-meta">
            <span className="pen-shooter-ovr">{shooter.overall}</span>
            <span className="pen-shooter-pos">{shooter.position}</span>

            <img
              src={getFlagUrl(shooter.nationality)}
              alt={shooter.nationality}
              className="pen-shooter-flag"
            />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const hint = phase === "picking" ? "Tap one of the 5 goal zones" : undefined;

  const primaryAction =
    phase === "result" ? (
      <button
        className="match-modal__btn match-modal__btn--primary"
        onClick={onContinue}
      >
        Continue
      </button>
    ) : undefined;

  return (
    <MatchModal
      isOpen={isOpen}
      eyebrow="MATCH EVENT"
      title="Penalty!"
      subtitle={subtitle}
      headerContent={headerContent}
      hint={hint}
      primaryAction={primaryAction}
      bodyClassName="pen-modal__body"
      footerClassName="pen-modal__footer"
    >
      <div className="pen-stage">
        <img
          src="/images/penaltymodal.png"
          alt="Goal"
          className="pen-goal-img"
          draggable={false}
        />

        {goalkeeper && (
          <div
            className={`pen-goalkeeper-card-wrap ${
              phase !== "picking" && resolution?.keeperChoice
                ? `pen-goalkeeper-card-wrap--${resolution.keeperChoice}`
                : ""
            } ${
              phase === "kicking" || phase === "result"
                ? "pen-goalkeeper-card-wrap--diving"
                : ""
            }`}
          >
            <PlayerCard
              player={goalkeeper}
              className="pen-goalkeeper-card"
            />
          </div>
        )}

        <div className="pen-zones">
          {ZONES.map((z) => {
            const isSelected = shooterChoice === z.id;

            const isKeeperZone =
              phase !== "picking" &&
              resolution?.keeperChoice === z.id;

            const isExactMatch =
              resolution?.keeperChoice === shooterChoice;

            const isGoal =
              phase === "result" &&
              resolution?.result === "goal" &&
              isSelected;

            const isCleanSave =
              phase === "result" &&
              resolution?.result === "save_clean" &&
              isKeeperZone;

            const isTouchSave =
              phase === "result" &&
              resolution?.result === "save_touch" &&
              isKeeperZone;

            const isBeatenKeeper =
              phase === "result" &&
              resolution?.result === "goal" &&
              isKeeperZone &&
              isExactMatch;

            let stateClass = "";

            if (isGoal) stateClass = "is-goal";
            else if (isCleanSave) stateClass = "is-save";
            else if (isTouchSave) stateClass = "is-save-touch";
            else if (isSelected) stateClass = "is-selected";

            return (
              <button
                key={z.id}
                className={`pen-zone ${stateClass}`}
                style={{
                  left: `${z.left}%`,
                  top: `${z.top}%`,
                  width: `${z.width}%`,
                  height: `${z.height}%`,
                }}
                onClick={() => handlePick(z.id)}
                disabled={phase !== "picking"}
              >
                <span className="pen-zone-label">{z.label}</span>

                {isKeeperZone && (
                  <span
                    className={`pen-keeper-badge ${
                      isBeatenKeeper ? "is-beaten" : ""
                    } ${
                      resolution?.result === "save_touch" ? "is-touch" : ""
                    }`}
                  >
                    🧤 {goalkeeperName ?? "GK"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {shooterZone && phase !== "picking" && (
          <div
            className={`pen-ball ${
              phase === "result"
                ? `pen-ball--${resolution?.result} ${deflectClass}`
                : ""
            }`}
            style={{
              left: `${shooterZone.left + shooterZone.width / 2}%`,
              top: `${shooterZone.top + shooterZone.height / 2}%`,
            }}
          />
        )}

        {phase === "result" && (
          <div className={`pen-banner pen-banner--${resolution?.result}`}>
            {resolution?.result === "goal" && "GOAL!"}
            {resolution?.result === "save_clean" && "WHAT A SAVE!"}
            {resolution?.result === "save_touch" && "SAVED!"}
          </div>
        )}
      </div>
    </MatchModal>
  );
}
