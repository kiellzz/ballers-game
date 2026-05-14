import "./MatchMap.css";
import { MatchBall, type BallMovementType } from "./MatchBall";
import type { Lane, PossessionSide, Zone } from "../../match-engine/matchTypes";

interface MatchMapProps {
  zone: Zone;
  lane?: Lane;
  possession: PossessionSide;
  movementType?: BallMovementType;
  isGoalAnimation?: boolean;
  scoredBy?: PossessionSide | null;
}

export const MatchMap = ({
  zone,
  lane = "center",
  possession,
  movementType = "normal",
  isGoalAnimation = false,
  scoredBy = null,
}: MatchMapProps) => {
  const topByZone: Record<Zone, string> = {
    def_box: "88%",
    def_nearbox: "78%",
    def_third: "68%",
    def_mid: "58%",
    atk_mid: "42%",
    atk_third: "32%",
    atk_nearbox: "22%",
    atk_box: "12%",
    atk_bigchance: "8%",
    def_bigchance: "92%",
    atk_corner: "18%",
    def_corner: "82%",
    def_goalkeeper: "92%",
    atk_goalkeeper: "8%",
  };

  const leftByLane: Record<Lane, string> = {
    left: "24%",
    center: "50%",
    right: "76%",
  };

  let topPosition = topByZone[zone] ?? "50%";

  let leftPosition =
    zone === "def_box" ||
    zone === "atk_box" ||
    zone === "atk_bigchance" ||
    zone === "def_bigchance"
      ? "50%"
      : leftByLane[lane] ?? "50%";

  if (isGoalAnimation) {
    topPosition = scoredBy === "user" ? "4%" : "96%";
    leftPosition = "50%";
  }

  const isOpponent = possession === "opponent";

  const isDangerZone =
    isOpponent &&
    (zone === "def_box" ||
      zone === "def_bigchance" ||
      zone === "def_nearbox");

  const possessionClass = isOpponent
    ? "opponent-possession"
    : "user-possession";

  const dangerClass = isDangerZone ? "danger-zone" : "";

  const resolvedMovementType: BallMovementType = isGoalAnimation
    ? "goal"
    : movementType;

  return (
    <div className={`map-overlay-container ${possessionClass} ${dangerClass}`}>
      <div className="map-relative-box">
        <img
          src="/images/matchfield.jpg"
          className={`map-bg-img ${isOpponent ? "danger-mode" : ""}`}
          alt="field"
        />

        {isOpponent && <div className="danger-overlay" />}

        <MatchBall
          topPosition={topPosition}
          leftPosition={leftPosition}
          movementType={resolvedMovementType}
        />
      </div>

      <div className="map-caption">MATCH MAP</div>
    </div>
  );
};