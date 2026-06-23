import { useEffect, useState } from "react";
import "../PenModal.css";
import MatchModal from "../../../components/match/MatchModal";
import { getPlayerImage } from "../../../utils/getPlayerImage";
import { getFlagUrl } from "../../../utils/getFlagUrl";
import type { Player } from "../../../types/PlayerTypes";
import PlayerCard from "../../../components/player-card/PlayerCard";
import type { PenaltyShootoutState } from "../../penaltyShootout";
import PenaltyShootoutScoreboard from "../PenaltyShootoutScoreboard";

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

interface OppPenModalProps {
  isOpen: boolean;
  onPick: (shooterChoice: PenaltyChoice, keeperChoice: PenaltyChoice) => void;
  onContinue: () => void;
  resolution?: PenaltyResolution | null;
  goalkeeper?: Player; // user
  shooter?: Player; // opponent
  shootoutState?: PenaltyShootoutState | null;
}

const ZONES = [
  { id: "top_left", left: 7.5, top: 20.4, width: 28.5, height: 27.4 },
  { id: "top_right", left: 65.3, top: 20.4, width: 28.5, height: 27.4 },
  { id: "center", left: 36.0, top: 20.4, width: 29.3, height: 52.5 },
  { id: "bottom_left", left: 7.5, top: 47.8, width: 28.5, height: 25.3 },
  { id: "bottom_right", left: 65.3, top: 47.8, width: 28.5, height: 25.3 },
] as const;

const PENALTY_CHOICES: PenaltyChoice[] = [
  "top_left",
  "bottom_left",
  "center",
  "top_right",
  "bottom_right",
];

function pickOpponentPenaltyChoice(): PenaltyChoice {
  const index = Math.floor(Math.random() * PENALTY_CHOICES.length);
  return PENALTY_CHOICES[index];
}

export default function OppPenModal({
  isOpen,
  onPick,
  onContinue,
  resolution,
  goalkeeper,
  shooter,
  shootoutState,
}: OppPenModalProps) {
  const [phase, setPhase] = useState<"picking" | "kicking" | "result">("picking");
  const [keeperChoice, setKeeperChoice] = useState<PenaltyChoice | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase("picking");
      setKeeperChoice(null);
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

    setKeeperChoice(choice);
    onPick(pickOpponentPenaltyChoice(), choice);
  }

  const shooterZone = ZONES.find((z) => z.id === resolution?.shooterChoice);

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
      ? "Pick your dive direction."
      : phase === "kicking"
        ? "The opponent is taking the shot..."
        : resolution?.result === "goal"
          ? "THEY SCORED!"
          : resolution?.result === "save_clean"
            ? "WHAT A SAVE! 🧤"
            : resolution?.result === "save_touch"
              ? "GREAT SAVE!"
              : "";

  const headerContent = shooter ? (
    <div className="pen-shooter-row">
      <span className="pen-shooter-label">Opponent taker</span>

      <div className="pen-shooter-card-mini">
        <img
          src={shooter.customImage ?? getPlayerImage(shooter.name)}
          alt={shooter.name}
          className="corner-shooter-img"
          draggable={false}
          onError={(e) => { e.currentTarget.src = "/images/players/default.webp"; }}
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

  const hint = phase === "picking" ? "Tap where to dive" : undefined;

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
      eyebrow={shootoutState ? "PENALTY SHOOTOUT" : "MATCH EVENT"}
      title={shootoutState ? "Opponent Penalty" : "Penalty Against You!"}
      subtitle={subtitle}
      className={`pen-modal${shootoutState ? " pen-modal--shootout" : ""}`}
      headerContent={headerContent}
      hint={hint}
      primaryAction={primaryAction}
      bodyClassName="pen-modal__body"
      footerClassName="pen-modal__footer"
    >
      {shootoutState && shooter ? (
        <div className="pen-shootout-taker pen-shootout-taker--opponent">
          <span>Opponent kick</span>
          <strong>{shooter.name}</strong>
          <small>Taking the penalty</small>
        </div>
      ) : null}

      {shootoutState ? (
        <PenaltyShootoutScoreboard state={shootoutState} />
      ) : null}

      <div className="pen-stage pen-stage--opponent">
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
            const isSelected = keeperChoice === z.id;

            const isKeeperZone =
              phase !== "picking" &&
              resolution?.keeperChoice === z.id;

            const isGoal =
              phase === "result" &&
              resolution?.result === "goal" &&
              resolution?.shooterChoice === z.id;

            const isSave =
              phase === "result" &&
              (resolution?.result === "save_clean" ||
                resolution?.result === "save_touch") &&
              isKeeperZone;

            let stateClass = "";

            if (isGoal) stateClass = "is-goal";
            else if (isSave) stateClass = "is-save";
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
              />
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
            {resolution?.result === "goal" && "GOAL"}
            {resolution?.result === "save_clean" && "WHAT A SAVE!"}
            {resolution?.result === "save_touch" && "SAVE!"}
          </div>
        )}
      </div>
    </MatchModal>
  );
}
