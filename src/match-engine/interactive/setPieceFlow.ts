import type { FreeKickDistance } from "../balancing/resolveFk";
import type {
  PossessionSide,
  SetPieceType,
  Zone,
} from "../matchTypes";

export type UserSetPieceFlow =
  | { type: "penalty" }
  | { type: "freekick"; distance: FreeKickDistance }
  | { type: "quick_freekick" }
  | { type: "corner" }
  | null;

/**
 * User interactive free kick:
 * atk_third   -> short
 * atk_nearbox -> mid
 * atk_mid     -> long
 *
 * Other zones -> no user interactive free kick
 * (it becomes a quick free kick, as long as the set piece is a freekick)
 */
export function getUserFreeKickDistanceFromZone(
  zone: Zone
): FreeKickDistance | null {
  switch (zone) {
    case "atk_third":
      return "short";
    case "atk_nearbox":
      return "mid";
    case "atk_mid":
      return "long";
    default:
      return null;
  }
}

/**
 * User interactive penalty:
 * atk_box
 * atk_bigchance
 */
export function isUserPenaltyZone(zone: Zone): boolean {
  return zone === "atk_box" || zone === "atk_bigchance";
}

/**
 * User interactive corner:
 * atk_corner
 */
export function isUserCornerZone(zone: Zone): boolean {
  return zone === "atk_corner";
}

/**
 * Resolves which interactive set-piece flow
 * should come next for the user.
 *
 * Rules:
 * - awardedTo must be "user"
 * - penalty in atk_box/atk_bigchance -> PenModal
 * - freekick in atk_third/atk_nearbox/atk_mid -> FkModal with distance
 * - freekick in other zones -> quick free kick
 * - corner in atk_corner -> CornerModal
 * - any other case -> null
 */
export function resolveUserSetPieceFlow(params: {
  setPieceType: SetPieceType | null;
  zone: Zone;
  awardedTo: PossessionSide | null;
}): UserSetPieceFlow {
  const { setPieceType, zone, awardedTo } = params;

  if (awardedTo !== "user") {
    return null;
  }

  if (setPieceType === "penalty") {
    return isUserPenaltyZone(zone) ? { type: "penalty" } : null;
  }

  if (setPieceType === "freekick") {
    const distance = getUserFreeKickDistanceFromZone(zone);

    if (distance) {
      return { type: "freekick", distance };
    }

    return { type: "quick_freekick" };
  }

  if (setPieceType === "corner") {
    return isUserCornerZone(zone) ? { type: "corner" } : null;
  }

  return null;
}

/**
 * Optional helpers to make consumption more readable
 */
export function shouldOpenUserPenaltyModal(params: {
  setPieceType: SetPieceType | null;
  zone: Zone;
  awardedTo: PossessionSide | null;
}): boolean {
  return resolveUserSetPieceFlow(params)?.type === "penalty";
}

export function getUserFreeKickFlow(params: {
  setPieceType: SetPieceType | null;
  zone: Zone;
  awardedTo: PossessionSide | null;
}): { type: "freekick"; distance: FreeKickDistance } | null {
  const flow = resolveUserSetPieceFlow(params);

  return flow?.type === "freekick" ? flow : null;
}

export function shouldRunUserQuickFreeKick(params: {
  setPieceType: SetPieceType | null;
  zone: Zone;
  awardedTo: PossessionSide | null;
}): boolean {
  return resolveUserSetPieceFlow(params)?.type === "quick_freekick";
}

export function shouldOpenUserCornerModal(params: {
  setPieceType: SetPieceType | null;
  zone: Zone;
  awardedTo: PossessionSide | null;
}): boolean {
  return resolveUserSetPieceFlow(params)?.type === "corner";
}
