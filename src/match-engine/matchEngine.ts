// src/match-engine/matchEngine.ts
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
  EventOutcome,
  EventTransition,
  FoulResult,
  GoalDetails,
  MatchActors,
  MatchEvent,
  MatchGoalRecord,
  MatchPlayer,
  MatchScore,
  MatchState,
  MatchTeam,
  PlayerMatchStats,
  PossessionSide,
  SetPieceType,
  ShotResult,
  Zone,
} from "./matchTypes";
import { emptyStatLine } from "./matchTypes";
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
  const initialPlayerMatchStats: PlayerMatchStats = {};

  for (const player of userTeam.starters) {
    const key = `user:${player.id}`;
    const st = emptyStatLine();
    const pos = player.position.toLowerCase();
    if (pos === "gk" || pos === "cb" || pos === "lb" || pos === "rb") {
      st.cleanSheetBonusEligible = 1;
    }
    initialPlayerMatchStats[key] = st;
  }

  for (const player of opponentTeam.starters) {
    const key = `opponent:${player.id}`;
    const st = emptyStatLine();
    const pos = player.position.toLowerCase();
    if (pos === "gk" || pos === "cb" || pos === "lb" || pos === "rb") {
      st.cleanSheetBonusEligible = 1;
    }
    initialPlayerMatchStats[key] = st;
  }

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
      consecutiveZeroMinutes: 0,
    },
    userTeam,
    opponentTeam,
    currentSituation,
    lastEvent: null,
    history: [],
    interactiveSetPiece: null,
    lastTouchPlayerId: null,
    lastTouchSide: null,
    playerMatchStats: initialPlayerMatchStats,
    lastGoal: null,
  };
}

function commitEvent(state: MatchState, event: MatchEvent): MatchState {
  const last = state.history[state.history.length - 1];
  const history =
    last !== undefined && last.turn === event.turn
      ? [...state.history.slice(0, -1), event]
      : [...state.history, event];
  return {
    ...state,
    history,
    lastEvent: event,
  };
}

// ─── Clock ────────────────────────────────────────────────────────────────────

/**
 * Calculates the next match minute with randomized progression.
 *
 * - Normal play (< 85 min): advances 0–3 minutes, triangular distribution
 *   centered around 1–2 (most common). Never allows more than 2 consecutive
 *   zero-minute turns to prevent the match from stalling.
 *
 * - Late game (≥ 85 min): advances 0 or 1 minute per action. Same
 *   consecutive-zero guard applies, guaranteeing the match ends within
 *   a reasonable number of actions after the 85th minute.
 */
function calculateNextMinute(
  currentMinute: number,
  consecutiveZeros: number,
  random: () => number
): { nextMinute: number; nextConsecutiveZeros: number } {
  const isLateGame = currentMinute >= 85;

  // After 2 consecutive zero-minute turns, force at least 1 minute of progress
  const forceAdvance = consecutiveZeros >= 2;

  let delta: number;

  if (isLateGame) {
    delta = forceAdvance ? 1 : Math.round(random()); // 0 or 1
  } else {
    if (forceAdvance) {
      delta = Math.floor(random() * 3) + 1; // guaranteed 1, 2, or 3
    } else {
      // Triangular distribution: sum of two [0, 1.5] randoms → range 0–3, mean ~1.5
      delta = Math.round(random() * 1.5 + random() * 1.5);
    }
  }

  const nextMinute = Math.min(90, currentMinute + delta);
  const nextConsecutiveZeros = delta === 0 ? consecutiveZeros + 1 : 0;

  return { nextMinute, nextConsecutiveZeros };
}

// ─────────────────────────────────────────────────────────────────────────────

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

  const nextTurn = state.context.turn + 1;

  const { nextMinute, nextConsecutiveZeros } = calculateNextMinute(
    state.context.clock.minute,
    state.context.consecutiveZeroMinutes,
    random,
  );

  const lastEvent: MatchEvent = {
    turn: nextTurn,
    action: resolvedAction,
    outcome: randomized.outcome,
    shotResult,
    foulResult,
    transition,
    actors: duelContext.actors,
    goalDetails,
    narration: looseBallClearance?.event.message,
  };

  const nextLastTouch = resolveLastTouchAfterOpenPlay({
    previousPlayerId: state.lastTouchPlayerId,
    previousSide: state.lastTouchSide,
    context: duelContext,
    transition,
    shotResult,
  });

  const nextPlayerMatchStats = applyEventToPlayerMatchStats(
    state.playerMatchStats,
    goalDetails,
    {
      action,
      outcome: randomized.outcome,
      transition,
      shotResult,
      actors: duelContext.actors,
      possession: duelContext.possession,
      isBigChance: state.currentSituation.isBigChance,
      setPieceType: duelContext.setPieceType ?? null,
    }
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

    const { history, lastEvent: _prevEvent, ...withoutPersistence } = state;
    return commitEvent(
      {
        ...withoutPersistence,
        history,
        lastEvent: _prevEvent,
        context: {
          ...state.context,
          turn: nextTurn,
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
      lastEvent
    );
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
    lastEvent
  );
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

// ─────────────────────────────────────────────────────────────────────────────
// Player match stats — full event tracking
// ─────────────────────────────────────────────────────────────────────────────

interface EventStatContext {
  action: ActionType;
  outcome: EventOutcome | null;
  transition: EventTransition | null;
  shotResult: ShotResult;
  actors: MatchActors;
  possession: PossessionSide;
  isBigChance?: boolean;
  setPieceType?: SetPieceType | null;
}

function defenderSide(possession: PossessionSide): PossessionSide {
  return possession === "user" ? "opponent" : "user";
}

function attackerKey(possession: PossessionSide, actors: MatchActors): string {
  const id =
    possession === "user"
      ? actors.userPlayer.id
      : actors.opponentPlayer.id;
  return `${possession}:${id}`;
}

function defenderKey(possession: PossessionSide, actors: MatchActors): string {
  const side = defenderSide(possession);
  const id =
    side === "user"
      ? actors.userPlayer.id
      : actors.opponentPlayer.id;
  return `${side}:${id}`;
}

function statGkKey(side: PossessionSide, actors: MatchActors): string {
  const gk = side === "user" ? actors.userGoalkeeper : actors.opponentGoalkeeper;
  return `${side}:${gk.id}`;
}

function applyEventToPlayerMatchStats(
  playerMatchStats: PlayerMatchStats,
  goalDetails: GoalDetails | null,
  ctx: EventStatContext
): PlayerMatchStats {
  const next: PlayerMatchStats = { ...playerMatchStats };

  function get(key: string) {
    return next[key] ? { ...next[key] } : emptyStatLine();
  }

  const {
    action,
    outcome,
    transition,
    shotResult,
    actors,
    possession,
    isBigChance = false,
    setPieceType = null,
  } = ctx;

  const atkKey  = attackerKey(possession, actors);
  const defKey  = defenderKey(possession, actors);
  const defSide = defenderSide(possession);

  const isSuccess = outcome === "success" || outcome === "success_high";
  const isFail    = outcome === "fail"    || outcome === "fail_high";

  // ── 0. Mark clean-sheet eligible roles ────────────────────────────────────
  {
    const userGKKey = statGkKey("user", actors);
    const oppGKKey  = statGkKey("opponent", actors);
    const ugk = get(userGKKey);
    const ogk = get(oppGKKey);
    ugk.cleanSheetBonusEligible = 1;
    ogk.cleanSheetBonusEligible = 1;
    next[userGKKey] = ugk;
    next[oppGKKey]  = ogk;

    const userPos = actors.userPlayer.position.toLowerCase();
    const oppPos  = actors.opponentPlayer.position.toLowerCase();
    if (["cb", "lb", "rb"].includes(userPos)) {
      const st = get(`user:${actors.userPlayer.id}`);
      st.cleanSheetBonusEligible = 1;
      next[`user:${actors.userPlayer.id}`] = st;
    }
    if (["cb", "lb", "rb"].includes(oppPos)) {
      const st = get(`opponent:${actors.opponentPlayer.id}`);
      st.cleanSheetBonusEligible = 1;
      next[`opponent:${actors.opponentPlayer.id}`] = st;
    }
  }

  // ── 1. Goals, assists & GK/defense conceded tracking ──────────────────────
  if (goalDetails) {
    const scorerKey = `${goalDetails.scorerSide}:${goalDetails.scorerId}`;
    const sc = get(scorerKey);
    sc.goals += 1;
    next[scorerKey] = sc;

    if (goalDetails.assistPlayerId !== null) {
      const assistKey = `${goalDetails.scorerSide}:${goalDetails.assistPlayerId}`;
      const as = get(assistKey);
      as.assists += 1;
      next[assistKey] = as;
    }

    const concedingSide: PossessionSide =
      goalDetails.scorerSide === "user" ? "opponent" : "user";
    const gkk   = statGkKey(concedingSide, actors);
    const gkSt  = get(gkk);
    gkSt.goalsConceded += 1;
    if (action === "long_shot") {
      gkSt.weakGoalsConceded += 1;
    }
    next[gkk] = gkSt;

    for (const key of Object.keys(next)) {
      if (!key.startsWith(`${concedingSide}:`)) continue;
      const st = get(key);
      st.teamGoalsConceded = (st.teamGoalsConceded ?? 0) + 1;
      if (key !== gkk && st.cleanSheetBonusEligible > 0) {
        st.concededByDefense += 1;
      }
      next[key] = st;
    }

    for (const key of Object.keys(next)) {
      if (!key.startsWith(`${goalDetails.scorerSide}:`)) continue;
      const st = get(key);
      st.teamGoalsScored = (st.teamGoalsScored ?? 0) + 1;
      next[key] = st;
    }
  }

  // ── 2. Shots on target & GK saves ─────────────────────────────────────────
  if (shotResult.happened && shotResult.outcome === "save") {
    const atk = get(atkKey);
    atk.shotsOnTarget += 1;
    next[atkKey] = atk;

    const gkk  = statGkKey(defSide, actors);
    const gkSt = get(gkk);
    gkSt.saves += 1;
    if (outcome === "success_high") {
      gkSt.highSaves += 1;
    }
    if (setPieceType === "penalty") {
      gkSt.penaltySaves += 1;
    }
    next[gkk] = gkSt;
  }

  if (action === "long_shot" || action === "finish" || action === "header") {
    const atk = get(atkKey);
    const isRealBigChance = transition?.createdBigChance ?? isBigChance;
    atk.shotAttempts += 1;

    if (shotResult.happened && (shotResult.outcome === "miss" || shotResult.outcome === "post")) {
      atk.shotsMissed += 1;
      if (isRealBigChance) atk.bigChanceMisses += 1;
    }

    if (shotResult.happened && shotResult.outcome === "blocked") {
      atk.shotsBlocked += 1;
      if (isRealBigChance) atk.bigChanceMisses += 1;
    }

    next[atkKey] = atk;
  }

  if (setPieceType === "penalty" && shotResult.happened && shotResult.outcome !== "goal") {
    const atk = get(atkKey);
    atk.penaltyMisses += 1;
    next[atkKey] = atk;
  }

  // ── 3. Open-play outcome tracking ─────────────────────────────────────────
  if (outcome !== null) {

    // 3a. Volume action counters
    {
      const atk = get(atkKey);
      if (isSuccess) {
        atk.successfulActions += 1;
      } else if (outcome === "fail_high") {
        atk.failedHighActions += 1;
      } else {
        atk.failedActions += 1;
      }
      next[atkKey] = atk;
    }

    // 3b. Duel result
    const isDefensiveAction =
      action === "intercept" ||
      action === "tackle" ||
      action === "slide_tackle" ||
      action === "block" ||
      action === "shoulder_charge" ||
      action === "emergency_clearance" ||
      action === "clearance" ||
      action === "gk_clearance";

    if (!isDefensiveAction) {
      if (isSuccess) {
        const atk = get(atkKey);
        const def = get(defKey);
        atk.duelWins   += 1;
        def.duelLosses += 1;
        next[atkKey] = atk;
        next[defKey] = def;
      }

      if (isFail) {
        const atk = get(atkKey);
        const def = get(defKey);
        atk.duelLosses += 1;
        def.duelWins   += 1;
        next[atkKey] = atk;
        next[defKey] = def;
      }
    }

    // 3c. Offensive skill actions
    if (action === "dribble") {
      const atk = get(atkKey);
      if (isSuccess) atk.successfulDribbles += 1;
      if (isFail)    atk.failedDribbles     += 1;
      next[atkKey] = atk;
    }

    if (action === "cross" && isSuccess) {
      const atk = get(atkKey);
      atk.crosses += 1;
      next[atkKey] = atk;
    }

    if (
      isSuccess &&
      (action === "side_pass" || action === "forward_pass" || action === "long_pass")
    ) {
      const atk = get(atkKey);
      atk.successfulPasses = (atk.successfulPasses ?? 0) + 1;
      next[atkKey] = atk;
    }

    if (
      isSuccess &&
      transition?.createdBigChance &&
      (action === "forward_pass" || action === "long_pass" || action === "side_pass")
    ) {
      const atk = get(atkKey);
      atk.keyPasses += 1;
      next[atkKey] = atk;
    }

    if (isSuccess && transition?.createdBigChance) {
      const atk = get(atkKey);
      atk.bigChancesCreated += 1;
      next[atkKey] = atk;
    }

    if (
      isFail &&
      transition !== null &&
      transition.toPossession !== possession &&
      (action === "dribble" ||
        action === "sprint" ||
        action === "shield" ||
        action === "forward_pass" ||
        action === "long_pass" ||
        action === "side_pass" ||
        action === "cross")
    ) {
      const atk = get(atkKey);
      atk.lostPossessions += 1;
      next[atkKey] = atk;
    }

    // 3d. Defensive skill actions
    if (
      isSuccess &&
      (action === "intercept" ||
        action === "tackle" ||
        action === "slide_tackle" ||
        action === "block" ||
        action === "shoulder_charge" ||
        action === "emergency_clearance" ||
        action === "clearance" ||
        action === "gk_clearance")
    ) {
      const def = get(atkKey);
      def.defensiveActions += 1;
      if (action === "tackle" || action === "slide_tackle") def.tacklesWon    += 1;
      if (action === "intercept")                           def.interceptions += 1;
      if (action === "block")                               def.blocks        += 1;
      if (
        action === "clearance" ||
        action === "emergency_clearance" ||
        action === "gk_clearance"
      ) {
        def.clearances += 1;
      }
      next[atkKey] = def;
    }
  }

  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

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
    return { user: score.user + 1, opponent: score.opponent };
  }

  return { user: score.user, opponent: score.opponent + 1 };
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

function getLastTouchPlayerAndSide(
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

  if (shotResult.happened || transition.nextSituationType === "set_piece") {
    return { playerId: null, side: null };
  }

  if (!shouldTrackLastTouchFromOpenPlay(context.action)) {
    return { playerId: previousPlayerId, side: previousSide };
  }

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