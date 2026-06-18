/* src/components/match/MatchBall.tsx */
import React, { useEffect, useRef, useState } from "react";
import "./MatchBall.css";

export type BallMovementType =
  | "normal"
  | "cross"
  | "long_pass"
  | "clearance"
  | "shot"
  | "blocked"
  | "post"
  | "goal";

interface MatchBallProps {
  topPosition: string;
  leftPosition: string;
  movementType?: BallMovementType;
}

type BallLane = "left" | "center" | "right";
type BallPosition = {
  x: string;
  y: string;
};

function getLaneFromLeft(left: string): BallLane {
  if (left === "24%") return "left";
  if (left === "76%") return "right";
  return "center";
}

function getStepDelay(movementType: BallMovementType): number {
  if (
    movementType === "shot" ||
    movementType === "post" ||
    movementType === "goal"
  ) {
    return 190;
  }
  return 325;
}

function getMovementDuration(movementType: BallMovementType): number {
  if (
    movementType === "shot" ||
    movementType === "post" ||
    movementType === "goal"
  ) {
    return 380;
  }
  return 650;
}

export const MatchBall: React.FC<MatchBallProps> = ({
  topPosition,
  leftPosition,
  movementType = "normal",
}) => {
  const [currentPos, setCurrentPos] = useState<BallPosition>({
    x: leftPosition,
    y: topPosition,
  });
  const [isMoving, setIsMoving] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const movingTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const visualPosRef = useRef<BallPosition>({
    x: leftPosition,
    y: topPosition,
  });

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      if (movingTimeoutRef.current !== null) {
        window.clearTimeout(movingTimeoutRef.current);
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextPos = { x: leftPosition, y: topPosition };
    const hasPositionChanged =
      visualPosRef.current.x !== nextPos.x || visualPosRef.current.y !== nextPos.y;

    if (!hasPositionChanged) {
      return;
    }

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (movingTimeoutRef.current !== null) {
      window.clearTimeout(movingTimeoutRef.current);
      movingTimeoutRef.current = null;
    }

    const prevLane = getLaneFromLeft(visualPosRef.current.x);
    const nextLane = getLaneFromLeft(leftPosition);
    const movementDuration = getMovementDuration(movementType);
    const stepDelay = getStepDelay(movementType);

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;

      if (
        prevLane !== nextLane &&
        prevLane !== "center" &&
        nextLane !== "center"
      ) {
        const centerPos = { x: "50%", y: topPosition };

        setIsMoving(true);
        visualPosRef.current = centerPos;
        setCurrentPos(centerPos);

        movingTimeoutRef.current = window.setTimeout(() => {
          setIsMoving(false);
          movingTimeoutRef.current = null;
        }, stepDelay + movementDuration);

        transitionTimeoutRef.current = window.setTimeout(() => {
          visualPosRef.current = nextPos;
          setCurrentPos(nextPos);
          transitionTimeoutRef.current = null;
        }, stepDelay);

        return;
      }

      setIsMoving(true);
      movingTimeoutRef.current = window.setTimeout(() => {
        setIsMoving(false);
        movingTimeoutRef.current = null;
      }, movementDuration);

      visualPosRef.current = nextPos;
      setCurrentPos(nextPos);
    });

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [leftPosition, topPosition, movementType]);

  return (
    <div
      className={`map-ball-wrapper map-ball-wrapper--${movementType}${
        isMoving ? " map-ball-wrapper--moving" : ""
      }`}
      style={{
        top: currentPos.y,
        left: currentPos.x,
      }}
    >
      <img
        src="/images/ball.png"
        alt="Ball"
        className={`map-ball-sprite map-ball-sprite--${movementType}${
          isMoving ? " map-ball-sprite--moving" : ""
        }`}
      />
    </div>
  );
};
