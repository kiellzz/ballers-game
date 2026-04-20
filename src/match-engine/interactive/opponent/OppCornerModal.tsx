import { useEffect, useMemo, useRef, useState } from "react";
import "../CornerModal.css";
import MatchModal from "../../../components/match/MatchModal";
import { getPlayerImage } from "../../../utils/getPlayerImage";
import { getFlagUrl } from "../../../utils/getFlagUrl";
import type { Player } from "../../../types/PlayerTypes";
import PlayerCard from "../../../components/player-card/PlayerCard";
import type {
  CornerChoice,
  CornerResult,
} from "../../balancing/resolveCorner";

interface CornerResolution {
  choice: CornerChoice;
  result: CornerResult;
}

interface OppCornerModalProps {
  goalkeeper?: Player;
  shortReceiver?: Player;
  isOpen: boolean;
  onPlay: (choice: CornerChoice) => void;
  onContinue: () => void;
  resolution?: CornerResolution | null;
  shooter?: Player;
}

type VariableTrajectoryClass =
  | "corner-ball--claimed"
  | "corner-ball--box"
  | "corner-ball--bigchance"
  | "corner-ball--miss";

type BallTrajectoryClass =
  | "corner-ball--short-kept"
  | "corner-ball--claimed"
  | "corner-ball--box"
  | "corner-ball--box-then-cleared"
  | "corner-ball--cleared-continuation"
  | "corner-ball--bigchance"
  | "corner-ball--miss"
  | "corner-ball--olympic-goal"
  | "";

interface CubicPath {
  mx: number;
  my: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  ex: number;
  ey: number;
}

interface PathVariationProfile {
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  ex: number;
  ey: number;
}

interface BallMotionConfig {
  primaryPath: string;
  continuationPath?: string;
  duration: number;
  continuationDuration?: number;
  rotation: number;
  scaleValues: string;
  scaleKeyTimes: string;
}

const BALL_PATHS: Record<
  Exclude<BallTrajectoryClass, "" | "corner-ball--box-then-cleared">,
  string
> = {
  "corner-ball--short-kept": "M 193 920 Q 228 865 273 805",

  "corner-ball--claimed": "M 130 920 C 100 650, 500 450, 510 545",

  "corner-ball--box": "M 130 920 C 356 947, 539 850, 743 423",

  "corner-ball--cleared-continuation":
    "M 743 423 C 860 350, 1080 250, 1400 180",

  "corner-ball--bigchance": "M 130 920 C 356 947, 539 850, 632 423",

  "corner-ball--miss": "M 130 920 C 852 708, 791 436, 328 260",
  "corner-ball--olympic-goal": "M 130 920 C 852 802, 791 350, 360 460",
};

const BALL_DURATIONS: Record<
  Exclude<BallTrajectoryClass, "" | "corner-ball--box-then-cleared">,
  number
> = {
  "corner-ball--short-kept": 0.3,
  "corner-ball--claimed": 0.9,
  "corner-ball--box": 1,
  "corner-ball--cleared-continuation": 0.45,
  "corner-ball--bigchance": 1.1,
  "corner-ball--miss": 1.2,
  "corner-ball--olympic-goal": 1.1,
};

const BALL_ROTATIONS: Record<
  Exclude<BallTrajectoryClass, "" | "corner-ball--box-then-cleared">,
  number
> = {
  "corner-ball--short-kept": -90,
  "corner-ball--claimed": -360,
  "corner-ball--box": -420,
  "corner-ball--cleared-continuation": -360,
  "corner-ball--bigchance": -520,
  "corner-ball--miss": -600,
  "corner-ball--olympic-goal": -720,
};

const PATH_VARIATION_PROFILES: Record<
  VariableTrajectoryClass,
  PathVariationProfile
> = {
  "corner-ball--claimed": {
    c1x: 60,
    c1y: 62,
    c2x: 62,
    c2y: 62,
    ex: 48,
    ey: 48,
  },
  "corner-ball--box": {
    c1x: 60,
    c1y: 60,
    c2x: 64,
    c2y: 64,
    ex: 58,
    ey: 48,
  },
  "corner-ball--bigchance": {
    c1x: 64,
    c1y: 64,
    c2x: 68,
    c2y: 68,
    ex: 56,
    ey: 50,
  },
  "corner-ball--miss": {
    c1x: 82,
    c1y: 82,
    c2x: 82,
    c2y: 76,
    ex: 64,
    ey: 64,
  },
};

function pickOpponentChoice(): CornerChoice {
  const roll = Math.random();

  if (roll < 0.7) return "cross";
  if (roll < 0.98) return "short";
  return "olympic";
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function parseCubicPath(path: string): CubicPath | null {
  const match = path.match(
    /^M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+C\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/
  );

  if (!match) return null;

  const [, mx, my, c1x, c1y, c2x, c2y, ex, ey] = match;

  return {
    mx: Number(mx),
    my: Number(my),
    c1x: Number(c1x),
    c1y: Number(c1y),
    c2x: Number(c2x),
    c2y: Number(c2y),
    ex: Number(ex),
    ey: Number(ey),
  };
}

function formatCubicPath(path: CubicPath): string {
  return `M ${path.mx.toFixed(1)} ${path.my.toFixed(1)} C ${path.c1x.toFixed(
    1
  )} ${path.c1y.toFixed(1)}, ${path.c2x.toFixed(1)} ${path.c2y.toFixed(
    1
  )}, ${path.ex.toFixed(1)} ${path.ey.toFixed(1)}`;
}

function varyCubicPath(path: string, profile: PathVariationProfile): string {
  const parsed = parseCubicPath(path);

  if (!parsed) return path;

  const varied: CubicPath = {
    ...parsed,
    c1x: parsed.c1x + randomBetween(-profile.c1x, profile.c1x),
    c1y: parsed.c1y + randomBetween(-profile.c1y, profile.c1y),
    c2x: parsed.c2x + randomBetween(-profile.c2x, profile.c2x),
    c2y: parsed.c2y + randomBetween(-profile.c2y, profile.c2y),
    ex: parsed.ex + randomBetween(-profile.ex, profile.ex),
    ey: parsed.ey + randomBetween(-profile.ey, profile.ey),
  };

  return formatCubicPath(varied);
}

function getVariedPath(trajectoryClass: VariableTrajectoryClass): string {
  return varyCubicPath(
    BALL_PATHS[trajectoryClass],
    PATH_VARIATION_PROFILES[trajectoryClass]
  );
}

function getBallMotionConfig(
  trajectoryClass: BallTrajectoryClass
): BallMotionConfig {
  if (trajectoryClass === "corner-ball--box-then-cleared") {
    return {
      primaryPath: BALL_PATHS["corner-ball--box"],
      continuationPath: BALL_PATHS["corner-ball--cleared-continuation"],
      duration: 0.55,
      continuationDuration: 0.45,
      rotation: -780,
      scaleValues: "1;0.84;0.7",
      scaleKeyTimes: "0;0.55;1",
    };
  }

  if (
    trajectoryClass === "corner-ball--short-kept" ||
    trajectoryClass === "corner-ball--olympic-goal" ||
    trajectoryClass === ""
  ) {
    return {
      primaryPath:
        trajectoryClass === "" ? "" : BALL_PATHS[trajectoryClass],
      duration:
        trajectoryClass === "" ? 0.9 : BALL_DURATIONS[trajectoryClass],
      rotation:
        trajectoryClass === "" ? -360 : BALL_ROTATIONS[trajectoryClass],
      scaleValues: "1;0.85",
      scaleKeyTimes: "0;1",
    };
  }

  const variableClass = trajectoryClass as VariableTrajectoryClass;

  return {
    primaryPath: getVariedPath(variableClass),
    duration: BALL_DURATIONS[variableClass] + randomBetween(-0.15, 0.15),
    rotation: BALL_ROTATIONS[variableClass] + randomBetween(-100, -20),
    scaleValues: "1;0.85",
    scaleKeyTimes: "0;1",
  };
}

export default function OppCornerModal({
  goalkeeper,
  shortReceiver,
  isOpen,
  onPlay,
  onContinue,
  resolution,
  shooter,
}: OppCornerModalProps) {
  const [phase, setPhase] = useState<"idle" | "kicking" | "result">("idle");
  const [ballAnimationKey, setBallAnimationKey] = useState(0);

  // FIX: guard against stale resolution on remounts
  const processedResolutionRef = useRef<CornerResolution | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setBallAnimationKey(0);
      // FIX: clear the ref when reopening so it does not block the next corner
      processedResolutionRef.current = null;
    }
  }, [isOpen]);

  function handleStart() {
    if (phase !== "idle") return;

    const choice = pickOpponentChoice();
    onPlay(choice);
  }

  // FIX: selectedChoice variable removed - it was declared but never used
  const ballLayerZIndex =
    resolution?.choice === "olympic" && resolution?.result === "goal" ? 2 : 6;

  const ballTrajectoryClass = useMemo<BallTrajectoryClass>(() => {
    if (!resolution) return "";

    if (resolution.choice === "short") {
      return "corner-ball--short-kept";
    }

    if (resolution.choice === "cross") {
      if (resolution.result === "cross_claimed") return "corner-ball--claimed";
      if (resolution.result === "cross_cleared") {
        return "corner-ball--box-then-cleared";
      }
      if (resolution.result === "cross_box") return "corner-ball--box";
      if (resolution.result === "cross_bigchance") {
        return "corner-ball--bigchance";
      }
      return "corner-ball--bigchance";
    }

    return resolution.result === "goal"
      ? "corner-ball--olympic-goal"
      : "corner-ball--miss";
  }, [resolution]);

  // FIX: redundant deps removed - ballTrajectoryClass already derives from resolution
  const ballMotion = useMemo(
    () => getBallMotionConfig(ballTrajectoryClass),
    [ballTrajectoryClass]
  );

  useEffect(() => {
    if (!resolution) return;
    // FIX: ignore already processed resolution to avoid firing on a stale remount
    if (resolution === processedResolutionRef.current) return;
    processedResolutionRef.current = resolution;

    setPhase("kicking");
    setBallAnimationKey((prev) => prev + 1);

    const totalDuration =
      ballTrajectoryClass === "corner-ball--box-then-cleared"
        ? (ballMotion.duration + (ballMotion.continuationDuration ?? 0)) * 1000
        : ballMotion.duration * 1000;

    const t = setTimeout(() => {
      setPhase("result");
    }, totalDuration);

    return () => clearTimeout(t);
  }, [resolution, ballTrajectoryClass, ballMotion]);

  const subtitle =
    phase === "idle"
      ? "Press continue to watch the corner."
      : phase === "kicking"
      ? "The opponent takes the corner..."
      : resolution?.result === "goal"
      ? "THEY SCORED AN OLYMPIC GOAL..."
      : resolution?.result === "cross_claimed"
      ? "GOALKEEPER CLAIMS IT!"
      : resolution?.result === "cross_cleared"
      ? "CLEARED!"
      : resolution?.result === "cross_box"
      ? "BALL INTO THE BOX!"
      : resolution?.result === "cross_bigchance"
      ? "BIG CHANCE!"
      : resolution?.result === "miss"
      ? "WAY OFF!"
      : resolution?.result === "short_kept"
      ? "THEY KEEP POSSESSION"
      : "";

  const headerContent = shooter ? (
    <div className="corner-shooter-row">
      <span className="corner-shooter-label">Opponent taker</span>

      <div className="corner-shooter-card-mini">
        <img
          src={getPlayerImage(shooter.name)}
          alt={shooter.name}
          className="corner-shooter-img"
          draggable={false}
        />

        <div className="corner-shooter-info">
          <span className="corner-shooter-name">{shooter.name}</span>

          <div className="corner-shooter-meta">
            <span className="corner-shooter-ovr">{shooter.overall}</span>
            <span className="corner-shooter-pos">{shooter.position}</span>

            <img
              src={getFlagUrl(shooter.nationality)}
              alt={shooter.nationality}
              className="corner-shooter-flag"
            />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const primaryAction =
    phase === "idle" ? (
      <button
        className="match-modal__btn match-modal__btn--primary"
        data-testid="opp-corner-start-btn"
        onClick={handleStart}
      >
        Continue
      </button>
    ) : phase === "result" ? (
      <button
        className="match-modal__btn match-modal__btn--primary"
        data-testid="opp-corner-continue-btn"
        onClick={onContinue}
      >
        Continue
      </button>
    ) : undefined;

  const ballSize =
    ballTrajectoryClass === "corner-ball--short-kept" ? 54 : 38;

  const ballOffset = -(ballSize / 2);

  return (
    <MatchModal
      isOpen={isOpen}
      eyebrow="MATCH EVENT"
      title="Corner Against You!"
      subtitle={subtitle}
      headerContent={headerContent}
      primaryAction={primaryAction}
      bodyClassName="corner-modal__body"
      footerClassName="corner-modal__footer"
    >
      <div className="corner-layout corner-layout--opponent">
        <div className="corner-stage corner-stage--opponent">
          <img
            src="/images/cornermodal.png"
            alt="Corner kick"
            className="corner-stage-img corner-stage-img--opponent"
            draggable={false}
          />

          <div className="corner-stage-overlay corner-stage-overlay--opponent" />

          {goalkeeper && (
            <div
              className={`corner-goalkeeper-card-wrap corner-goalkeeper-card-wrap--opponent ${
                phase === "kicking" || phase === "result"
                  ? `corner-goalkeeper-card-wrap--react-${resolution?.result ?? "idle"}`
                  : ""
              }`}
            >
              <PlayerCard
                player={goalkeeper}
                className="corner-goalkeeper-card"
              />
            </div>
          )}

          {shortReceiver && (
            <div
              className={`corner-short-receiver-wrap corner-short-receiver-wrap--opponent ${
                phase === "result" && resolution?.result === "short_kept"
                  ? "corner-short-receiver-wrap--success"
                  : ""
              }`}
            >
              <PlayerCard
                player={shortReceiver}
                className="corner-short-receiver-card"
              />
            </div>
          )}

          {resolution && phase !== "idle" && (
            <svg
              className="corner-ball-svg corner-ball-svg--opponent"
              viewBox="0 0 1600 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ zIndex: ballLayerZIndex }}
            >
              <g
                key={`${resolution.choice}-${resolution.result}-${ballAnimationKey}`}
              >
                {ballTrajectoryClass === "corner-ball--box-then-cleared" ? (
                  <>
                    <animateMotion
                      dur={`${ballMotion.duration}s`}
                      fill="freeze"
                      path={ballMotion.primaryPath}
                      calcMode="spline"
                      keySplines="0.2 0.8 0.2 1"
                    />
                    <animateMotion
                      begin={`${ballMotion.duration}s`}
                      dur={`${ballMotion.continuationDuration ?? 0.45}s`}
                      fill="freeze"
                      path={ballMotion.continuationPath}
                      calcMode="spline"
                      keySplines="0.3 0.9 0.4 1"
                    />
                  </>
                ) : (
                  <animateMotion
                    dur={`${ballMotion.duration}s`}
                    fill="freeze"
                    path={ballMotion.primaryPath}
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.2 0.8 0.2 1"
                  />
                )}

                <g>
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to={`${ballMotion.rotation}`}
                    dur={
                      ballTrajectoryClass === "corner-ball--box-then-cleared"
                        ? `${ballMotion.duration + (ballMotion.continuationDuration ?? 0)}s`
                        : `${ballMotion.duration}s`
                    }
                    fill="freeze"
                    additive="sum"
                  />
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values={ballMotion.scaleValues}
                    keyTimes={ballMotion.scaleKeyTimes}
                    dur={
                      ballTrajectoryClass === "corner-ball--box-then-cleared"
                        ? `${ballMotion.duration + (ballMotion.continuationDuration ?? 0)}s`
                        : `${ballMotion.duration}s`
                    }
                    fill="freeze"
                    additive="sum"
                  />
                  <image
                    href="/images/ball.png"
                    width={ballSize}
                    height={ballSize}
                    x={ballOffset}
                    y={ballOffset}
                  />
                </g>
              </g>
            </svg>
          )}

          {phase === "result" && resolution && (
            <div
              className={`corner-banner corner-banner--${resolution.result} corner-banner--opponent`}
            >
              {resolution.result === "goal" && "GOAL!"}
              {resolution.result === "cross_claimed" && "CLAIMED!"}
              {resolution.result === "cross_cleared" && "CLEARED!"}
              {resolution.result === "cross_box" && "IN THE BOX!"}
              {resolution.result === "cross_bigchance" && "BIG CHANCE!"}
              {resolution.result === "miss" && "WAY OFF!"}
              {resolution.result === "short_kept" && "POSSESSION KEPT!"}
            </div>
          )}
        </div>
      </div>
    </MatchModal>
  );
}
