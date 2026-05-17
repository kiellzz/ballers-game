import { pickOutfieldByGroups } from "../playerSelector";
import type {
  ActionType,
  DuelContext,
  EventTransition,
  MatchPlayer,
  MatchScore,
  MatchTeam,
  PossessionSide,
  ShotResult,
  Zone,
} from "../matchTypes";

const CLEARANCE_AFTER_LOOSE_BALL = 0.9;

const LOOSE_BALL_CLEARANCE_EVENT = {
  type: "clearance",
  message: "The defense hacks it away!",
} as const;

// ─── Shot helpers ─────────────────────────────────────────────────────────────

export function createEmptyShotResult(): ShotResult {
  return {
    happened: false,
    outcome: null,
    scoredBy: null,
    reboundKeptBy: null,
    setPieceAwarded: null,
  };
}

export function applyScoreFromShot(score: MatchScore, shotResult: ShotResult): MatchScore {
  if (shotResult.outcome !== "goal" || !shotResult.scoredBy) {
    return score;
  }

  if (shotResult.scoredBy === "user") {
    return { user: score.user + 1, opponent: score.opponent };
  }

  return { user: score.user, opponent: score.opponent + 1 };
}

export function shouldResolveOpenPlayShot(action: ActionType): boolean {
  return (
    action === "finish" ||
    action === "long_shot" ||
    action === "header" ||
    action === "rush_save" ||
    action === "wait"
  );
}

export function getGoalkeeperBigChanceAction(params: {
  action: ActionType;
  zone: DuelContext["zone"];
}): "rush_save" | "wait" | undefined {
  const { action, zone } = params;

  if (zone !== "def_bigchance") {
    return undefined;
  }

  if (action === "rush_save" || action === "wait") {
    return action;
  }

  return undefined;
}

// ─── Loose ball ───────────────────────────────────────────────────────────────

export function maybeResolveLooseBallClearance(params: {
  context: DuelContext;
  shotResult: ShotResult;
  random: () => number;
}): {
  event: typeof LOOSE_BALL_CLEARANCE_EVENT;
  transition: EventTransition;
} | null {
  const { context, shotResult, random } = params;

  if (
    !isLooseBallAfterShot(shotResult) ||
    random() >= CLEARANCE_AFTER_LOOSE_BALL
  ) {
    return null;
  }

  return {
    event: LOOSE_BALL_CLEARANCE_EVENT,
    transition: {
      fromZone: context.zone,
      toZone: getLooseBallClearanceZone(context.zone),
      fromLane: context.lane,
      toLane: context.lane,
      fromPossession: context.possession,
      toPossession: context.possession === "user" ? "opponent" : "user",
      createdBigChance: false,
      nextSituationType: "open_play",
      nextSetPieceType: null,
    },
  };
}

function isLooseBallAfterShot(shotResult: ShotResult): boolean {
  return (
    shotResult.happened &&
    shotResult.scoredBy === null &&
    shotResult.setPieceAwarded === null &&
    shotResult.reboundKeptBy === null &&
    (
      shotResult.outcome === "rebound" ||
      shotResult.outcome === "post" ||
      shotResult.outcome === "blocked"
    )
  );
}

function getLooseBallClearanceZone(zone: Zone): EventTransition["toZone"] {
  return zone.startsWith("atk_") ? "atk_mid" : "def_mid";
}

// ─── Foul helpers ─────────────────────────────────────────────────────────────

export function getFouledPlayerId(context: DuelContext): number {
  return context.possession === "user"
    ? context.actors.userPlayer.id
    : context.actors.opponentPlayer.id;
}

// ─── Ball carrier helpers ─────────────────────────────────────────────────────

export function shouldForceNewBallCarrier(action: ActionType): boolean {
  return (
    action === "side_pass" ||
    action === "forward_pass" ||
    action === "long_pass" ||
    action === "cross" ||
    action === "clearance" ||
    action === "emergency_clearance" ||
    action === "gk_clearance"
  );
}

export function pickNewBallCarrier(params: {
  team: MatchTeam;
  excludeId: number;
  preferredPlayer: MatchPlayer | null;
  random: () => number;
}): MatchPlayer | null {
  const { team, excludeId, preferredPlayer, random } = params;

  if (preferredPlayer && preferredPlayer.id !== excludeId) {
    return preferredPlayer;
  }

  const candidates = team.starters.filter(
    (p): p is Extract<MatchPlayer, { role: "outfield" }> =>
      p.role === "outfield" && p.id !== excludeId
  );

  if (candidates.length === 0) {
    const anyone = team.starters.filter(
      (p): p is Extract<MatchPlayer, { role: "outfield" }> => p.role === "outfield"
    );
    return anyone[Math.floor(random() * anyone.length)] ?? null;
  }

  return candidates[Math.floor(random() * candidates.length)] ?? null;
}

export function resolveForcedBallCarrier(params: {
  resolvedAction: ActionType;
  transition: EventTransition;
  duelContext: DuelContext;
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
  random: () => number;
}): { forcedUserPlayerId: number | null; forcedOpponentPlayerId: number | null } {
  const { resolvedAction, transition, duelContext, userTeam, opponentTeam, random } = params;

  let forcedUserPlayerId: number | null = null;
  let forcedOpponentPlayerId: number | null = null;

  const currentCarrierId =
    duelContext.possession === "user"
      ? duelContext.actors.userPlayer.id
      : duelContext.actors.opponentPlayer.id;

  if (transition.toPossession === "user") {
    const receiver = pickNewBallCarrier({
      team: userTeam,
      excludeId: currentCarrierId,
      preferredPlayer: duelContext.actors.supportUserPlayer ?? null,
      random,
    });
    forcedUserPlayerId = receiver?.id ?? null;

    if (forcedUserPlayerId === null && resolvedAction === "cross") {
      const fallback = pickOutfieldByGroups(
        userTeam,
        ["st", "am", "wing"],
        "center",
        transition.toZone,
        "user",
        random,
        currentCarrierId,
      );
      forcedUserPlayerId = fallback?.id ?? null;
    }
  } else if (transition.toPossession === "opponent") {
    const receiver = pickNewBallCarrier({
      team: opponentTeam,
      excludeId: currentCarrierId,
      preferredPlayer: duelContext.actors.supportOpponentPlayer ?? null,
      random,
    });
    forcedOpponentPlayerId = receiver?.id ?? null;

    if (forcedOpponentPlayerId === null && resolvedAction === "cross") {
      const fallback = pickOutfieldByGroups(
        opponentTeam,
        ["st", "am", "wing"],
        "center",
        transition.toZone,
        "opponent",
        random,
        currentCarrierId,
      );
      forcedOpponentPlayerId = fallback?.id ?? null;
    }
  }

  return { forcedUserPlayerId, forcedOpponentPlayerId };
}

// ─── Last touch tracking ──────────────────────────────────────────────────────

export function getLastTouchPlayerAndSide(
  context: DuelContext,
  transition: EventTransition
): { playerId: number; side: PossessionSide } {
  if (transition.toPossession !== context.possession) {
    const side = transition.toPossession;
    const playerId =
      side === "user"
        ? context.actors.userPlayer.id
        : context.actors.opponentPlayer.id;
    return { playerId, side };
  }

  return {
    playerId:
      context.possession === "user"
        ? context.actors.userPlayer.id
        : context.actors.opponentPlayer.id,
    side: context.possession,
  };
}

export function resolveLastTouchAfterOpenPlay(params: {
  previousPlayerId: number | null;
  previousSide: PossessionSide | null;
  context: DuelContext;
  transition: EventTransition;
  shotResult: ShotResult;
}): {
  playerId: number | null;
  side: PossessionSide | null;
} {
  const { previousPlayerId, previousSide, context, transition, shotResult } = params;

  if (shotResult.happened || transition.nextSituationType === "set_piece") {
    return { playerId: null, side: null };
  }

  if (!shouldTrackLastTouchFromOpenPlay(context.action)) {
    return { playerId: previousPlayerId, side: previousSide };
  }

  return getLastTouchPlayerAndSide(context, transition);
}

function shouldTrackLastTouchFromOpenPlay(action: ActionType): boolean {
  return (
    action === "side_pass" ||
    action === "forward_pass" ||
    action === "long_pass" ||
    action === "cross" ||
    action === "dribble" ||
    action === "sprint" ||
    action === "shield" ||
    action === "clearance" ||
    action === "gk_clearance" ||
    action === "intercept" ||
    action === "tackle" ||
    action === "slide_tackle" ||
    action === "block" ||
    action === "shoulder_charge" ||
    action === "emergency_clearance" ||
    action === "counterattack"
  );
}