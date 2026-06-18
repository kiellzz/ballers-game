import { useMemo } from "react";
import { MatchOption } from "./MatchOption";
import PlayerCard from "../player-card/PlayerCard";
import type { Player } from "../../types/PlayerTypes";
import type { ActionType, Zone } from "../../match-engine/matchTypes";
import { getActionDefinition } from "../../match-engine/balancing/events";
import "./MatchField.css";

type MatchFieldPhase = "playing" | "finished";
type Side = "left" | "right";
type SideMode = "main" | "gk-protagonist";
type SituationTone = "attack" | "defense" | "bigchance" | "neutral";

interface MatchFieldProps {
  situation: string;
  userPlayer: Player | null;
  opponentPlayer: Player | null;
  userGK: Player | null;
  opponentGK: Player | null;
  options?: readonly ActionType[];
  onAction: (action: ActionType) => void;
  phase: MatchFieldPhase;
  isUserAttacking?: boolean;
  zone: Zone | null;
}

const RIGHT_GOALKEEPER_FRONT_SITUATIONS: readonly Zone[] = [
  "atk_bigchance",
  "atk_corner",
];

const LEFT_GOALKEEPER_FRONT_SITUATIONS: readonly Zone[] = [
  "def_bigchance",
  "def_corner",
];

const ATK_BIGCHANCE_ZONES: readonly Zone[] = ["atk_bigchance", "atk_corner"];
const DEF_BIGCHANCE_ZONES: readonly Zone[] = ["def_bigchance", "def_corner"];
const ATK_ZONES: readonly Zone[] = [
  "atk_bigchance",
  "atk_corner",
  "atk_box",
  "atk_nearbox",
  "atk_third",
  "atk_mid",
];
const DEF_ZONES: readonly Zone[] = [
  "def_bigchance",
  "def_corner",
  "def_box",
  "def_nearbox",
  "def_third",
  "def_mid",
];

function getSituationTone(
  zone: Zone | null,
  isUserAttacking: boolean
): SituationTone {
  if (!zone) return "neutral";

  if (isUserAttacking) {
    if (ATK_BIGCHANCE_ZONES.includes(zone)) return "bigchance";
    if (ATK_ZONES.includes(zone)) return "attack";
    if (DEF_ZONES.includes(zone)) return "defense";
  } else {
    if (DEF_BIGCHANCE_ZONES.includes(zone)) return "bigchance";
    if (DEF_ZONES.includes(zone)) return "defense";
    if (ATK_ZONES.includes(zone)) return "attack";
  }

  return "neutral";
}

function pickBackgroundPlayer(
  mainPlayer: Player | null,
  goalkeeper: Player | null
): Player | null {
  if (mainPlayer) return mainPlayer;
  if (goalkeeper) return goalkeeper;
  return null;
}

export const MatchField = ({
  situation,
  userPlayer,
  opponentPlayer,
  userGK,
  opponentGK,
  options = [],
  onAction,
  phase,
  isUserAttacking = true,
  zone,
}: MatchFieldProps) => {
  const hasSituation = Boolean(
    userPlayer || opponentPlayer || userGK || opponentGK
  );

  const situationTone = useMemo(
    () => getSituationTone(zone, isUserAttacking),
    [zone, isUserAttacking]
  );

  const goalkeeperProtagonistSide: Side | null = useMemo(() => {
    if (zone && RIGHT_GOALKEEPER_FRONT_SITUATIONS.includes(zone)) {
      return "right";
    }

    if (zone && LEFT_GOALKEEPER_FRONT_SITUATIONS.includes(zone)) {
      return "left";
    }

    return null;
  }, [zone]);

  const leftMode: SideMode =
    goalkeeperProtagonistSide === "left" ? "gk-protagonist" : "main";

  const rightMode: SideMode =
    goalkeeperProtagonistSide === "right" ? "gk-protagonist" : "main";

  const leftShowsGoalkeeperInFront = leftMode === "gk-protagonist";
  const rightShowsGoalkeeperInFront = rightMode === "gk-protagonist";

  const leftFrontPlayer = useMemo(() => {
    if (leftShowsGoalkeeperInFront) {
      return userGK ?? userPlayer;
    }

    return userPlayer ?? userGK;
  }, [leftShowsGoalkeeperInFront, userGK, userPlayer]);

  const leftBackPlayer = useMemo(() => {
    if (leftShowsGoalkeeperInFront) {
      return pickBackgroundPlayer(userPlayer, userGK);
    }

    return pickBackgroundPlayer(userGK, userPlayer);
  }, [leftShowsGoalkeeperInFront, userGK, userPlayer]);

  const rightFrontPlayer = useMemo(() => {
    if (rightShowsGoalkeeperInFront) {
      return opponentGK ?? opponentPlayer;
    }

    return opponentPlayer ?? opponentGK;
  }, [rightShowsGoalkeeperInFront, opponentGK, opponentPlayer]);

  const rightBackPlayer = useMemo(() => {
    if (rightShowsGoalkeeperInFront) {
      return pickBackgroundPlayer(opponentPlayer, opponentGK);
    }

    return pickBackgroundPlayer(opponentGK, opponentPlayer);
  }, [rightShowsGoalkeeperInFront, opponentGK, opponentPlayer]);

  const showBallOnLeft = isUserAttacking && !!leftFrontPlayer;
  const showBallOnRight = !isUserAttacking && !!rightFrontPlayer;

  return (
    <section className={`match-visual-area phase-${phase}`}>

      <div className={`situation-box tone-${situationTone}`}>
        <span className="situation-label">Current situation:</span> {situation}
      </div>

      <div
        className={`versus-display ${
          hasSituation ? "is-active" : "is-idle"
        }`}
      >
        <div className={`side-stack left-side mode-${leftMode}`}>
          <div
            className="card-container back-card back-card-left"
          >
            {leftBackPlayer && <PlayerCard player={leftBackPlayer} />}
          </div>

          <div
            className={`card-container main-card main-card-left user-side${showBallOnLeft ? " has-ball" : ""}`}
          >
            {showBallOnLeft && (
              <div className="possession-triangle possession-triangle--user" />
            )}

            {showBallOnLeft && (
              <img
                src="/images/ball.png"
                alt="Ball"
                className="match-ball-icon ball-left"
              />
            )}

            {leftFrontPlayer && <PlayerCard player={leftFrontPlayer} />}
          </div>
        </div>

        <div className="vs-logo-wrapper">
          <div className="vs-logo">VS</div>
        </div>

        <div className={`side-stack right-side mode-${rightMode}`}>
          <div
            className="card-container back-card back-card-right"
          >
            {rightBackPlayer && <PlayerCard player={rightBackPlayer} />}
          </div>

          <div
            className={`card-container main-card main-card-right opponent-side${showBallOnRight ? " has-ball" : ""}`}
          >
            {showBallOnRight && (
              <div className="possession-triangle possession-triangle--opponent" />
            )}

            {showBallOnRight && (
              <img
                src="/images/ball.png"
                alt="Ball"
                className="match-ball-icon ball-right"
              />
            )}

            {rightFrontPlayer && <PlayerCard player={rightFrontPlayer} />}
          </div>
        </div>
      </div>

      <p className="duel-hint">
        Tip: Study the duel, stats decide the outcome.
      </p>

      <div className="action-options">
        {phase === "finished" ? (
          <MatchOption
            label="End of the match"
            disabled={true}
            onClick={() => {}}
          />
        ) : (
          options.map((action) => (
            <MatchOption
              key={action}
              label={getActionDefinition(action).label}
              disabled={false}
              onClick={() => onAction(action)}
            />
          ))
        )}
      </div>
    </section>
  );
};
