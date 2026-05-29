import { createSituation } from "../balancing/situationMaker";
import { resolveDuel } from "../balancing/duelEngine";
import { randomizeEventOutcome } from "../balancing/eventRandomizer";
import { resolveFoul } from "../fouls/foulEngine";
import { resolveCard } from "../fouls/cardEngine";
import {
  createInitialDisciplinaryState,
  getNumericalAdvantageState,
  getSentOffPlayerIds,
} from "../fouls/disciplineState";
import { resolveEventTransition } from "../balancing/eventResolver";
import { resolveOpenPlayShot } from "../open-play/resolveOpenPlayShot";
import {
  startInteractiveSetPieceFlow,
  continueFromPreInteractive,
  resolveQuickFreeKick,
  resolveInteractiveSetPiece,
} from "../interactive/interactiveSetPieceFlow";
import type { InteractiveSetPieceResolutionInput } from "../interactive/interactiveSetPieceFlow";
import { calculateNextMinute } from "./matchClock";
import { applyEventToPlayerMatchStats } from "./playerMatchStats";
import { buildGoalDetails, createLastGoalRecord, getPossessionPlayerId } from "./goalHelpers";
import {
  applyScoreFromShot,
  createEmptyShotResult,
  getFouledPlayerId,
  getGoalkeeperBigChanceAction,
  maybeResolveLooseBallClearance,
  resolveLastTouchAfterOpenPlay,
  resolveForcedBallCarrier,
  shouldForceNewBallCarrier,
  shouldResolveOpenPlayShot,
} from "./matchStateHelpers";
import { applyFinalResolution } from "./setPieceResolver";
import { commitEvent } from "./matchEngineInternal";
import type {
  ActionType,
  DuelContext,
  FoulResult,
  MatchEvent,
  MatchState,
  MatchTeam,
  PlayerMatchStats,
  ShotResult,
} from "../matchTypes";
import { emptyStatLine } from "../matchTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialMatchState(
  params: CreateInitialMatchStateParams
): MatchState {
  const { userTeam, opponentTeam, random = Math.random } = params;
  const initialPlayerMatchStats: PlayerMatchStats = {};
  const disciplinaryState = createInitialDisciplinaryState({
    userTeam,
    opponentTeam,
  });

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
    disciplinaryState,
    lastGoal: null,
  };
}

// ─── Main step ────────────────────────────────────────────────────────────────

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
    numericalAdvantage: getNumericalAdvantageState(state.disciplinaryState),
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
    disciplinaryState: state.disciplinaryState,
    random,
  });

  foulResult = {
    ...foulResult,
    card: cardResult.card,
    playerId: cardResult.playerId,
    playerSide: cardResult.playerSide,
    sentOff: cardResult.sentOff,
    dismissalType: cardResult.dismissalType,
  };

  const nextDisciplinaryState = cardResult.disciplinaryState;
  const unavailableUserPlayerIds = getSentOffPlayerIds(
    nextDisciplinaryState,
    "user"
  );
  const unavailableOpponentPlayerIds = getSentOffPlayerIds(
    nextDisciplinaryState,
    "opponent"
  );

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
          goalkeeper:
            duelContext.possession === "user"
              ? duelContext.actors.opponentGoalkeeper
              : duelContext.actors.userGoalkeeper,
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
      foulResult,
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

  // ─── Set piece branch ──────────────────────────────────────────────────────
  if (transition.nextSituationType === "set_piece" && transition.nextSetPieceType) {
    let setPieceSituation = createSituation({
      zone: transition.toZone,
      lane: transition.toLane,
      possession: transition.toPossession,
      userTeam: state.userTeam,
      opponentTeam: state.opponentTeam,
      unavailableUserPlayerIds,
      unavailableOpponentPlayerIds,
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
        unavailableUserPlayerIds,
        unavailableOpponentPlayerIds,
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
        disciplinaryState: nextDisciplinaryState,
        lastGoal: nextLastGoal,
      },
      lastEvent
    );
  }

  // ─── Open play continuation ────────────────────────────────────────────────
  const nextScore = applyScoreFromShot(state.context.score, shotResult);
  const nextPhase = nextMinute >= 90 ? "finished" : "playing";

  const { forcedUserPlayerId, forcedOpponentPlayerId } =
    nextPhase !== "finished" && shouldForceNewBallCarrier(resolvedAction)
      ? resolveForcedBallCarrier({
          resolvedAction,
          transition,
          duelContext,
          userTeam: state.userTeam,
          opponentTeam: state.opponentTeam,
          unavailableUserPlayerIds,
          unavailableOpponentPlayerIds,
          random,
        })
      : { forcedUserPlayerId: null, forcedOpponentPlayerId: null };

  const nextSituation =
    nextPhase === "finished"
      ? state.currentSituation
      : createSituation({
          zone: transition.toZone,
          lane: transition.toLane,
          possession: transition.toPossession,
          userTeam: state.userTeam,
          opponentTeam: state.opponentTeam,
          unavailableUserPlayerIds,
          unavailableOpponentPlayerIds,
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
      disciplinaryState: nextDisciplinaryState,
      lastGoal: nextLastGoal,
    },
    lastEvent
  );
}

// ─── Interactive set piece step ───────────────────────────────────────────────

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
