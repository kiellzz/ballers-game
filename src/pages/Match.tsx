import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EventLog, type EventLogEntry } from "../components/match/EventLog";
import GoalModal from "../match-engine/ui_ux/GoalModal";
import { MatchField } from "../components/match/MatchField";
import { MatchLineup } from "../components/match/MatchLineup";
import { MatchMap } from "../components/match/MatchMap";
import { Scoreboard } from "../components/match/Scoreboard";
import type { BallMovementType } from "../components/match/MatchBall";
import {
  useMatchEngine,
} from "../match-engine/ui_ux/useMatchEngine";
import PreInteractiveModal from "../match-engine/interactive/PreInteractiveModal";
import CornerModal from "../match-engine/interactive/user/CornerModal";
import FkModal from "../match-engine/interactive/user/FkModal";
import PenModal from "../match-engine/interactive/user/PenModal";
import OppCornerModal from "../match-engine/interactive/opponent/OppCornerModal";
import OppFkModal from "../match-engine/interactive/opponent/OppFkModal";
import OppPenModal from "../match-engine/interactive/opponent/OppPenModal";
import MatchSummaryModal from "../match-engine/ui_ux/MatchSummaryModal";
import {
  getMatchActionLabel,
  getMatchOutcomeLabel,
} from "../match-engine/ui_ux/narrator";
import {
  resolveCorner,
  type CornerChoice,
} from "../match-engine/balancing/resolveCorner";
import {
  resolveFk,
  type FreeKickDistance,
  type FreeKickPlacement,
} from "../match-engine/balancing/resolveFk";
import {
  resolvePen,
  type PenaltyChoice,
} from "../match-engine/balancing/resolvePen";
import type {
  InteractiveSetPieceResolutionInput,
  InteractiveSetPieceState,
} from "../match-engine/interactive/interactiveSetPieceFlow";
import type {
  ActionType,
  EventOutcome,
  Lane,
  MatchPlayer,
  PossessionSide,
  ShotResult,
  Zone,
} from "../match-engine/matchTypes";
import type { OpponentTeam } from "../opponents/opponents";
import type { Player } from "../types/PlayerTypes";
import { FORMATIONS } from "../utils/formations";
import { matchSound } from "../match-engine/sounds/matchSound";
import "./Match.css";

interface SavedSquad {
  pitch: (Player | null)[];
  bench: (Player | null)[];
  formation: string;
}

type MatchLocationState = {
  opponent: OpponentTeam;
  userSquad: SavedSquad;
} | null;

interface GoalVisualLock {
  active: boolean;
  scoredBy: PossessionSide | null;
  lockedZone: Zone;
  lockedLane: Lane;
}

interface MatchProps {
  isMuted: boolean;
  onMatchFinished?: () => void;
}

const GOAL_VISUAL_LOCK_DEFAULT: GoalVisualLock = {
  active: false,
  scoredBy: null,
  lockedZone: "atk_mid",
  lockedLane: "center",
};

function isSuccessfulOutcome(outcome: EventOutcome | null | undefined): boolean {
  return outcome === "success" || outcome === "success_high";
}

function getBallMovementType(params: {
  action: ActionType;
  outcome?: EventOutcome | null;
  shotOutcome?: ShotResult["outcome"] | null;
}): BallMovementType {
  const { action, outcome, shotOutcome } = params;

  if (shotOutcome === "blocked") return "blocked";
  if (shotOutcome === "post") return "post";

  if (action === "long_shot" || action === "finish" || action === "header") {
    return "shot";
  }

  const isSuccessful = isSuccessfulOutcome(outcome);

  if (!isSuccessful) {
    return "normal";
  }

  if (action === "cross") return "cross";
  if (action === "long_pass") return "long_pass";

  if (
    action === "clearance" ||
    action === "emergency_clearance" ||
    action === "gk_clearance"
  ) {
    return "clearance";
  }

  return "normal";
}

function buildCurrentPhaseText(
  isUserAttacking: boolean,
  zone: string,
  attackerName?: string | null,
  defenderName?: string | null
): string {
  const attackerText = attackerName
    ? `${attackerName} drives the attack forward.`
    : "The attack is building.";

  const duelText =
    attackerName && defenderName
      ? `${attackerName} faces ${defenderName}.`
      : attackerText;

  if (isUserAttacking) {
    switch (zone) {
      case "def_box":
      case "def_nearbox":
      case "def_third":
        return "Your team tries to build from the back.";
      case "def_mid":
      case "atk_mid":
      case "atk_third":
      case "atk_nearbox":
        return duelText;
      case "atk_box":
      case "atk_bigchance":
        return attackerName
          ? `${attackerName} arrives dangerously inside the box.`
          : "Your team arrives dangerously inside the box.";
      default:
        return attackerText;
    }
  }

  switch (zone) {
    case "atk_box":
    case "atk_nearbox":
    case "atk_third":
      return attackerName
        ? `${attackerName} is putting your defense under pressure.`
        : "The opponent is putting your defense under pressure.";
    case "atk_mid":
    case "def_mid":
      return duelText;
    case "def_third":
    case "def_nearbox":
      return attackerName
        ? `${attackerName} advances towards your box.`
        : "The opponent advances towards your box.";
    case "def_box":
    case "def_bigchance":
      return attackerName
        ? `${attackerName} is threatening inside the box.`
        : "The opponent is threatening inside the box.";
    default:
      return attackerText;
  }
}

function findPlayerByName(
  players: Player[],
  name?: string | null
): Player | null {
  if (!name) return null;
  return players.find((player) => player.name === name) ?? null;
}

function findPlayerById(
  players: Player[],
  playerId?: number | null
): Player | null {
  if (playerId == null) return null;
  return players.find((player) => Number(player.id) === playerId) ?? null;
}

function getFallbackOutfieldPlayer(
  players: Player[],
  preferredPositions: Player["position"][]
): Player | null {
  for (const position of preferredPositions) {
    const found = players.find((player) => player.position === position);
    if (found) return found;
  }

  return players.find((player) => player.position !== "GK") ?? null;
}

function findPlayerByMatchPlayer(
  players: Player[],
  matchPlayer?: MatchPlayer | null
): Player | null {
  return matchPlayer ? findPlayerByName(players, matchPlayer.name) : null;
}

function isOutfieldMatchPlayer(
  player?: MatchPlayer | null
): player is Extract<MatchPlayer, { role: "outfield" }> {
  return player != null && player.role === "outfield";
}

function isGoalkeeperMatchPlayer(
  player?: MatchPlayer | null
): player is Extract<MatchPlayer, { role: "goalkeeper" }> {
  return player != null && player.role === "goalkeeper";
}

function shouldUseGoalkeeperAsDefender(params: {
  actionType: ActionType;
  shotOutcome?: ShotResult["outcome"] | null;
}): boolean {
  const { actionType, shotOutcome } = params;

  if (actionType === "rush_save" || actionType === "wait") {
    return true;
  }

  if (shotOutcome && shotOutcome !== "blocked") {
    return true;
  }

  return (
    actionType === "long_shot" ||
    actionType === "finish" ||
    actionType === "header"
  );
}

function calculateEventMinute(turn: number): number {
  return Math.min(90, Math.floor((turn - 1) * 1.5) + 1);
}

function buildSetPieceEventLogEntry(params: {
  flow: InteractiveSetPieceState;
  resolution: InteractiveSetPieceResolutionInput | null;
  userPlayers: Player[];
  opponentPlayers: Player[];
  userAssignedPositions: Map<string, string>;
  opponentAssignedPositions: Map<string, string>;
  nextTurn: number;
  index: number;
}): EventLogEntry | null {
  const {
    flow,
    resolution,
    userPlayers,
    opponentPlayers,
    userAssignedPositions,
    opponentAssignedPositions,
    nextTurn,
    index,
  } = params;

  if (!flow.context || !flow.actors || !flow.setPieceType) {
    return null;
  }

  const isUserAttacking = flow.context.possession === "user";
  const attackerMatchPlayer = isUserAttacking
    ? flow.actors.userPlayer
    : flow.actors.opponentPlayer;
  const defenderMatchPlayer = getSetPieceDefenderMatchPlayer({
    flow,
    resolution,
  });

  const attacker = findPlayerByMatchPlayer(
    isUserAttacking ? userPlayers : opponentPlayers,
    attackerMatchPlayer
  );
  const defender = findPlayerByMatchPlayer(
    isUserAttacking ? opponentPlayers : userPlayers,
    defenderMatchPlayer
  );

  if (!attacker || !defender) {
    return null;
  }

  return {
    id: `set-piece-${nextTurn}-${index}-${flow.setPieceType}`,
    minute: calculateEventMinute(nextTurn),
    attacker,
    defender,
    attackerPosition: isUserAttacking
      ? userAssignedPositions.get(attacker.name)
      : opponentAssignedPositions.get(attacker.name),
    defenderPosition: isUserAttacking
      ? opponentAssignedPositions.get(defender.name)
      : userAssignedPositions.get(defender.name),
    action: getSetPieceActionLabel(flow, resolution),
    outcome: getSetPieceOutcomeLabel(flow, resolution),
  };
}

function getSetPieceDefenderMatchPlayer(params: {
  flow: InteractiveSetPieceState;
  resolution: InteractiveSetPieceResolutionInput | null;
}): MatchPlayer | null {
  const { flow, resolution } = params;

  if (!flow.actors || !flow.context) {
    return null;
  }

  const isUserAttacking = flow.context.possession === "user";
  const primaryDefender = isUserAttacking
    ? flow.actors.opponentPlayer
    : flow.actors.userPlayer;
  const goalkeeper = isUserAttacking
    ? flow.actors.opponentGoalkeeper
    : flow.actors.userGoalkeeper;

  if (flow.isQuickFlow) {
    return primaryDefender;
  }

  if (flow.setPieceType === "penalty") {
    return goalkeeper;
  }

  if (flow.setPieceType === "freekick") {
    if (resolution?.setPieceType === "freekick") {
      return resolution.resolution.result === "blocked_wall"
        ? primaryDefender
        : goalkeeper;
    }

    return goalkeeper;
  }

  if (resolution?.setPieceType === "corner") {
    switch (resolution.resolution.result) {
      case "cross_claimed":
      case "goal":
      case "miss":
        return goalkeeper;
      default:
        return primaryDefender;
    }
  }

  return primaryDefender;
}

function getSetPieceActionLabel(
  flow: InteractiveSetPieceState,
  resolution: InteractiveSetPieceResolutionInput | null
): string {
  if (flow.isQuickFlow) {
    return "Quick free kick";
  }

  if (flow.setPieceType === "penalty") {
    return "Penalty";
  }

  if (flow.setPieceType === "freekick") {
    return "Free kick";
  }

  if (resolution?.setPieceType === "corner") {
    switch (resolution.resolution.choice) {
      case "short":
        return "Short corner";
      case "cross":
        return "Corner cross";
      case "olympic":
        return "Olympic corner";
      default:
        return "Corner";
    }
  }

  return "Corner";
}

function getSetPieceOutcomeLabel(
  flow: InteractiveSetPieceState,
  resolution: InteractiveSetPieceResolutionInput | null
): string {
  if (flow.isQuickFlow) {
    return "Play continues";
  }

  if (!resolution) {
    return "Resolved";
  }

  switch (resolution.setPieceType) {
    case "penalty":
      switch (resolution.resolution.result) {
        case "goal":
          return "Goal";
        case "save_clean":
        case "save_touch":
          return "Saved";
        default:
          return "Resolved";
      }

    case "freekick":
      switch (resolution.resolution.result) {
        case "goal":
          return "Goal";
        case "save_clean":
        case "save_touch":
          return "Saved";
        case "blocked_wall":
          return "Blocked";
        case "miss":
          return "Missed";
        default:
          return "Resolved";
      }

    case "corner":
      switch (resolution.resolution.result) {
        case "short_kept":
          return "Kept possession";
        case "cross_claimed":
          return "Claimed";
        case "cross_cleared":
          return "Cleared";
        case "cross_box":
          return "Into the box";
        case "cross_bigchance":
          return "Big chance";
        case "goal":
          return "Goal";
        case "miss":
          return "Missed";
        default:
          return "Resolved";
      }

    default:
      return "Resolved";
  }
}

export default function Match({ isMuted, onMatchFinished }: MatchProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const routeState = location.state as MatchLocationState;

  useEffect(() => {
    if (!routeState?.opponent || !routeState?.userSquad) {
      navigate("/PreMatch");
    }
  }, [navigate, routeState]);

  const userSquad = routeState?.userSquad ?? null;
  const opponent = routeState?.opponent ?? null;

  const userPlayers = useMemo(
    () => userSquad?.pitch.filter((p): p is Player => p !== null) ?? [],
    [userSquad]
  );

  const opponentPlayers = useMemo(() => opponent?.players ?? [], [opponent]);

  const userGK = useMemo(
    () => userPlayers.find((player) => player.position === "GK") ?? null,
    [userPlayers]
  );

  const opponentGK = useMemo(
    () => opponentPlayers.find((player) => player.position === "GK") ?? null,
    [opponentPlayers]
  );

  const {
    matchState,
    history,
    latestEntry,
    score,
    currentActors,
    availableActions,
    chooseAction,
    interactiveSetPiece,
    continueInteractiveSetPiece,
    resolveInteractiveSetPieceChoice,
  } = useMatchEngine({
    userSquad: userSquad ?? { pitch: [], bench: [], formation: "4-3-3" },
    opponent: opponent ?? {
      id: "fallback",
      name: "Opponent",
      formation: "4-3-3",
      players: [],
    },
  });

  const latestGoal = matchState.lastGoal ?? null;

  useEffect(() => {
    if (!latestEntry) return;
  }, [latestEntry]);

  useEffect(() => {
    matchSound.startMatch();
  }, []);

  useEffect(() => {
    matchSound.setMusicEnabled(!isMuted);
  }, [isMuted]);

  const [pendingSetPieceResolution, setPendingSetPieceResolution] =
    useState<InteractiveSetPieceResolutionInput | null>(null);

  const [goalVisualLock, setGoalVisualLock] = useState<GoalVisualLock>(
    GOAL_VISUAL_LOCK_DEFAULT
  );

  const [goalModalState, setGoalModalState] = useState<{
    isOpen: boolean;
    scorer: Player | null;
    assistPlayer: Player | null;
    scorerSide: PossessionSide | null;
  }>({
    isOpen: false,
    scorer: null,
    assistPlayer: null,
    scorerSide: null,
  });

  const [showSummary, setShowSummary] = useState(true);

  const goalVisualTimeoutRef = useRef<number | null>(null);
  const goalModalTimeoutRef = useRef<number | null>(null);
  const summaryTimeoutRef = useRef<number | null>(null);
  const handledGoalEventIdRef = useRef<string | null>(null);
  const handledGoalModalIdRef = useRef<string | null>(null);
  const processedHistoryCountRef = useRef(0);
  const setPieceEventCountRef = useRef(0);
  const latestGoalModalIdRef = useRef<string | null>(null);
  const [eventLogEntries, setEventLogEntries] = useState<EventLogEntry[]>([]);

  useEffect(() => {
    if (interactiveSetPiece?.stage !== "modal") {
      setPendingSetPieceResolution(null);
    }
  }, [interactiveSetPiece]);

  useEffect(() => {
    return () => {
      if (goalVisualTimeoutRef.current !== null) {
        window.clearTimeout(goalVisualTimeoutRef.current);
      }

      if (goalModalTimeoutRef.current !== null) {
        window.clearTimeout(goalModalTimeoutRef.current);
      }

      if (summaryTimeoutRef.current !== null) {
        window.clearTimeout(summaryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!matchState.isFinished) return;

    summaryTimeoutRef.current = window.setTimeout(() => {
      setShowSummary(true);
    }, 2000);

    return () => {
      if (summaryTimeoutRef.current !== null) {
        window.clearTimeout(summaryTimeoutRef.current);
      }
    };
  }, [matchState.isFinished]);

  useLayoutEffect(() => {
    if (!latestGoal) {
      if (goalVisualTimeoutRef.current !== null) {
        window.clearTimeout(goalVisualTimeoutRef.current);
        goalVisualTimeoutRef.current = null;
      }

      setGoalVisualLock(GOAL_VISUAL_LOCK_DEFAULT);
      return;
    }

    if (handledGoalEventIdRef.current === latestGoal.id) {
      return;
    }

    handledGoalEventIdRef.current = latestGoal.id;

    if (goalVisualTimeoutRef.current !== null) {
      window.clearTimeout(goalVisualTimeoutRef.current);
    }

    setGoalVisualLock({
      active: true,
      scoredBy: latestGoal.scorerSide,
      lockedZone: latestGoal.fromZone,
      lockedLane: latestGoal.fromLane,
    });

    goalVisualTimeoutRef.current = window.setTimeout(() => {
      setGoalVisualLock(GOAL_VISUAL_LOCK_DEFAULT);
      goalVisualTimeoutRef.current = null;
    }, 700);
  }, [latestGoal]);

  useEffect(() => {
    if (!latestGoal) {
      latestGoalModalIdRef.current = null;

      if (goalModalTimeoutRef.current !== null) {
        window.clearTimeout(goalModalTimeoutRef.current);
        goalModalTimeoutRef.current = null;
      }

      setGoalModalState({
        isOpen: false,
        scorer: null,
        assistPlayer: null,
        scorerSide: null,
      });

      return;
    }

    const goalKey = latestGoal.id;

    if (handledGoalModalIdRef.current === goalKey) return;
    handledGoalModalIdRef.current = goalKey;
    latestGoalModalIdRef.current = goalKey;

    const scoringPlayers =
      latestGoal.scorerSide === "user" ? userPlayers : opponentPlayers;

    const scorer = findPlayerById(scoringPlayers, latestGoal.scorerId);
    const assistPlayer = findPlayerById(
      scoringPlayers,
      latestGoal.assistPlayerId
    );

    if (goalModalTimeoutRef.current !== null) {
      window.clearTimeout(goalModalTimeoutRef.current);
    }

    goalModalTimeoutRef.current = window.setTimeout(() => {
      if (latestGoalModalIdRef.current !== goalKey) return;

      setGoalModalState({
        isOpen: true,
        scorer,
        assistPlayer,
        scorerSide: latestGoal.scorerSide,
      });

      goalModalTimeoutRef.current = null;
    }, 700);
  }, [latestGoal, userPlayers, opponentPlayers]);

  if (!routeState || !userSquad || !opponent) {
    return null;
  }

  const userFormation =
    FORMATIONS[userSquad.formation as keyof typeof FORMATIONS];

  const oppPositions = opponent.players.map((player) => player.position);

  const userAssignedPositions = useMemo(() => {
    const positions = new Map<string, string>();

    userSquad.pitch.forEach((player, index) => {
      if (!player) return;

      positions.set(
        player.name,
        userFormation?.positions[index] ?? player.position
      );
    });

    return positions;
  }, [userFormation, userSquad.pitch]);

  const opponentAssignedPositions = useMemo(() => {
    const positions = new Map<string, string>();

    opponent.players.forEach((player, index) => {
      positions.set(player.name, oppPositions[index] ?? player.position);
    });

    return positions;
  }, [oppPositions, opponent.players]);

  // ── Posições dos slots para o MatchSummaryModal ───────────────────────────
  // userFormation.positions pode ter nulls (slots vazios do pitch), então
  // alinhamos com userPlayers (já filtrados) pela mesma lógica do MatchLineup.
  const userSlotPositions = useMemo(
    () =>
      userSquad.pitch.map(
        (player, idx) => userFormation?.positions[idx] ?? player?.position ?? "CM"
      ),
    [userFormation, userSquad.pitch]
  );

  const phase = matchState.isFinished ? "finished" : "playing";

  const legacyEvents = useMemo<EventLogEntry[]>(() => {
    return history.flatMap((entry) => {
      const attackerName = entry.attackerName ?? null;
      const defenderName = shouldUseGoalkeeperAsDefender({
        actionType: entry.actionType,
        shotOutcome: entry.shotOutcome,
      })
        ? entry.goalkeeperName ?? entry.defenderName ?? null
        : entry.defenderName ?? entry.goalkeeperName ?? null;

      if (!attackerName || !defenderName) {
        return [];
      }

      const userAttacker = findPlayerByName(userPlayers, attackerName);
      const opponentAttacker = findPlayerByName(opponentPlayers, attackerName);
      const userDefender = findPlayerByName(userPlayers, defenderName);
      const opponentDefender = findPlayerByName(opponentPlayers, defenderName);

      const matches: Pick<
        EventLogEntry,
        "attacker" | "defender" | "attackerPosition" | "defenderPosition"
      >[] = [];

      if (userAttacker && opponentDefender) {
        matches.push({
          attacker: userAttacker,
          defender: opponentDefender,
          attackerPosition: userAssignedPositions.get(userAttacker.name),
          defenderPosition: opponentAssignedPositions.get(opponentDefender.name),
        });
      }

      if (opponentAttacker && userDefender) {
        matches.push({
          attacker: opponentAttacker,
          defender: userDefender,
          attackerPosition: opponentAssignedPositions.get(opponentAttacker.name),
          defenderPosition: userAssignedPositions.get(userDefender.name),
        });
      }

      if (matches.length !== 1) {
        return [];
      }

      const duel = matches[0];

      return [
        {
          id: entry.id,
          minute: entry.minute,
          attacker: duel.attacker,
          defender: duel.defender,
          attackerPosition: duel.attackerPosition,
          defenderPosition: duel.defenderPosition,
          action: getMatchActionLabel(entry.actionType),
          outcome: getMatchOutcomeLabel({
            outcome: entry.outcome,
            shotOutcome: entry.shotOutcome,
          }),
        },
      ];
    });
  }, [
    history,
    opponentAssignedPositions,
    opponentPlayers,
    userAssignedPositions,
    userPlayers,
  ]);

  useEffect(() => {
    if (legacyEvents.length < processedHistoryCountRef.current) {
      processedHistoryCountRef.current = 0;
      setPieceEventCountRef.current = 0;
      setEventLogEntries([]);
    }

    const nextEntries = legacyEvents.slice(processedHistoryCountRef.current);
    processedHistoryCountRef.current = legacyEvents.length;

    if (nextEntries.length > 0) {
      setEventLogEntries((current) => [...current, ...nextEntries]);
    }
  }, [legacyEvents]);

  const events = eventLogEntries;

  const displayPossession = matchState.possession;
  const displayZone = matchState.zone;
  const isUserAttacking = displayPossession === "user";

  const attackerName = currentActors.attackerName;
  const defenderName =
    currentActors.defenderName ?? currentActors.goalkeeperName ?? null;

  const resolvedUserFrontPlayer = isUserAttacking
    ? findPlayerByName(userPlayers, attackerName)
    : findPlayerByName(userPlayers, defenderName);

  const resolvedOpponentFrontPlayer = isUserAttacking
    ? findPlayerByName(opponentPlayers, defenderName)
    : findPlayerByName(opponentPlayers, attackerName);

  const userFrontPlayer =
    resolvedUserFrontPlayer ??
    (isUserAttacking
      ? getFallbackOutfieldPlayer(userPlayers, ["ST", "CAM", "LW", "RW", "CM"])
      : getFallbackOutfieldPlayer(userPlayers, ["CB", "CDM", "LB", "RB"]));

  const opponentFrontPlayer =
    resolvedOpponentFrontPlayer ??
    (isUserAttacking
      ? getFallbackOutfieldPlayer(opponentPlayers, ["CB", "CDM", "LB", "RB"])
      : getFallbackOutfieldPlayer(opponentPlayers, [
          "ST",
          "CAM",
          "LW",
          "RW",
          "CM",
        ]));

  const fieldHeaderText = buildCurrentPhaseText(
    isUserAttacking,
    displayZone,
    attackerName,
    defenderName
  );

  const ballMovementType: BallMovementType =
    latestEntry && !latestEntry.isGoal
      ? getBallMovementType({
          action: latestEntry.actionType,
          outcome: latestEntry.outcome,
          shotOutcome: latestEntry.shotOutcome ?? null,
        })
      : "normal";

  const isPreModalOpen = interactiveSetPiece?.stage === "pre";
  const isInteractiveModalOpen = interactiveSetPiece?.stage === "modal";
  const preType = interactiveSetPiece?.preType ?? "freekick";
  const interactiveActors = interactiveSetPiece?.actors ?? null;

  const modalUserPlayer = findPlayerByMatchPlayer(
    userPlayers,
    interactiveActors?.userPlayer
  );

  const modalOpponentPlayer = findPlayerByMatchPlayer(
    opponentPlayers,
    interactiveActors?.opponentPlayer
  );

  const modalUserGoalkeeper = findPlayerByMatchPlayer(
    userPlayers,
    interactiveActors?.userGoalkeeper
  );

  const modalOpponentGoalkeeper = findPlayerByMatchPlayer(
    opponentPlayers,
    interactiveActors?.opponentGoalkeeper
  );

  const modalSupportUserPlayer = findPlayerByMatchPlayer(
    userPlayers,
    interactiveActors?.supportUserPlayer
  );

  const modalSupportOpponentPlayer = findPlayerByMatchPlayer(
    opponentPlayers,
    interactiveActors?.supportOpponentPlayer
  );

  const prePlayer =
    interactiveSetPiece?.side === "opponent"
      ? modalOpponentPlayer
      : modalUserPlayer;

  const penaltyResolution =
    pendingSetPieceResolution?.setPieceType === "penalty"
      ? pendingSetPieceResolution.resolution
      : null;

  const freekickResolution =
    pendingSetPieceResolution?.setPieceType === "freekick"
      ? pendingSetPieceResolution.resolution
      : null;

  const cornerResolution =
    pendingSetPieceResolution?.setPieceType === "corner"
      ? pendingSetPieceResolution.resolution
      : null;

  function appendSetPieceEventToLog(
    flow: InteractiveSetPieceState,
    resolution: InteractiveSetPieceResolutionInput | null
  ) {
    const nextIndex = setPieceEventCountRef.current + 1;
    const entry = buildSetPieceEventLogEntry({
      flow,
      resolution,
      userPlayers,
      opponentPlayers,
      userAssignedPositions,
      opponentAssignedPositions,
      nextTurn: matchState.context.turn + 1,
      index: nextIndex,
    });

    if (!entry) {
      return;
    }

    setPieceEventCountRef.current = nextIndex;
    setEventLogEntries((current) => [...current, entry]);
  }

  function handleContinueInteractiveSetPiece() {
    if (interactiveSetPiece?.stage === "pre" && interactiveSetPiece.isQuickFlow) {
      appendSetPieceEventToLog(interactiveSetPiece, null);
    }

    continueInteractiveSetPiece();
  }

  function handleInteractiveResolutionContinue() {
    if (!pendingSetPieceResolution || !interactiveSetPiece) return;

    appendSetPieceEventToLog(interactiveSetPiece, pendingSetPieceResolution);
    resolveInteractiveSetPieceChoice(pendingSetPieceResolution);
  }

  function handleUserPenaltyPick(choice: PenaltyChoice) {
    if (
      interactiveSetPiece?.stage !== "modal" ||
      interactiveSetPiece.side !== "user" ||
      interactiveSetPiece.modalType !== "penalty" ||
      !interactiveActors ||
      !isOutfieldMatchPlayer(interactiveActors.userPlayer) ||
      !isGoalkeeperMatchPlayer(interactiveActors.opponentGoalkeeper)
    ) {
      return;
    }

    setPendingSetPieceResolution({
      setPieceType: "penalty",
      resolution: resolvePen({
        shooterChoice: choice,
        taker: {
          finishing: interactiveActors.userPlayer.stats.shooting,
          overall: interactiveActors.userPlayer.overall,
        },
        goalkeeper: {
          reflexes: interactiveActors.opponentGoalkeeper.stats.reflexes,
          diving: interactiveActors.opponentGoalkeeper.stats.diving,
        },
      }),
    });
  }

  function handleOpponentPenaltyPick(
    shooterChoice: PenaltyChoice,
    keeperChoice: PenaltyChoice
  ) {
    if (
      interactiveSetPiece?.stage !== "modal" ||
      interactiveSetPiece.side !== "opponent" ||
      interactiveSetPiece.modalType !== "penalty" ||
      !interactiveActors ||
      !isOutfieldMatchPlayer(interactiveActors.opponentPlayer) ||
      !isGoalkeeperMatchPlayer(interactiveActors.userGoalkeeper)
    ) {
      return;
    }

    setPendingSetPieceResolution({
      setPieceType: "penalty",
      resolution: resolvePen({
        shooterChoice,
        keeperChoice,
        taker: {
          finishing: interactiveActors.opponentPlayer.stats.shooting,
          overall: interactiveActors.opponentPlayer.overall,
        },
        goalkeeper: {
          reflexes: interactiveActors.userGoalkeeper.stats.reflexes,
          diving: interactiveActors.userGoalkeeper.stats.diving,
        },
      }),
    });
  }

  function handleUserFreekickPick(
    placement: FreeKickPlacement,
    distance: FreeKickDistance
  ) {
    if (
      interactiveSetPiece?.stage !== "modal" ||
      interactiveSetPiece.side !== "user" ||
      interactiveSetPiece.modalType !== "freekick" ||
      !interactiveActors ||
      !isOutfieldMatchPlayer(interactiveActors.userPlayer) ||
      !isGoalkeeperMatchPlayer(interactiveActors.opponentGoalkeeper)
    ) {
      return;
    }

    setPendingSetPieceResolution({
      setPieceType: "freekick",
      resolution: resolveFk({
        placement,
        distance,
        taker: {
          shooting: interactiveActors.userPlayer.stats.shooting,
          passing: interactiveActors.userPlayer.stats.passing,
          overall: interactiveActors.userPlayer.overall,
        },
        goalkeeper: {
          reflexes: interactiveActors.opponentGoalkeeper.stats.reflexes,
          diving: interactiveActors.opponentGoalkeeper.stats.diving,
        },
      }),
    });
  }

  function handleOpponentFreekickPick(
    placement: FreeKickPlacement,
    distance: FreeKickDistance
  ) {
    if (
      interactiveSetPiece?.stage !== "modal" ||
      interactiveSetPiece.side !== "opponent" ||
      interactiveSetPiece.modalType !== "freekick" ||
      !interactiveActors ||
      !isOutfieldMatchPlayer(interactiveActors.opponentPlayer) ||
      !isGoalkeeperMatchPlayer(interactiveActors.userGoalkeeper)
    ) {
      return;
    }

    setPendingSetPieceResolution({
      setPieceType: "freekick",
      resolution: resolveFk({
        placement,
        distance,
        taker: {
          shooting: interactiveActors.opponentPlayer.stats.shooting,
          passing: interactiveActors.opponentPlayer.stats.passing,
          overall: interactiveActors.opponentPlayer.overall,
        },
        goalkeeper: {
          reflexes: interactiveActors.userGoalkeeper.stats.reflexes,
          diving: interactiveActors.userGoalkeeper.stats.diving,
        },
      }),
    });
  }

  function handleUserCornerPick(choice: CornerChoice) {
    if (
      interactiveSetPiece?.stage !== "modal" ||
      interactiveSetPiece.side !== "user" ||
      interactiveSetPiece.modalType !== "corner" ||
      !interactiveActors ||
      !isOutfieldMatchPlayer(interactiveActors.userPlayer) ||
      !isGoalkeeperMatchPlayer(interactiveActors.opponentGoalkeeper)
    ) {
      return;
    }

    setPendingSetPieceResolution({
      setPieceType: "corner",
      resolution: resolveCorner({
        choice,
        taker: {
          passing: interactiveActors.userPlayer.stats.passing,
          shooting: interactiveActors.userPlayer.stats.shooting,
          overall: interactiveActors.userPlayer.overall,
        },
        goalkeeper: {
          handling: interactiveActors.opponentGoalkeeper.stats.handling,
          positioning: interactiveActors.opponentGoalkeeper.stats.positioning,
          diving: interactiveActors.opponentGoalkeeper.stats.diving,
        },
      }),
    });
  }

  function handleOpponentCornerPlay(choice: CornerChoice) {
    if (
      interactiveSetPiece?.stage !== "modal" ||
      interactiveSetPiece.side !== "opponent" ||
      interactiveSetPiece.modalType !== "corner" ||
      !interactiveActors ||
      !isOutfieldMatchPlayer(interactiveActors.opponentPlayer) ||
      !isGoalkeeperMatchPlayer(interactiveActors.userGoalkeeper)
    ) {
      return;
    }

    setPendingSetPieceResolution({
      setPieceType: "corner",
      resolution: resolveCorner({
        choice,
        taker: {
          passing: interactiveActors.opponentPlayer.stats.passing,
          shooting: interactiveActors.opponentPlayer.stats.shooting,
          overall: interactiveActors.opponentPlayer.overall,
        },
        goalkeeper: {
          handling: interactiveActors.userGoalkeeper.stats.handling,
          positioning: interactiveActors.userGoalkeeper.stats.positioning,
          diving: interactiveActors.userGoalkeeper.stats.diving,
        },
      }),
    });
  }

  const mapZone = goalVisualLock.active
    ? goalVisualLock.lockedZone
    : matchState.zone;
  const mapLane = goalVisualLock.active
    ? goalVisualLock.lockedLane
    : matchState.lane;

  return (
    <div className="match-screen">
      <MatchLineup
        title="Your lineup"
        players={userSquad.pitch}
        positions={userFormation.positions}
        playerMatchStats={matchState.playerMatchStats}
      />

      <main className="match-main-content">
        {matchState.isFinished && !showSummary && (
          <button
            type="button"
            className="match-summary-toggle"
            onClick={() => setShowSummary(true)}
          >
            Return to Match Summary
          </button>
        )}

        <MatchMap
          zone={mapZone}
          lane={mapLane}
          possession={matchState.possession}
          movementType={ballMovementType}
          isGoalAnimation={goalVisualLock.active}
          scoredBy={goalVisualLock.scoredBy}
        />

        <Scoreboard
          homeScore={score.user}
          awayScore={score.opponent}
          gameTime={phase === "finished" ? "FT" : `${matchState.minute}'`}
        />

        <MatchField
          situation={fieldHeaderText}
          userPlayer={userFrontPlayer}
          opponentPlayer={opponentFrontPlayer}
          userGK={userGK}
          opponentGK={opponentGK}
          options={interactiveSetPiece ? [] : availableActions}
          onAction={chooseAction}
          phase={phase}
          isUserAttacking={isUserAttacking}
          zone={displayZone}
        />

        <EventLog events={events} />
      </main>

      <MatchLineup
        title="Opp. Lineup"
        players={opponent.players}
        positions={oppPositions}
        isOpponent={true}
        playerMatchStats={matchState.playerMatchStats}
      />

      <PreInteractiveModal
        isOpen={isPreModalOpen}
        type={preType}
        player={prePlayer ?? undefined}
        side={interactiveSetPiece?.side ?? "user"}
        onContinue={handleContinueInteractiveSetPiece}
      />

      {isInteractiveModalOpen &&
        interactiveSetPiece?.side === "user" &&
        interactiveSetPiece.modalType === "corner" && (
          <CornerModal
            isOpen={true}
            shooter={modalUserPlayer ?? undefined}
            goalkeeper={modalOpponentGoalkeeper ?? undefined}
            shortReceiver={modalSupportUserPlayer ?? undefined}
            resolution={cornerResolution}
            onPick={handleUserCornerPick}
            onContinue={handleInteractiveResolutionContinue}
          />
        )}

      {isInteractiveModalOpen &&
        interactiveSetPiece?.side === "user" &&
        interactiveSetPiece.modalType === "freekick" && (
          <FkModal
            isOpen={true}
            shooter={modalUserPlayer ?? undefined}
            goalkeeper={modalOpponentGoalkeeper ?? undefined}
            goalkeeperName={modalOpponentGoalkeeper?.name}
            initialDistance={interactiveSetPiece.freeKickDistance ?? undefined}
            resolution={freekickResolution}
            onPick={handleUserFreekickPick}
            onContinue={handleInteractiveResolutionContinue}
          />
        )}

      {isInteractiveModalOpen &&
        interactiveSetPiece?.side === "user" &&
        interactiveSetPiece.modalType === "penalty" && (
          <PenModal
            isOpen={true}
            shooter={modalUserPlayer ?? undefined}
            goalkeeper={modalOpponentGoalkeeper ?? undefined}
            goalkeeperName={modalOpponentGoalkeeper?.name}
            resolution={penaltyResolution}
            onPick={handleUserPenaltyPick}
            onContinue={handleInteractiveResolutionContinue}
          />
        )}

      {isInteractiveModalOpen &&
        interactiveSetPiece?.side === "opponent" &&
        interactiveSetPiece.modalType === "corner" && (
          <OppCornerModal
            isOpen={true}
            shooter={modalOpponentPlayer ?? undefined}
            goalkeeper={modalUserGoalkeeper ?? undefined}
            shortReceiver={modalSupportOpponentPlayer ?? undefined}
            resolution={cornerResolution}
            onPlay={handleOpponentCornerPlay}
            onContinue={handleInteractiveResolutionContinue}
          />
        )}

      {isInteractiveModalOpen &&
        interactiveSetPiece?.side === "opponent" &&
        interactiveSetPiece.modalType === "freekick" && (
          <OppFkModal
            isOpen={true}
            shooter={modalOpponentPlayer ?? undefined}
            goalkeeper={modalUserGoalkeeper ?? undefined}
            goalkeeperName={modalUserGoalkeeper?.name}
            initialDistance={interactiveSetPiece.freeKickDistance ?? undefined}
            resolution={freekickResolution}
            onPick={handleOpponentFreekickPick}
            onContinue={handleInteractiveResolutionContinue}
          />
        )}

      {isInteractiveModalOpen &&
        interactiveSetPiece?.side === "opponent" &&
        interactiveSetPiece.modalType === "penalty" && (
          <OppPenModal
            isOpen={true}
            shooter={modalOpponentPlayer ?? undefined}
            goalkeeper={modalUserGoalkeeper ?? undefined}
            resolution={penaltyResolution}
            onPick={handleOpponentPenaltyPick}
            onContinue={handleInteractiveResolutionContinue}
          />
        )}

      <GoalModal
        isOpen={goalModalState.isOpen}
        scorer={goalModalState.scorer}
        assistPlayer={goalModalState.assistPlayer}
        scorerSide={goalModalState.scorerSide}
        onContinue={() =>
          setGoalModalState({
            isOpen: false,
            scorer: null,
            assistPlayer: null,
            scorerSide: null,
          })
        }
      />

      <MatchSummaryModal
        isOpen={showSummary && matchState.isFinished}
        onViewDetails={() => setShowSummary(false)}
        userScore={score.user}
        opponentScore={score.opponent}
        opponentName={opponent.name}
        playerMatchStats={matchState.playerMatchStats}
        userPlayers={userPlayers}
        opponentPlayers={opponentPlayers}
        history={history}
        onOpen={() => onMatchFinished?.()}
        userPositions={userSlotPositions}
        opponentPositions={oppPositions}
      />
    </div>
  );
}
