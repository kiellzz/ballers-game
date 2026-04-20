import type { PossessionSide, Zone } from "./matchTypes";

export function getRestartAfterGoal(scoredBy: PossessionSide): {
  nextZone: Zone;
  nextPossession: PossessionSide;
} {
  if (scoredBy === "user") {
    return {
      nextZone: "atk_mid",
      nextPossession: "opponent",
    };
  }

  return {
    nextZone: "def_mid",
    nextPossession: "user",
  };
}
