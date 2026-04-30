import { createSituation } from "./balancing/situationMaker";
import { resolveDuel } from "./balancing/duelEngine";
import { randomizeEventOutcome } from "./balancing/eventRandomizer";
import { resolveFoul } from "./fouls/foulEngine";
import { resolveCard } from "./fouls/cardEngine";
import { resolveEventTransition } from "./balancing/eventResolver";
import { resolveOpenPlayShot } from "./open-play/resolveOpenPlayShot";
import {
  startInteractiveSetPieceFlow,
  continueFromPreInteractive,
  resolveQuickFreeKick,
  resolveInteractiveSetPiece,
} from "./interactive/interactiveSetPieceFlow";
import { getWhoAssisted } from "./ui_ux/whoAssisted";
import type { InteractiveSetPieceResolutionInput } from "./interactive/interactiveSetPieceFlow";
import type { SetPieceResolution } from "./setpiece/setPieceEngine";
import type {
  ActionType,
  DuelContext,
  EventTransition,
  FoulResult,
  GoalDetails,
  MatchEvent,
  MatchGoalRecord,
  MatchPlayer,
  MatchScore,
  MatchState,
  MatchTeam,
  PlayerMatchStats,
  PossessionSide,
  ShotResult,
  Zone,
} from "./matchTypes";
import { pickOutfieldByGroups } from "./playerSelector";

const CLEARANCE_AFTER_LOOSE_BALL = 0.9;

const LOOSE_BALL_CLEARANCE_EVENT = {
  type: "clearance",
  message: "The defense hacks it away!",
} as const;

interface CreateInitialMatchStateParams {
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
  random?: () => number;
}

interface RunMatchStepParams {
  state: MatchState;
  action: ActionType;
  random?: () => number;
}

interface RunInteractiveSetPieceStepParams {
  state: MatchState;
  input?: InteractiveSetPieceResolutionInput;
  random?: () => number;
}

export function createInitialMatchState(
  params: CreateInitialMatchStateParams
): MatchState {
  const { userTeam, opponentTeam, random = Math.random } = params;

  const currentSituation = createSituation({
    zone: "def_mid",
    lane: "center",
    possession: "user",
    userTeam,
    opponentTeam,
    situationType: "open_play",
    setPieceType: null,
    random,
  });

  return {
    context: {
      phase: "playing",
      turn: 1,
      score: {
        user: 0,
        opponent: 0,
      },
      clock: {
        minute: 1,
      },
    },
    userTeam,
    opponentTeam,
    currentSituation,
    lastEvent: null,
    history: [],
    interactiveSetPiece: null,
    lastTouchPlayerId: null,
    lastTouchSide: null,
    playerMatchStats: {},
    lastGoal: null,
  };
}

export function runMatchStep(params: RunMatchStepParams): MatchState {
  const { state, action, random = Math.random } = params;

  if (state.context.phase === "finished") {
    return state;
  }

  if (state.interactiveSetPiece) {
    return state;
  }

  const situation = state.currentSituation;

  if (!situation.availableActions.includes(action)) {
    throw new Error(`Action "${action}" is not available in the current situation.`);
  }

  const duelContext: DuelContext = {
    action,
    zone: situation.zone,
    lane: situation.lane,
    possession: situation.possession,
    situationType: situation.type,
    setPieceType: situation.setPieceType ?? null,
    actors: situation.actors,
  };

  const duelScores = resolveDuel(duelContext);

  const randomized = randomizeEventOutcome({
    context: duelContext,
    rawDelta: duelScores.rawDelta,
    random,
  });

  let foulResult: FoulResult = resolveFoul({
    context: duelContext,
    outcome: randomized.outcome,
    random,
  });

  const cardResult = resolveCard({
    context: duelContext,
    outcome: randomized.outcome,
    foulResult,
    random,
  });

  foulResult = {
    ...foulResult,
    card: cardResult.card,
  };

  const isDribbleBigChanceGoal =
    !foulResult.committed &&
    duelContext.action === "dribble" &&
    (duelContext.zone === "atk_bigchance" || duelContext.zone === "def_bigchance") &&
    (randomized.outcome === "success" || randomized.outcome === "success_high");

  const canResolveOpenPlayShot =
    !foulResult.committed && shouldResolveOpenPlayShot(action);

  const shotResult: ShotResult = isDribbleBigChanceGoal
    ? {
        happened: true,
        outcome: "goal",
        scoredBy: duelContext.possession,
        reboundKeptBy: null,
        setPieceAwarded: null,
      }
    : canResolveOpenPlayShot
      ? resolveOpenPlayShot({
          zone: duelContext.zone,
          possession: duelContext.possession,
          outcome: randomized.outcome,
          random,
          gkAction: getGoalkeeperBigChanceAction({
            action,
            zone: duelContext.zone,
          }),
        })
      : createEmptyShotResult();

  const scorerId =
    shotResult.outcome === "goal" && shotResult.scoredBy
      ? getPossessionPlayerId(duelContext)
      : null;

  const goalDetails = buildGoalDetails({
    scorerId,
    scorerSide: shotResult.scoredBy,
    lastTouchPlayerId: state.lastTouchPlayerId,
    lastTouchSide: state.lastTouchSide,
  });

  // --- DEBUG LOG: goal events ---
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

    console.log("[GOAL DEBUG - open play]", {
      scorerId: goalDetails.scorerId,
      scorerSide: goalDetails.scorerSide,
      scorerName: scorerPlayer?.name ?? "unknown",
      lastTouchPlayerId: state.lastTouchPlayerId,
      lastTouchSide: state.lastTouchSide,
      assistPlayerId: goalDetails.assistPlayerId,
      assistPlayerName: assistPlayer?.name ?? null,
      action,
      zone: duelContext.zone,
    });
  }

  const looseBallClearance = maybeResolveLooseBallClearance({
    context: duelContext,
    shotResult,
    random,
  });

  const resolvedAction: ActionType = looseBallClearance?.event.type ?? action;

  const transition =
    looseBallClearance?.transition ??
    resolveEventTransition({
      context: duelContext,
      outcome: randomized.outcome,
      foulResult,
      shotResult,
      random,
    });

  const lastEvent: MatchEvent = {
    action: resolvedAction,
    outcome: randomized.outcome,
    shotResult,
    foulResult,
    transition,
    actors: duelContext.actors,
    goalDetails,
    narration: looseBallClearance?.event.message,
  };

  const nextTurn = state.context.turn + 1;
  const nextMinute = calculateNextMinute(nextTurn);
  const nextLastTouch = resolveLastTouchAfterOpenPlay({
    previousPlayerId: state.lastTouchPlayerId,
    previousSide: state.lastTouchSide,
    context: duelContext,
    transition,
    shotResult,
  });

  const nextPlayerMatchStats = applyGoalToPlayerMatchStats(
    state.playerMatchStats,
    goalDetails
  );

  const nextLastGoal =
    createLastGoalRecord({
      goalDetails,
      fromZone: transition.fromZone,
      fromLane: transition.fromLane,
      minute: nextMinute,
      turn: nextTurn,
    }) ?? state.lastGoal;

  if (transition.nextSituationType === "set_piece" && transition.nextSetPieceType) {
    let setPieceSituation = createSituation({
      zone: transition.toZone,
      lane: transition.toLane,
      possession: transition.toPossession,
      userTeam: state.userTeam,
      opponentTeam: state.opponentTeam,
      situationType: "set_piece",
      setPieceType: transition.nextSetPieceType,
      random,
    });

    let setPieceContext: DuelContext = {
      action,
      zone: transition.toZone,
      lane: transition.toLane,
      possession: transition.toPossession,
      situationType: "set_piece",
      setPieceType: transition.nextSetPieceType,
      actors: setPieceSituation.actors,
    };

    let interactiveSetPiece = startInteractiveSetPieceFlow({
      context: setPieceContext,
      actors: setPieceSituation.actors,
    });

    if (
      transition.nextSetPieceType === "freekick" &&
      interactiveSetPiece.isQuickFlow
    ) {
      const preferredTakerId = getFouledPlayerId(duelContext);

      setPieceSituation = createSituation({
        zone: transition.toZone,
        lane: transition.toLane,
        possession: transition.toPossession,
        userTeam: state.userTeam,
        opponentTeam: state.opponentTeam,
        situationType: "set_piece",
        setPieceType: transition.nextSetPieceType,
        preferredTakerId,
        random,
      });

      setPieceContext = {
        action,
        zone: transition.toZone,
        lane: transition.toLane,
        possession: transition.toPossession,
        situationType: "set_piece",
        setPieceType: transition.nextSetPieceType,
        actors: setPieceSituation.actors,
      };

      interactiveSetPiece = startInteractiveSetPieceFlow({
        context: setPieceContext,
        actors: setPieceSituation.actors,
      });
    }

    return {
      ...state,
      context: {
        ...state.context,
        turn: nextTurn,
        clock: {
          minute: nextMinute,
        },
      },
      currentSituation: setPieceSituation,
      interactiveSetPiece,
      lastEvent,
      history: [...state.history, lastEvent],
      lastTouchPlayerId: nextLastTouch.playerId,
      lastTouchSide: nextLastTouch.side,
      playerMatchStats: nextPlayerMatchStats,
      lastGoal: nextLastGoal,
    };
  }

  const nextScore = applyScoreFromShot(state.context.score, shotResult);

  const nextPhase = nextMinute >= 90 ? "finished" : "playing";

  let forcedUserPlayerId: number | null = null;
  let forcedOpponentPlayerId: number | null = null;

  if (nextPhase !== "finished" && shouldForceNewBallCarrier(resolvedAction)) {
    const currentCarrierId =
      duelContext.possession === "user"
        ? duelContext.actors.userPlayer.id
        : duelContext.actors.opponentPlayer.id;

    if (transition.toPossession === "user") {
  const receiver = pickNewBallCarrier({
    team: state.userTeam,
    excludeId: currentCarrierId,
    preferredPlayer: duelContext.actors.supportUserPlayer ?? null,
    random,
  });
  forcedUserPlayerId = receiver?.id ?? null;

  // Fallback ponderado para cross: se pickNewBallCarrier retornou null
  // (sem supportUserPlayer e candidates vazio), seleciona por zona/posição
  if (forcedUserPlayerId === null && resolvedAction === "cross") {
    const fallback = pickOutfieldByGroups(
      state.userTeam,
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
    team: state.opponentTeam,
    excludeId: currentCarrierId,
    preferredPlayer: duelContext.actors.supportOpponentPlayer ?? null,
    random,
  });
  forcedOpponentPlayerId = receiver?.id ?? null;

  if (forcedOpponentPlayerId === null && resolvedAction === "cross") {
    const fallback = pickOutfieldByGroups(
      state.opponentTeam,
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
}

  const nextSituation =
    nextPhase === "finished"
      ? state.currentSituation
      : createSituation({
          zone: transition.toZone,
          lane: transition.toLane,
          possession: transition.toPossession,
          userTeam: state.userTeam,
          opponentTeam: state.opponentTeam,
          situationType: transition.nextSituationType,
          setPieceType: transition.nextSetPieceType ?? null,
          forcedUserPlayerId,
          forcedOpponentPlayerId,
          random,
        });

  return {
    ...state,
    context: {
      phase: nextPhase,
      turn: nextTurn,
      score: nextScore,
      clock: {
        minute: nextMinute,
      },
    },
    currentSituation: nextSituation,
    lastEvent,
    history: [...state.history, lastEvent],
    interactiveSetPiece: null,
    lastTouchPlayerId: nextLastTouch.playerId,
    lastTouchSide: nextLastTouch.side,
    playerMatchStats: nextPlayerMatchStats,
    lastGoal: nextLastGoal,
  };
}

export function runInteractiveSetPieceStep(
  params: RunInteractiveSetPieceStepParams
): MatchState {
  const { state, input, random = Math.random } = params;

  const flow = state.interactiveSetPiece;

  if (!flow) {
    return state;
  }

  if (flow.stage === "pre") {
    const preResult = continueFromPreInteractive(flow);

    if (preResult.shouldOpenModal) {
      return {
        ...state,
        interactiveSetPiece: preResult.nextState,
      };
    }

    if (preResult.shouldResolveQuickFlow) {
      const quickResult = resolveQuickFreeKick(preResult.nextState);

      return applyFinalResolution({
        state,
        resolution: quickResult.finalResolution,
        random,
      });
    }

    return {
      ...state,
      interactiveSetPiece: preResult.nextState,
    };
  }

  if (flow.stage === "modal") {
    if (!input) {
      return state;
    }

    const resolved = resolveInteractiveSetPiece(flow, input);

    return applyFinalResolution({
      state: {
        ...state,
        interactiveSetPiece: resolved.nextState,
      },
      resolution: resolved.finalResolution,
      random,
    });
  }

  return state;
}

function applyFinalResolution(params: {
  state: MatchState;
  resolution: SetPieceResolution;
  random: () => number;
}): MatchState {
  const { state, resolution, random } = params;
  const setPieceContext = state.interactiveSetPiece?.context;

  const nextScore = applyScoreFromShot(state.context.score, resolution.shotResult);

  const nextTurn = state.context.turn + 1;
  const nextMinute = calculateNextMinute(nextTurn);
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

  const nextPlayerMatchStats = applyGoalToPlayerMatchStats(
    state.playerMatchStats,
    goalDetails
  );

  const nextLastTouch = resolveLastTouchAfterSetPiece({
    context: setPieceContext,
    resolution,
  });

  const nextLastGoal =
    createLastGoalRecord({
      goalDetails,
      fromZone: setPieceContext?.zone ?? state.currentSituation.zone,
      fromLane: setPieceContext?.lane ?? state.currentSituation.lane,
      minute: nextMinute,
      turn: nextTurn,
    }) ?? state.lastGoal;

  const nextSetPieceType =
    resolution.nextSituationType === "set_piece"
      ? resolution.shotResult.setPieceAwarded ?? null
      : null;

  if (nextPhase === "finished") {
    return {
      ...state,
      context: {
        phase: nextPhase,
        turn: nextTurn,
        score: nextScore,
        clock: {
          minute: nextMinute,
        },
      },
      currentSituation: state.currentSituation,
      interactiveSetPiece: null,
      lastEvent: state.lastEvent,
      history: state.history,
      lastTouchPlayerId: nextLastTouch.playerId,
      lastTouchSide: nextLastTouch.side,
      playerMatchStats: nextPlayerMatchStats,
      lastGoal: nextLastGoal,
    };
  }

  if (resolution.nextSituationType === "set_piece" && nextSetPieceType) {
    const setPieceSituation = createSituation({
      zone: resolution.nextZone,
      lane: resolution.nextLane,
      possession: resolution.nextPossession,
      userTeam: state.userTeam,
      opponentTeam: state.opponentTeam,
      situationType: "set_piece",
      setPieceType: nextSetPieceType,
      random,
    });

    const setPieceContext: DuelContext = {
      action: state.currentSituation.availableActions[0] ?? "wait",
      zone: resolution.nextZone,
      lane: resolution.nextLane,
      possession: resolution.nextPossession,
      situationType: "set_piece",
      setPieceType: nextSetPieceType,
      actors: setPieceSituation.actors,
    };

    const interactiveSetPiece = startInteractiveSetPieceFlow({
      context: setPieceContext,
      actors: setPieceSituation.actors,
    });

    return {
      ...state,
      context: {
        phase: nextPhase,
        turn: nextTurn,
        score: nextScore,
        clock: {
          minute: nextMinute,
        },
      },
      currentSituation: setPieceSituation,
      interactiveSetPiece,
      lastEvent: state.lastEvent,
      history: state.history,
      lastTouchPlayerId: nextLastTouch.playerId,
      lastTouchSide: nextLastTouch.side,
      playerMatchStats: nextPlayerMatchStats,
      lastGoal: nextLastGoal,
    };
  }

  const nextSituation = createSituation({
    zone: resolution.nextZone,
    lane: resolution.nextLane,
    possession: resolution.nextPossession,
    userTeam: state.userTeam,
    opponentTeam: state.opponentTeam,
    situationType: resolution.nextSituationType,
    setPieceType: null,
    forcedUserPlayerId: resolution.forcedUserPlayerId,
    forcedOpponentPlayerId: resolution.forcedOpponentPlayerId,
    excludedUserPlayerId: resolution.excludedUserPlayerId,
    excludedOpponentPlayerId: resolution.excludedOpponentPlayerId,
    random,
  });

  return {
    ...state,
    context: {
      phase: nextPhase,
      turn: nextTurn,
      score: nextScore,
      clock: {
        minute: nextMinute,
      },
    },
    currentSituation: nextSituation,
    interactiveSetPiece: null,
    lastEvent: state.lastEvent,
    history: state.history,
    lastTouchPlayerId: nextLastTouch.playerId,
    lastTouchSide: nextLastTouch.side,
    playerMatchStats: nextPlayerMatchStats,
    lastGoal: nextLastGoal,
  };
}

function createEmptyShotResult(): ShotResult {
  return {
    happened: false,
    outcome: null,
    scoredBy: null,
    reboundKeptBy: null,
    setPieceAwarded: null,
  };
}

function maybeResolveLooseBallClearance(params: {
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

function getLooseBallClearanceZone(
  zone: DuelContext["zone"]
): EventTransition["toZone"] {
  return zone.startsWith("atk_") ? "atk_mid" : "def_mid";
}

function getFouledPlayerId(context: DuelContext): number {
  return context.possession === "user"
    ? context.actors.userPlayer.id
    : context.actors.opponentPlayer.id;
}

function shouldResolveOpenPlayShot(action: ActionType): boolean {
  return (
    action === "finish" ||
    action === "long_shot" ||
    action === "header" ||
    action === "rush_save" ||
    action === "wait"
  );
}

function getGoalkeeperBigChanceAction(params: {
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

function applyScoreFromShot(score: MatchScore, shotResult: ShotResult): MatchScore {
  if (shotResult.outcome !== "goal" || !shotResult.scoredBy) {
    return score;
  }

  if (shotResult.scoredBy === "user") {
    return {
      user: score.user + 1,
      opponent: score.opponent,
    };
  }

  return {
    user: score.user,
    opponent: score.opponent + 1,
  };
}

function calculateNextMinute(turn: number): number {
  return Math.min(90, Math.floor((turn - 1) * 1.5) + 1);
}

function shouldForceNewBallCarrier(action: ActionType): boolean {
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

// Substituir a função atual
function pickNewBallCarrier(params: {
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

function getPossessionPlayerId(context: DuelContext): number {
  return context.possession === "user"
    ? context.actors.userPlayer.id
    : context.actors.opponentPlayer.id;
}

/**
 * Returns the player id of the side that WINS possession after this action.
 * For defensive actions that successfully recover the ball, this is the
 * defender (opposite of context.possession). For all other actions it is
 * the current ball carrier.
 */
function getLastTouchPlayerAndSide(
  context: DuelContext,
  transition: EventTransition
): { playerId: number; side: PossessionSide } {
  // Possession changed → the defensive player who won the ball gets credit.
  if (transition.toPossession !== context.possession) {
    const side = transition.toPossession;
    const playerId =
      side === "user"
        ? context.actors.userPlayer.id
        : context.actors.opponentPlayer.id;
    return { playerId, side };
  }

  // Possession stayed with the same side → the ball carrier touched it.
  return {
    playerId: getPossessionPlayerId(context),
    side: context.possession,
  };
}

function buildGoalDetails(params: {
  scorerId: number | null;
  scorerSide: PossessionSide | null;
  lastTouchPlayerId: number | null;
  lastTouchSide: PossessionSide | null;
  allowAssist?: boolean;
}): GoalDetails | null {
  const {
    scorerId,
    scorerSide,
    lastTouchPlayerId,
    lastTouchSide,
    allowAssist = true,
  } = params;

  if (scorerId === null || scorerSide === null) {
    return null;
  }

  return {
    scorerId,
    scorerSide,
    assistPlayerId: allowAssist
      ? getWhoAssisted({
          scorerId,
          scorerSide,
          lastTouchPlayerId,
          lastTouchSide,
        })
      : null,
  };
}

function applyGoalToPlayerMatchStats(
  playerMatchStats: PlayerMatchStats,
  goalDetails: GoalDetails | null
): PlayerMatchStats {
  if (!goalDetails) {
    return playerMatchStats;
  }

  const nextStats: PlayerMatchStats = {
    ...playerMatchStats,
  };

  const scorerKey = `${goalDetails.scorerSide}:${goalDetails.scorerId}`;
  const scorerStats = nextStats[scorerKey] ?? { goals: 0, assists: 0 };

  nextStats[scorerKey] = {
    ...scorerStats,
    goals: scorerStats.goals + 1,
  };

  if (goalDetails.assistPlayerId !== null) {
    const assistKey = `${goalDetails.scorerSide}:${goalDetails.assistPlayerId}`;
    const assistStats = nextStats[assistKey] ?? { goals: 0, assists: 0 };

    nextStats[assistKey] = {
      ...assistStats,
      assists: assistStats.assists + 1,
    };
  }

  return nextStats;
}

function resolveLastTouchAfterOpenPlay(params: {
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

  // After a shot or when transitioning into a set piece, always clear lastTouch.
  // The goal/assist has already been computed at this point, and the next
  // sequence starts fresh (kickoff, penalty spot, etc.).
  if (shotResult.happened || transition.nextSituationType === "set_piece") {
    return { playerId: null, side: null };
  }

  // Actions that don't produce a meaningful touch on the ball (e.g. duel
  // failures that simply lose possession silently) keep the previous value.
  if (!shouldTrackLastTouchFromOpenPlay(context.action)) {
    return { playerId: previousPlayerId, side: previousSide };
  }

  // Use the helper that is possession-change aware.
  return getLastTouchPlayerAndSide(context, transition);
}

function resolveLastTouchAfterSetPiece(params: {
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
    // Defensive actions: when these succeed they recover the ball — the
    // defending player is the last to touch it and must be recorded with
    // the correct side (transition.toPossession).
    action === "intercept" ||
    action === "tackle" ||
    action === "slide_tackle" ||
    action === "block" ||
    action === "shoulder_charge" ||
    action === "emergency_clearance" ||
    action === "counterattack"
  );
}

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

function createLastGoalRecord(params: {
  goalDetails: GoalDetails | null;
  fromZone: EventTransition["fromZone"];
  fromLane: EventTransition["fromLane"];
  minute: number;
  turn: number;
}): MatchGoalRecord | null {
  const { goalDetails, fromZone, fromLane, minute, turn } = params;

  if (!goalDetails) {
    return null;
  }

  return {
    id: `goal-${turn}-${goalDetails.scorerSide}-${goalDetails.scorerId}`,
    scorerId: goalDetails.scorerId,
    scorerSide: goalDetails.scorerSide,
    assistPlayerId: goalDetails.assistPlayerId,
    minute,
    fromZone,
    fromLane,
  };
}