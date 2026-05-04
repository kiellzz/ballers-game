import { useEffect, useState } from "react";
import "../FkModal.css";
import MatchModal from "../../../components/match/MatchModal";
import { getPlayerImage } from "../../../utils/getPlayerImage";
import { getFlagUrl } from "../../../utils/getFlagUrl";
import type { Player } from "../../../types/PlayerTypes";
import PlayerCard from "../../../components/player-card/PlayerCard";
import type {
  FreeKickPlacement,
  FreeKickDistance,
  FreeKickResult,
  FreeKickKeeperChoice,
} from "../../balancing/resolveFk";

interface FkResolution {
  placement: FreeKickPlacement;
  distance: FreeKickDistance;
  keeperChoice: FreeKickKeeperChoice;
  result: FreeKickResult;
}

interface FkModalProps {
  isOpen: boolean;
  onPick: (placement: FreeKickPlacement, distance: FreeKickDistance) => void;
  onContinue: () => void;
  resolution?: FkResolution | null;
  goalkeeperName?: string;
  goalkeeper?: Player;
  shooter?: Player;
  initialDistance?: FreeKickDistance;
}

const PLACEMENT_ZONES: ReadonlyArray<{
  id: FreeKickPlacement;
  label: string;
  sublabel: string;
  left: number;
  top: number;
  width: number;
  height: number;
}> = [
  {
    id: "over_wall",
    label: "",
    sublabel: "",
    left: 28,
    top: 36,
    width: 6,
    height: 6,
  },
  {
    id: "around_wall",
    label: "",
    sublabel: "",
    left: 67,
    top: 36,
    width: 6,
    height: 6,
  },
];

export default function FkModal({
  isOpen,
  onPick,
  onContinue,
  resolution,
  goalkeeper,
  shooter,
  initialDistance = "mid",
}: FkModalProps) {
  const [phase, setPhase] = useState<"picking" | "kicking" | "result">("picking");
  const [placement, setPlacement] = useState<FreeKickPlacement | null>(null);
  const [ballKey, setBallKey] = useState(0);

  // Distance now comes from the external zone.
  const distance = initialDistance;

  useEffect(() => {
    if (isOpen) {
      setPhase("picking");
      setPlacement(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!resolution) return;

    setBallKey((k) => k + 1);
    setPhase("kicking");

    const t = setTimeout(() => {
      setBallKey((k) => k + 1);
      setPhase("result");
    }, 230);

    return () => clearTimeout(t);
  }, [resolution]);

  function handlePickPlacement(chosen: FreeKickPlacement) {
    if (phase !== "picking") return;

    setPlacement(chosen);
    onPick(chosen, distance);
  }

  const pickedZone = PLACEMENT_ZONES.find(
    (z) => z.id === (resolution?.placement ?? placement)
  );

  const subtitle =
    phase === "picking"
      ? "Choose the shot placement."
      : phase === "kicking"
        ? "The ball is on its way..."
        : resolution?.result === "goal"
          ? "GOAL!!! 🎉"
          : resolution?.result === "save_clean"
            ? "WHAT A SAVE!"
            : resolution?.result === "save_touch"
              ? "SAVED!"
              : resolution?.result === "blocked_wall"
                ? "BLOCKED BY THE WALL!"
                : resolution?.result === "miss"
                  ? "JUST WIDE!"
                  : "";

  const headerContent = shooter ? (
    <div className="fk-shooter-row">
      <span className="fk-shooter-label">Free-kick taker</span>

      <div className="fk-shooter-card-mini">
        <img
          src={getPlayerImage(shooter.name)}
          alt={shooter.name}
          className="fk-shooter-img"
          draggable={false}
        />

        <div className="fk-shooter-info">
          <span className="fk-shooter-name">{shooter.name}</span>

          <div className="fk-shooter-meta">
            <span className="fk-shooter-ovr">{shooter.overall}</span>
            <span className="fk-shooter-pos">{shooter.position}</span>

            <img
              src={getFlagUrl(shooter.nationality)}
              alt={shooter.nationality}
              className="fk-shooter-flag"
            />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const hint =
    phase === "picking"
      ? "Tap a target zone"
      : undefined;

  const primaryAction =
    phase === "result" ? (
      <button
        className="match-modal__btn match-modal__btn--primary"
        data-testid="fk-continue-btn"
        onClick={onContinue}
      >
        Continue
      </button>
    ) : undefined;

  const ballTrajectoryClass = (() => {
    if (phase === "kicking") return "fk-ball--kick";
    if (!resolution) return "";
    if (resolution.result === "blocked_wall") return "fk-ball--blocked";
    if (resolution.result === "miss") {
      return resolution.placement === "around_wall"
        ? "fk-ball--miss-right"
        : "fk-ball--miss-left";
    }
    if (resolution.result === "save_clean") return "fk-ball--save";
    if (resolution.result === "save_touch") {
      return resolution.keeperChoice === "right"
        ? "fk-ball--deflect-right"
        : "fk-ball--deflect-left";
    }
    return "fk-ball--goal";
  })();

  return (
    <MatchModal
      isOpen={isOpen}
      eyebrow="MATCH EVENT"
      title="Free Kick!"
      subtitle={subtitle}
      headerContent={headerContent}
      hint={hint}
      primaryAction={primaryAction}
      bodyClassName="fk-modal__body"
      footerClassName="fk-modal__footer"
    >
      <div className={`fk-stage fk-stage--${distance}`}>
        <img
          src="/images/freekickmodal.png"
          alt="Free kick"
          className="fk-stage-img"
          draggable={false}
        />

        <img
          src="/images/barrier.png"
          alt="Wall"
          className={`fk-barrier ${phase === "kicking" ? "fk-barrier--jumping" : ""}`}
          draggable={false}
        />

        {goalkeeper && (
          <div
            className={`fk-goalkeeper-card-wrap ${
              phase !== "picking" && resolution?.keeperChoice
                ? `fk-goalkeeper-card-wrap--${resolution.keeperChoice}`
                : ""
            } ${
              phase === "kicking" || phase === "result"
                ? "fk-goalkeeper-card-wrap--diving"
                : ""
            } fk-goalkeeper-card-wrap--${distance}`}
          >
            <PlayerCard player={goalkeeper} className="fk-goalkeeper-card" />
          </div>
        )}

        <div className="fk-zones">
          {PLACEMENT_ZONES.map((z) => {
            const isSelected = placement === z.id;
            const isPicked = phase !== "picking" && resolution?.placement === z.id;

            const isGoal =
              phase === "result" &&
              resolution?.result === "goal" &&
              isPicked;

            const isCleanSave =
              phase === "result" &&
              resolution?.result === "save_clean" &&
              isPicked;

            const isTouchSave =
              phase === "result" &&
              resolution?.result === "save_touch" &&
              isPicked;

            const isBlocked =
              phase === "result" &&
              resolution?.result === "blocked_wall" &&
              isPicked;

            const isMiss =
              phase === "result" &&
              resolution?.result === "miss" &&
              isPicked;

            let stateClass = "";
            if (isGoal) stateClass = "is-goal";
            else if (isCleanSave) stateClass = "is-save";
            else if (isTouchSave) stateClass = "is-save-touch";
            else if (isBlocked) stateClass = "is-blocked";
            else if (isMiss) stateClass = "is-miss";
            else if (isSelected) stateClass = "is-selected";

            return (
              <button
                key={z.id}
                className={`fk-zone ${stateClass}`}
                data-testid={`fk-zone-${z.id}`}
                style={{
                  left: `${z.left}%`,
                  top: `${z.top}%`,
                  width: `${z.width}%`,
                  height: `${z.height}%`,
                }}
                onClick={() => handlePickPlacement(z.id)}
                disabled={phase !== "picking"}
              >
                <span className="fk-zone-label">
                  <span className="fk-zone-label__main">{z.label}</span>
                  <span className="fk-zone-label__sub">{z.sublabel}</span>
                </span>
              </button>
            );
          })}
        </div>

        {pickedZone && phase !== "picking" && (
          <div
            key={`ball-${ballKey}`}
            className={`fk-ball ${ballTrajectoryClass}`}
            style={{
              left: `${pickedZone.left + pickedZone.width / 2}%`,
              top: `${pickedZone.top + pickedZone.height / 2}%`,
              zIndex: resolution?.result === "goal" ? 2 : 6,
            }}
          >
            <img
              src="/images/ball.png"
              alt="Ball"
              className="fk-ball__img"
            />
          </div>
        )}

        {phase === "result" && resolution && (
          <div className={`fk-banner fk-banner--${resolution.result}`}>
            {resolution.result === "goal" && "GOAL!"}
            {resolution.result === "save_clean" && "WHAT A SAVE!"}
            {resolution.result === "save_touch" && "SAVED!"}
            {resolution.result === "blocked_wall" && "BLOCKED!"}
            {resolution.result === "miss" && "WIDE!"}
          </div>
        )}
      </div>
    </MatchModal>
  );
}
