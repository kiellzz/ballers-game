import { useCallback, useMemo, useState } from "react";

import type { OpponentTeam } from "../../opponents/opponents";
import type { Player } from "../../types/PlayerTypes";
import { FORMATIONS } from "../../utils/formations";
import {
  createInitialMatchState,
  runMatchStep,
  runInteractiveSetPieceStep,
} from "../matchEngine";
import type { InteractiveSetPieceResolutionInput } from "../interactive/interactiveSetPieceFlow";
import type {
  ActionType,
  EventOutcome,
  Lane,
  MatchPlayer,
  MatchState,
  MatchTeam,
  PossessionSide,
  ShotOutcome,
  Zone,
} from "../matchTypes";

interface SavedSquad {
  pitch: (Player | null)[];
  bench: (Player | null)[];
  formation: string;
}

export interface MatchHistoryEntry {
  /** Same as engine `MatchEvent.turn` — one log row per turn. */
  turn: number;
  id: string;
  minute: number;
  actionType: ActionType;
  outcome: EventOutcome;
  narration: string;
  attackerName?: string;
  defenderName?: string;
  goalkeeperName?: string;
  duelType?: string | null;
  isGoal: boolean;
  shotOutcome: ShotOutcome | null;
  scoredBy: PossessionSide | null;
  scorerName: string | null;
  scorerSide: PossessionSide | null;
  assisterName: string | null;
  /** Mirrors `MatchEvent.isPenaltyGoal` when present. */
  isPenaltyGoal?: boolean;
  setPieceType: string | null;
  // The zone and lane WHERE the shot originated — always the pre-transition
  // position. Goal animation in Match.tsx reads these instead of matchState
  // so the ball always starts from the correct shot position, regardless of
  // when React flushes the next state update.
  fromZone: Zone;
  fromLane: Lane;
}

export interface UseMatchEngineParams {
  userSquad: SavedSquad;
  opponent: OpponentTeam;
}

function clampStat(value: number | undefined, fallback = 50): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(99, value));
}

function isGoalkeeper(player: Player): boolean {
  return player.position === "GK";
}

function toMatchPlayer(player: Player, lineupPosition?: string): MatchPlayer {
  const rawStats = (player.stats ?? {}) as unknown as Record<
    string,
    number | undefined
  >;

  const overall = clampStat(player.overall, 60);
  const height = clampStat((player as unknown as { height?: number }).height, 180);

  if (isGoalkeeper(player)) {
    return {
      id: Number(player.id),
      name: player.name,
      role: "goalkeeper",
      position: player.position,
      lineupPosition,
      secondaryPositions: player.secondaryPositions ?? [],
      nationality: player.nationality ?? "Unknown",
      overall,
      height,
      stats: {
        diving: clampStat(rawStats.diving, overall),
        reflexes: clampStat(rawStats.reflexes, overall),
        speed: clampStat(rawStats.speed, 45),
        handling: clampStat(rawStats.handling, overall),
        kicking: clampStat(rawStats.kicking, 60),
        positioning: clampStat(rawStats.positioning, overall),
      },
    };
  }

  return {
    id: Number(player.id),
    name: player.name,
    role: "outfield",
    position: player.position,
    lineupPosition,
    secondaryPositions: player.secondaryPositions ?? [],
    nationality: player.nationality ?? "Unknown",
    overall,
    height,
    stats: {
      pace: clampStat(rawStats.pace, overall),
      shooting: clampStat(rawStats.shooting, overall),
      passing: clampStat(rawStats.passing, overall),
      dribbling: clampStat(rawStats.dribbling, overall),
      defending: clampStat(rawStats.defending, overall),
      physical: clampStat(rawStats.physical, overall),
    },
  };
}

function buildUserMatchTeam(userSquad: SavedSquad): MatchTeam {
  const formation = FORMATIONS[userSquad.formation as keyof typeof FORMATIONS];
  const starters = userSquad.pitch.flatMap((player: Player | null, index) => {
    if (!player) {
      return [];
    }

    return [toMatchPlayer(player, formation?.positions[index] ?? player.position)];
  });

  return {
    teamId: "user",
    teamName: "Your Team",
    starters,
  };
}

function buildOpponentMatchTeam(opponent: OpponentTeam): MatchTeam {
  const formation = FORMATIONS[opponent.formation];
  const starters = opponent.players.map((player: Player, index) =>
    toMatchPlayer(player, formation?.positions[index] ?? player.position)
  );

  return {
    teamId: opponent.id,
    teamName: opponent.name,
    starters,
  };
}

function buildEventNarration(state: MatchState): string {
  return state.lastEvent?.narration ?? "Play without description.";
}

function buildHistoryEntry(
  state: MatchState,
  index: number
): MatchHistoryEntry | null {
  const event = state.lastEvent;

  if (!event) {
    return null;
  }

  const possessionBefore = event.transition.fromPossession;
  const eventActors = event.actors;

  const attackerName =
    possessionBefore === "user"
      ? eventActors.userPlayer.name
      : eventActors.opponentPlayer.name;

  const defenderName =
    possessionBefore === "user"
      ? eventActors.opponentPlayer.name
      : eventActors.userPlayer.name;

  const goalkeeperName =
    possessionBefore === "user"
      ? eventActors.opponentGoalkeeper.name
      : eventActors.userGoalkeeper.name;

  const shotHappened = event.shotResult.happened === true;
  const shotOutcome = shotHappened ? event.shotResult.outcome : null;
  const isGoal = shotHappened && event.shotResult.outcome === "goal";

  let scoredBy: PossessionSide | null = null;
  let scorerName: string | null = null;
  let scorerSide: PossessionSide | null = null;
  let assisterName: string | null = null;

  if (isGoal) {
    scoredBy = event.shotResult.scoredBy ?? possessionBefore;
    scorerSide = scoredBy;

    // 🧠 Fonte de verdade: goalDetails
    if (event.goalDetails) {
      const scoringTeam =
        event.goalDetails.scorerSide === "user"
          ? state.userTeam
          : state.opponentTeam;

      const scorerPlayer = scoringTeam.starters.find(
        (p) => p.id === event.goalDetails!.scorerId
      );

      scorerName = scorerPlayer?.name ?? "Unknown";

      // Assist
      if (event.goalDetails.assistPlayerId != null) {
        const assistPlayer = scoringTeam.starters.find(
          (p) => p.id === event.goalDetails!.assistPlayerId
        );

        assisterName = assistPlayer?.name ?? null;
      }
    } else {
      // 🛟 fallback (caso raro)
      scorerName = attackerName;
    }
  }

  const fromZone = event.transition.fromZone;
  const fromLane = event.transition.fromLane;

  return {
    turn: event.turn,
    id: `${event.turn}-${index}-${event.action}`,
    minute: state.context.clock.minute,
    actionType: event.action,
    outcome: event.outcome,
    narration: buildEventNarration(state),
    attackerName,
    defenderName,
    goalkeeperName,
    duelType: null,
    isGoal,
    shotOutcome,
    scoredBy,
    scorerName,
    scorerSide,
    assisterName,
    isPenaltyGoal: event.isPenaltyGoal,
    setPieceType:
      event.transition.nextSetPieceType ??
      event.shotResult.setPieceAwarded ??
      event.foulResult.setPieceAwarded ??
      null,
    fromZone,
    fromLane,
  };
}

function appendHistoryEntryIfNew(params: {
  previousState: MatchState;
  nextState: MatchState;
  previousHistory: MatchHistoryEntry[];
}): MatchHistoryEntry[] {
  const { previousState, nextState, previousHistory } = params;

  if (!nextState.lastEvent || nextState.lastEvent === previousState.lastEvent) {
    return previousHistory;
  }

  const eventTurn = nextState.lastEvent.turn;
  const lastRow = previousHistory[previousHistory.length - 1];

  // Same turn as the last row: replace (engine may commit a new object for the same turn;
  // reference equality alone would append a duplicate line — common on set-piece goals.)
  if (lastRow !== undefined && lastRow.turn === eventTurn) {
    const entry = buildHistoryEntry(nextState, previousHistory.length - 1);
    return entry ? [...previousHistory.slice(0, -1), entry] : previousHistory;
  }

  const entry = buildHistoryEntry(nextState, previousHistory.length);
  return entry ? [...previousHistory, entry] : previousHistory;
}

export function useMatchEngine({ userSquad, opponent }: UseMatchEngineParams) {
  const teams = useMemo(() => {
    return {
      userTeam: buildUserMatchTeam(userSquad),
      opponentTeam: buildOpponentMatchTeam(opponent),
    };
  }, [userSquad, opponent]);

  const [matchState, setMatchState] = useState<MatchState>(() =>
    createInitialMatchState({
      userTeam: teams.userTeam,
      opponentTeam: teams.opponentTeam,
    })
  );

  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);

  const chooseAction = useCallback(
  (action: ActionType) => {
    if (matchState.context.phase === "finished") {
      return;
    }

    const nextState = runMatchStep({
      state: matchState,
      action,
    });

    const nextHistory = appendHistoryEntryIfNew({
      previousState: matchState,
      nextState,
      previousHistory: history,
    });

    setMatchState(nextState);
    setHistory(nextHistory);
  },
  [matchState, history]
);

  const continueInteractiveSetPiece = useCallback(() => {
    setMatchState((prev: MatchState) => {
      const nextState = runInteractiveSetPieceStep({
        state: prev,
      });

      setHistory((prevHistory) => {
        return appendHistoryEntryIfNew({
          previousState: prev,
          nextState,
          previousHistory: prevHistory,
        });
      });

      return nextState;
    });
  }, []);

  const resolveInteractiveSetPieceChoice = useCallback(
    (input: InteractiveSetPieceResolutionInput) => {
      setMatchState((prev: MatchState) => {
        const nextState = runInteractiveSetPieceStep({
          state: prev,
          input,
        });

        setHistory((prevHistory) => {
          return appendHistoryEntryIfNew({
            previousState: prev,
            nextState,
            previousHistory: prevHistory,
          });
        });

        return nextState;
      });
    },
    []
  );

  const resetMatch = useCallback(() => {
    setMatchState(
      createInitialMatchState({
        userTeam: teams.userTeam,
        opponentTeam: teams.opponentTeam,
      })
    );

    setHistory([]);
  }, [teams]);

  const playUntilEnd = useCallback(() => {
    setMatchState((prev: MatchState) => {
      if (prev.context.phase === "finished") {
        return prev;
      }

      let current = prev;
      const nextEntries: MatchHistoryEntry[] = [];

      while (current.context.phase !== "finished") {
        if (current.interactiveSetPiece) {
          break;
        }

        const actions = current.currentSituation.availableActions;

        if (actions.length === 0) {
          break;
        }

        const randomIndex = Math.floor(Math.random() * actions.length);
        const chosenAction = actions[randomIndex];

        current = runMatchStep({
          state: current,
          action: chosenAction,
        });

        const entry = buildHistoryEntry(current, nextEntries.length);

        if (entry) {
          nextEntries.push(entry);
        }
      }

      if (nextEntries.length > 0) {
        setHistory((prevHistory) => [...prevHistory, ...nextEntries]);
      }

      return current;
    });
  }, []);

  const interactiveSetPiece = matchState.interactiveSetPiece;

  const score = useMemo(
    () => ({
      user: matchState.context.score.user,
      opponent: matchState.context.score.opponent,
    }),
    [matchState.context.score.opponent, matchState.context.score.user]
  );

  const latestEntry = history.length > 0 ? history[history.length - 1] : null;
  const latestNarration = latestEntry?.narration ?? null;

  const currentActors = useMemo(() => {
    const actors =
      matchState.interactiveSetPiece?.actors ?? matchState.currentSituation.actors;

    const possession =
      matchState.interactiveSetPiece?.context?.possession ??
      matchState.currentSituation.possession;

    const isUserAttacking = possession === "user";

    return {
      attackerName: isUserAttacking
        ? actors.userPlayer.name
        : actors.opponentPlayer.name,
      defenderName: isUserAttacking
        ? actors.opponentPlayer.name
        : actors.userPlayer.name,
      goalkeeperName: isUserAttacking
        ? actors.opponentGoalkeeper.name
        : actors.userGoalkeeper.name,
    };
  }, [matchState.interactiveSetPiece, matchState.currentSituation]);

  const nextActors = currentActors;

  const availableActions = matchState.currentSituation.availableActions;

  const compatMatchState = useMemo(
    () => ({
      ...matchState,
      minute: matchState.context.clock.minute,
      zone: matchState.currentSituation.zone,
      lane: matchState.currentSituation.lane,
      possession: matchState.currentSituation.possession,
      isFinished: matchState.context.phase === "finished",
      isInInteractiveFlow: matchState.interactiveSetPiece !== null,
      interactiveSetPiece: matchState.interactiveSetPiece,
    }),
    [matchState]
  );

  const prepareStep = useCallback(() => {}, []);

  return {
    matchState: compatMatchState,
    history,
    score,
    latestEntry,
    latestNarration,
    currentActors,
    nextActors,
    availableActions,
    interactiveSetPiece,
    prepareStep,
    chooseAction,
    continueInteractiveSetPiece,
    resolveInteractiveSetPieceChoice,
    playUntilEnd,
    resetMatch,
  };
}
