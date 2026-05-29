import { createSituation } from "../balancing/situationMaker";
import { startInteractiveSetPieceFlow } from "../interactive/interactiveSetPieceFlow";
import {
  getNumericalAdvantageState,
  getSentOffPlayerIds,
} from "../fouls/disciplineState";
import type { SetPieceResolution } from "../setpiece/setPieceEngine";
import type {
  DuelContext,MatchEvent,
  MatchState,
  PossessionSide,
  Zone,
} from "../matchTypes";
import { calculateNextMinute } from "./matchClock";
import { applyEventToPlayerMatchStats } from "./playerMatchStats";
import { buildGoalDetails, createLastGoalRecord, getPossessionPlayerId } from "./goalHelpers";
import { applyScoreFromShot } from "./matchStateHelpers";
import { commitEvent } from "./matchEngineInternal";

// ─── Corner continuation helper ───────────────────────────────────────────────

function isCornerContinuationTouch(params: {
  side: PossessionSide;
  zone: Zone;
}): boolean {
  
const { side, zone } = params;

  if (side === "user") {
    return (
      zone === "atk_nearbox" ||
      zone === "atk_box" ||
      zone === "atk_bigchance"
    );
  }

  return (
    zone === "def_nearbox" ||
    zone === "def_box" ||
    zone === "def_bigchance"
  );
}

// ─── Last touch after set piece ───────────────────────────────────────────────

export function resolveLastTouchAfterSetPiece(params: {
  context: DuelContext | null | undefined;
  resolution: SetPieceResolution;
}): {
  playerId: number | null;
  side: PossessionSide | null;
} {
  const { context, resolution } = params;

  if (!context) {
    return { playerId: null, side: null };
  }

  if (resolution.shotResult.happened || resolution.nextSituationType === "set_piece") {
    return { playerId: null, side: null };
  }

  if (resolution.setPieceType === "freekick") {
    return {
      playerId: getPossessionPlayerId(context),
      side: context.possession,
    };
  }

  if (
    resolution.setPieceType === "corner" &&
    resolution.nextPossession === context.possession &&
    isCornerContinuationTouch({
      side: context.possession,
      zone: resolution.nextZone,
    })
  ) {
    return {
      playerId: getPossessionPlayerId(context),
      side: context.possession,
    };
  }

  return { playerId: null, side: null };
}

// ─── Apply final resolution ───────────────────────────────────────────────────

export function applyFinalResolution(params: {
  state: MatchState;
  resolution: SetPieceResolution;
  random: () => number;
}): MatchState {
  const { state, resolution, random } = params;
  const setPieceContext = state.interactiveSetPiece?.context;
  const unavailableUserPlayerIds = getSentOffPlayerIds(
    state.disciplinaryState,
    "user"
  );
  const unavailableOpponentPlayerIds = getSentOffPlayerIds(
    state.disciplinaryState,
    "opponent"
  );

  const nextScore = applyScoreFromShot(state.context.score, resolution.shotResult);

  const nextTurn = state.context.turn + 1;

  const { nextMinute, nextConsecutiveZeros } = calculateNextMinute(
    state.context.clock.minute,
    state.context.consecutiveZeroMinutes,
    random,
  );

  const nextPhase = nextMinute >= 90 ? "finished" : "playing";

  const scorerId =
    resolution.shotResult.outcome === "goal" &&
    resolution.shotResult.scoredBy &&
    setPieceContext
      ? getPossessionPlayerId(setPieceContext)
      : null;

  const goalDetails = buildGoalDetails({
    scorerId,
    scorerSide: resolution.shotResult.scoredBy,
    lastTouchPlayerId: state.lastTouchPlayerId,
    lastTouchSide: state.lastTouchSide,
    allowAssist:
      resolution.setPieceType !== "penalty" &&
      resolution.setPieceType !== "freekick",
  });

  // --- DEBUG LOG: set piece goal events ---
  if (goalDetails) {
    const scoringTeam =
      goalDetails.scorerSide === "user" ? state.userTeam : state.opponentTeam;
    const scorerPlayer = scoringTeam.starters.find(
      (p) => p.id === goalDetails.scorerId
    );

    const assistTeam =
      goalDetails.scorerSide === "user" ? state.userTeam : state.opponentTeam;
    const assistPlayer =
      goalDetails.assistPlayerId != null
        ? assistTeam.starters.find((p) => p.id === goalDetails.assistPlayerId)
        : null;

    console.log("[GOAL DEBUG - set piece]", {
      scorerId: goalDetails.scorerId,
      scorerSide: goalDetails.scorerSide,
      scorerName: scorerPlayer?.name ?? "unknown",
      lastTouchPlayerId: state.lastTouchPlayerId,
      lastTouchSide: state.lastTouchSide,
      assistPlayerId: goalDetails.assistPlayerId,
      assistPlayerName: assistPlayer?.name ?? null,
      setPieceType: resolution.setPieceType,
      allowAssist:
        resolution.setPieceType !== "penalty" &&
        resolution.setPieceType !== "freekick",
    });
  }

  const fromZone = setPieceContext?.zone ?? state.currentSituation.zone;
  const fromLane = setPieceContext?.lane ?? state.currentSituation.lane;
  const fromPossession =
    setPieceContext?.possession ?? state.currentSituation.possession;

  const nextSetPieceTypeForTransition =
    resolution.nextSituationType === "set_piece"
      ? (resolution.shotResult.setPieceAwarded ?? null)
      : null;

  const scorerSide = goalDetails?.scorerSide ?? null;
  const scorerIdResolved = goalDetails?.scorerId ?? null;

  let resolvedActors = setPieceContext?.actors ?? state.currentSituation.actors;

  if (scorerIdResolved && scorerSide && setPieceContext) {
    const team =
      scorerSide === "user" ? state.userTeam : state.opponentTeam;

    const scorerPlayer = team.starters.find(
      (p) => p.id === scorerIdResolved
    );

    if (scorerPlayer) {
      resolvedActors = {
        ...resolvedActors,
        ...(scorerSide === "user"
          ? { userPlayer: scorerPlayer }
          : { opponentPlayer: scorerPlayer }),
      };
    }
  }

  const setPieceEvent: MatchEvent = {
    turn: nextTurn,
    action: setPieceContext?.action ?? "wait",
    outcome: "success",
    isPenaltyGoal:
      resolution.setPieceType === "penalty" &&
      resolution.shotResult.outcome === "goal",
    shotResult: resolution.shotResult,
    foulResult: {
      committed: false,
      by: null,
      card: "none",
      playerId: null,
      playerSide: null,
      sentOff: false,
      dismissalType: "none",
      setPieceAwarded: null,
      awardedTo: null,
    },
    transition: {
      fromZone,
      toZone: resolution.nextZone,
      fromLane,
      toLane: resolution.nextLane,
      fromPossession,
      toPossession: resolution.nextPossession,
      createdBigChance: false,
      nextSituationType: resolution.nextSituationType,
      nextSetPieceType: nextSetPieceTypeForTransition,
    },
    actors: resolvedActors,
    goalDetails,
    narration: undefined,
  };

  const nextPlayerMatchStats = applyEventToPlayerMatchStats(
    state.playerMatchStats,
    goalDetails,
    {
      action: setPieceContext?.action ?? "wait",
      outcome: null,
      transition: null,
      shotResult: resolution.shotResult,
      foulResult: setPieceEvent.foulResult,
      actors: setPieceContext?.actors ?? state.currentSituation.actors,
      possession: fromPossession,
      isBigChance: false,
      setPieceType: resolution.setPieceType,
    }
  );

  const nextLastTouch = resolveLastTouchAfterSetPiece({
    context: setPieceContext,
    resolution,
  });

  const nextLastGoal =
    createLastGoalRecord({
      goalDetails,
      fromZone,
      fromLane,
      minute: nextMinute,
      turn: nextTurn,
    }) ?? state.lastGoal;

  const nextSetPieceType =
    resolution.nextSituationType === "set_piece"
      ? resolution.shotResult.setPieceAwarded ?? null
      : null;

  if (nextPhase === "finished") {
    const { history, lastEvent: _prevEvent, ...withoutPersistence } = state;
    return commitEvent(
      {
        ...withoutPersistence,
        history,
        lastEvent: _prevEvent,
        context: {
          phase: nextPhase,
          turn: nextTurn,
          score: nextScore,
          clock: { minute: nextMinute },
          consecutiveZeroMinutes: nextConsecutiveZeros,
        },
        currentSituation: state.currentSituation,
        interactiveSetPiece: null,
        lastTouchPlayerId: nextLastTouch.playerId,
        lastTouchSide: nextLastTouch.side,
        playerMatchStats: nextPlayerMatchStats,
        lastGoal: nextLastGoal,
      },
      setPieceEvent
    );
  }

  if (resolution.nextSituationType === "set_piece" && nextSetPieceType) {
    const setPieceSituation = createSituation({
      zone: resolution.nextZone,
      lane: resolution.nextLane,
      possession: resolution.nextPossession,
      userTeam: state.userTeam,
      opponentTeam: state.opponentTeam,
      unavailableUserPlayerIds,
      unavailableOpponentPlayerIds,
      situationType: "set_piece",
      setPieceType: nextSetPieceType,
      random,
    });

    const nextContext: DuelContext = {
      action: state.currentSituation.availableActions[0] ?? "wait",
      zone: resolution.nextZone,
      lane: resolution.nextLane,
      possession: resolution.nextPossession,
      situationType: "set_piece",
      setPieceType: nextSetPieceType,
      actors: setPieceSituation.actors,
      numericalAdvantage: getNumericalAdvantageState(state.disciplinaryState),
    };

    const interactiveSetPiece = startInteractiveSetPieceFlow({
      context: nextContext,
      actors: setPieceSituation.actors,
    });

    const { history, lastEvent: _prevEvent, ...withoutPersistence } = state;
    return commitEvent(
      {
        ...withoutPersistence,
        history,
        lastEvent: _prevEvent,
        context: {
          phase: nextPhase,
          turn: nextTurn,
          score: nextScore,
          clock: { minute: nextMinute },
          consecutiveZeroMinutes: nextConsecutiveZeros,
        },
        currentSituation: setPieceSituation,
        interactiveSetPiece,
        lastTouchPlayerId: nextLastTouch.playerId,
        lastTouchSide: nextLastTouch.side,
        playerMatchStats: nextPlayerMatchStats,
        lastGoal: nextLastGoal,
      },
      setPieceEvent
    );
  }

  const nextSituation = createSituation({
    zone: resolution.nextZone,
    lane: resolution.nextLane,
    possession: resolution.nextPossession,
    userTeam: state.userTeam,
    opponentTeam: state.opponentTeam,
    unavailableUserPlayerIds,
    unavailableOpponentPlayerIds,
    situationType: resolution.nextSituationType,
    setPieceType: null,
    forcedUserPlayerId: resolution.forcedUserPlayerId,
    forcedOpponentPlayerId: resolution.forcedOpponentPlayerId,
    excludedUserPlayerId: resolution.excludedUserPlayerId,
    excludedOpponentPlayerId: resolution.excludedOpponentPlayerId,
    random,
  });

  const { history, lastEvent: _prevEvent, ...withoutPersistence } = state;
  return commitEvent(
    {
      ...withoutPersistence,
      history,
      lastEvent: _prevEvent,
      context: {
        phase: nextPhase,
        turn: nextTurn,
        score: nextScore,
        clock: { minute: nextMinute },
        consecutiveZeroMinutes: nextConsecutiveZeros,
      },
      currentSituation: nextSituation,
      interactiveSetPiece: null,
      lastTouchPlayerId: nextLastTouch.playerId,
      lastTouchSide: nextLastTouch.side,
      playerMatchStats: nextPlayerMatchStats,
      lastGoal: nextLastGoal,
    },
    setPieceEvent
  );
}
