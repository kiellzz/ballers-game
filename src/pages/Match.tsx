import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EventLog, type EventLogEntry } from "../components/match/EventLog";
import { buildHistoryEventLogEntries } from "../match-engine/ui_ux/eventLogEntries";
import GoalModal from "../match-engine/ui_ux/GoalModal";
import { MatchField } from "../components/match/MatchField";
import { MatchLineup } from "../components/match/MatchLineup";
import { MatchMap } from "../components/match/MatchMap";
import { Scoreboard } from "../components/match/Scoreboard";
import type { BallMovementType } from "../components/match/MatchBall";
import {
  useMatchEngine,
  type MatchHistoryEntry,
} from "../match-engine/ui_ux/useMatchEngine";
import { getCurrentPhaseText } from "../match-engine/ui_ux/narrator";
import PreInteractiveModal, {
  type PreInteractiveCardNotice,
} from "../match-engine/interactive/PreInteractiveModal";
import CornerModal from "../match-engine/interactive/user/CornerModal";
import FkModal from "../match-engine/interactive/user/FkModal";
import PenModal from "../match-engine/interactive/user/PenModal";
import OppCornerModal from "../match-engine/interactive/opponent/OppCornerModal";
import OppFkModal from "../match-engine/interactive/opponent/OppFkModal";
import OppPenModal from "../match-engine/interactive/opponent/OppPenModal";
import MatchSummaryModal, {
  buildPlayersWithRatings,
  getMatchMVP,
  getResult,
  type MatchResult,
} from "../match-engine/ui_ux/MatchSummaryModal";
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
  type ResolvePenOutput,
} from "../match-engine/balancing/resolvePen";
import type { InteractiveSetPieceResolutionInput } from "../match-engine/interactive/interactiveSetPieceFlow";
import { emptyStatLine } from "../match-engine/matchTypes";
import type {
  ActionType,
  EventOutcome,
  Lane,
  MatchPlayer,
  MatchTeam,
  PossessionSide,
  ShotResult,
  Zone,
} from "../match-engine/matchTypes";
import type { OpponentTeam } from "../opponents/opponents";
import type { Player } from "../types/PlayerTypes";
import { FORMATIONS } from "../utils/formations";
import { matchSound } from "../match-engine/sounds/matchSound";
import "./Match.css";
import { MatchMapTip } from "../components/match/MatchMapTip";
import {
  DRAFT_MATCH_RELOAD_PENDING_KEY,
  DRAFT_MATCH_RELOAD_WARNING_MESSAGE,
  loadDraftProgress,
  resetDraftProgress,
  saveDraftProgress,
} from "../features/draft/draftUtils";
import {
  resolveDraftMatch,
  type DraftMatchResolution,
  type DraftRoundIndex,
} from "../opponents/draftOpponents";
import { getSentOffPlayerIds } from "../match-engine/fouls/disciplineState";
import { pickBestPenaltyTaker } from "../match-engine/setpiece/setPieceSelector";
import {
  createPenaltyShootout,
  getCurrentPenaltyTakerCycleIds,
  getPenaltyShootoutScore,
  recordPenaltyShootoutAttempt,
  type PenaltyShootoutState,
} from "../match-engine/penaltyShootout";
import { calculatePlayerRating } from "../match-engine/playerRating";
import {
  completeDraftCampaign,
  recordDraftMatch,
} from "../features/draft/draftCampaign";

interface SavedSquad {
  pitch: (Player | null)[];
  bench: (Player | null)[];
  formation: string;
}

type MatchLocationState = {
  opponent: OpponentTeam;
  userSquad: SavedSquad;
  gameMode?: "freestyle" | "draft";
  draftRound?: DraftRoundIndex;
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
  onReturnToModeSelect?: () => void;
}

interface ShootoutKickResolution {
  side: PossessionSide;
  takerId: number;
  resolution: ResolvePenOutput;
}

interface DraftMatchFinalization {
  round: DraftRoundIndex;
  result: MatchResult;
  resolution: DraftMatchResolution;
}

interface EventLogBuildContext {
  opponentAssignedPositions: Map<string, string>;
  opponentPlayers: Player[];
  userAssignedPositions: Map<string, string>;
  userPlayers: Player[];
}

const MATCH_ACTION_COOLDOWN_MS = 300;

const historyEventLogCache = new WeakMap<
  MatchHistoryEntry,
  { context: EventLogBuildContext; entries: EventLogEntry[] }
>();

function getHistoryEventLogEntries(
  entry: MatchHistoryEntry,
  context: EventLogBuildContext
): EventLogEntry[] {
  const cached = historyEventLogCache.get(entry);
  if (cached?.context === context) {
    return cached.entries;
  }

  const entries = buildHistoryEventLogEntries({
    entry,
    userPlayers: context.userPlayers,
    opponentPlayers: context.opponentPlayers,
    userAssignedPositions: context.userAssignedPositions,
    opponentAssignedPositions: context.opponentAssignedPositions,
  });

  historyEventLogCache.set(entry, { context, entries });
  return entries;
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
  return matchPlayer ? findPlayerById(players, matchPlayer.id) : null;
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

function buildSubstitutionEventLogEntry(params: {
  side: PossessionSide;
  outPlayer: Player;
  inPlayer: Player;
  minute: number;
  outPlayerPosition?: string;
  inPlayerPosition?: string;
  index: number;
}): EventLogEntry {
  const {
    side,
    outPlayer,
    inPlayer,
    minute,
    outPlayerPosition,
    inPlayerPosition,
    index,
  } = params;

  return {
    id: `substitution-${index}-${outPlayer.id}-${inPlayer.id}`,
    kind: "substitution",
    minute,
    side,
    outPlayer,
    inPlayer,
    outPlayerPosition,
    inPlayerPosition,
    outcome: "SUB ON",
  };
}

function selectShootoutTaker(params: {
  state: PenaltyShootoutState;
  side: PossessionSide;
  team: MatchTeam;
  disciplinaryState: Parameters<typeof getSentOffPlayerIds>[0];
}): MatchPlayer | null {
  const { state, side, team, disciplinaryState } = params;
  const sentOffPlayerIds = getSentOffPlayerIds(disciplinaryState, side);
  const eligibleCount = team.starters.filter(
    (player) => player.role === "outfield" && !sentOffPlayerIds.has(player.id)
  ).length;

  if (eligibleCount === 0) return null;

  const usedInCurrentCycle = getCurrentPenaltyTakerCycleIds(
    state,
    side,
    eligibleCount
  );
  const unavailablePlayerIds = new Set([
    ...sentOffPlayerIds,
    ...usedInCurrentCycle,
  ]);

  return pickBestPenaltyTaker(team, unavailablePlayerIds);
}

function getShootoutGoalkeeper(team: MatchTeam): MatchPlayer | null {
  return team.starters.find((player) => player.role === "goalkeeper") ?? null;
}

export default function Match({ isMuted, onMatchFinished, onReturnToModeSelect }: MatchProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const routeState = location.state as MatchLocationState;
  const [mobileLineupPanel, setMobileLineupPanel] = useState<
    "user" | "opponent" | null
  >(null);

  useEffect(() => {
    document.body.classList.add("is-match-page");

    return () => {
      document.body.classList.remove("is-match-page");
    };
  }, []);

  useEffect(() => {
    if (!routeState?.opponent || !routeState?.userSquad) {
      navigate("/PreMatch");
    }
  }, [navigate, routeState]);

  const userSquad = routeState?.userSquad ?? null;
  const opponent = routeState?.opponent ?? null;
  const isDraftMatch = routeState?.gameMode === "draft";
  const allowDraftMatchUnloadRef = useRef(false);
  const draftReloadMarkerTimeoutRef = useRef<number | null>(null);
  const draftMatchFinalizationRef = useRef<DraftMatchFinalization | null>(null);

  useEffect(() => {
    if (!isDraftMatch) return;

    const returnToModeSelectIfDraftWasReset = () => {
      if (loadDraftProgress()) return;

      allowDraftMatchUnloadRef.current = true;
      resetDraftProgress();

      if (onReturnToModeSelect) {
        onReturnToModeSelect();
        return;
      }

      navigate("/", { replace: true });
    };

    returnToModeSelectIfDraftWasReset();
    window.addEventListener("pageshow", returnToModeSelectIfDraftWasReset);

    return () => {
      window.removeEventListener("pageshow", returnToModeSelectIfDraftWasReset);
    };
  }, [isDraftMatch, navigate, onReturnToModeSelect]);

  useEffect(() => {
    if (!isDraftMatch) return;

    const clearDraftReloadMarker = () => {
      try {
        sessionStorage.removeItem(DRAFT_MATCH_RELOAD_PENDING_KEY);
      } catch {
        // sessionStorage can be blocked by browser privacy settings.
      }

      draftReloadMarkerTimeoutRef.current = null;
    };

    const markDraftReloadPending = () => {
      try {
        sessionStorage.setItem(DRAFT_MATCH_RELOAD_PENDING_KEY, "1");
      } catch {
        // The keyboard shortcut path still resets immediately before reload.
      }

      if (draftReloadMarkerTimeoutRef.current !== null) {
        window.clearTimeout(draftReloadMarkerTimeoutRef.current);
      }

      draftReloadMarkerTimeoutRef.current = window.setTimeout(
        clearDraftReloadMarker,
        1000
      );
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowDraftMatchUnloadRef.current) return;

      markDraftReloadPending();
      event.preventDefault();
      event.returnValue = DRAFT_MATCH_RELOAD_WARNING_MESSAGE;

      return DRAFT_MATCH_RELOAD_WARNING_MESSAGE;
    };

    const handleReloadShortcut = (event: KeyboardEvent) => {
      const isReloadShortcut =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");

      if (!isReloadShortcut) return;

      event.preventDefault();

      if (!window.confirm(DRAFT_MATCH_RELOAD_WARNING_MESSAGE)) {
        return;
      }

      allowDraftMatchUnloadRef.current = true;

      if (draftReloadMarkerTimeoutRef.current !== null) {
        window.clearTimeout(draftReloadMarkerTimeoutRef.current);
        draftReloadMarkerTimeoutRef.current = null;
      }

      try {
        sessionStorage.removeItem(DRAFT_MATCH_RELOAD_PENDING_KEY);
      } catch {
        // no-op
      }

      resetDraftProgress();
      window.location.reload();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleReloadShortcut);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleReloadShortcut);
    };
  }, [isDraftMatch]);

  const allUserPlayers = useMemo(
    () =>
      userSquad
        ? [...userSquad.pitch, ...userSquad.bench].filter(
            (player): player is Player => player !== null
          )
        : [],
    [userSquad]
  );

  const allOpponentPlayers = useMemo(
    () => (opponent ? [...opponent.players, ...opponent.bench] : []),
    [opponent]
  );

  const {
    matchState,
    history,
    latestEntry,
    score,
    currentActors,
    availableActions,
    chooseAction,
    displayedUserStarters,
    displayedOpponentStarters,
    interactiveSetPiece,
    pendingUserSubstitutionInIds,
    continueInteractiveSetPiece,
    queueUserSubstitution,
    resolveInteractiveSetPieceChoice,
    substitutedInUserPlayerIds,
    substitutedInOpponentPlayerIds,
    substitutedOutOpponentPlayerIds,
    substitutedOutUserPlayerIds,
    userBenchPlayers,
    userMatchParticipants,
    opponentSubstitutionsUsed,
    userSubstitutionsUsed,
  } = useMatchEngine({
    userSquad: userSquad ?? { pitch: [], bench: [], formation: "4-3-3" },
    opponent: opponent ?? {
      id: "fallback",
      name: "Opponent",
      formation: "4-3-3",
      players: [],
      bench: [],
    },
  });

  const actionCooldownTimeoutRef = useRef<number | null>(null);
  const [areActionButtonsLocked, setAreActionButtonsLocked] = useState(false);

  useEffect(() => {
    return () => {
      if (actionCooldownTimeoutRef.current !== null) {
        window.clearTimeout(actionCooldownTimeoutRef.current);
      }
    };
  }, []);

  const handleMatchAction = useCallback(
    (action: ActionType) => {
      if (actionCooldownTimeoutRef.current !== null) {
        return;
      }

      setAreActionButtonsLocked(true);
      actionCooldownTimeoutRef.current = window.setTimeout(() => {
        actionCooldownTimeoutRef.current = null;
        setAreActionButtonsLocked(false);
      }, MATCH_ACTION_COOLDOWN_MS);

      chooseAction(action);
    },
    [chooseAction]
  );

  const activeUserPlayers = useMemo(
    () =>
      matchState.userTeam.starters.flatMap((player) => {
        const resolvedPlayer = findPlayerById(allUserPlayers, player.id);
        return resolvedPlayer ? [resolvedPlayer] : [];
      }),
    [allUserPlayers, matchState.userTeam.starters]
  );

  const displayedUserLineupPlayers = useMemo(
    () =>
      displayedUserStarters.map((player) =>
        findPlayerById(allUserPlayers, player.id)
      ),
    [allUserPlayers, displayedUserStarters]
  );

  const displayedUserLineupPositions = useMemo(
    () =>
      displayedUserStarters.map(
        (player) => player.lineupPosition ?? player.position
      ),
    [displayedUserStarters]
  );

  const displayedUserBenchPlayers = useMemo(
    () =>
      userBenchPlayers.map((player) => findPlayerById(allUserPlayers, player.id)),
    [allUserPlayers, userBenchPlayers]
  );

  const displayedOpponentLineupPlayers = useMemo(
    () =>
      displayedOpponentStarters.map((player) =>
        findPlayerById(allOpponentPlayers, player.id)
      ),
    [allOpponentPlayers, displayedOpponentStarters]
  );

  const displayedOpponentLineupPositions = useMemo(
    () =>
      displayedOpponentStarters.map(
        (player) => player.lineupPosition ?? player.position
      ),
    [displayedOpponentStarters]
  );

  const userSubbedOffPlayers = useMemo(
    () =>
      matchState.substitutionState.completedUserSubstitutions.flatMap(
        ({ outPlayer }) => {
          const resolvedPlayer = findPlayerById(allUserPlayers, outPlayer.id);

          if (!resolvedPlayer) {
            return [];
          }

          return [
            {
              player: resolvedPlayer,
              position: outPlayer.lineupPosition ?? outPlayer.position,
            },
          ];
        }
      ),
    [
      allUserPlayers,
      matchState.substitutionState.completedUserSubstitutions,
    ]
  );

  const opponentSubbedOffPlayers = useMemo(
    () =>
      matchState.substitutionState.completedOpponentSubstitutions.flatMap(
        ({ outPlayer }) => {
          const resolvedPlayer = findPlayerById(allOpponentPlayers, outPlayer.id);

          if (!resolvedPlayer) {
            return [];
          }

          return [
            {
              player: resolvedPlayer,
              position: outPlayer.lineupPosition ?? outPlayer.position,
            },
          ];
        }
      ),
    [
      allOpponentPlayers,
      matchState.substitutionState.completedOpponentSubstitutions,
    ]
  );

  const userGK = useMemo(() => {
    const goalkeeper =
      matchState.userTeam.starters.find((player) => player.role === "goalkeeper") ??
      null;

    return findPlayerByMatchPlayer(allUserPlayers, goalkeeper);
  }, [allUserPlayers, matchState.userTeam.starters]);

  const opponentGK = useMemo(() => {
    const goalkeeper =
      matchState.opponentTeam.starters.find(
        (player) => player.role === "goalkeeper"
      ) ?? null;

    return findPlayerByMatchPlayer(allOpponentPlayers, goalkeeper);
  }, [allOpponentPlayers, matchState.opponentTeam.starters]);

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

  const [penaltyShootout, setPenaltyShootout] =
    useState<PenaltyShootoutState | null>(null);
  const [shootoutKickResolution, setShootoutKickResolution] =
    useState<ShootoutKickResolution | null>(null);
  const [shootoutTakerId, setShootoutTakerId] = useState<number | null>(null);
  const [isShootoutTestMode, setIsShootoutTestMode] = useState(false);
  const [showShootoutIntro, setShowShootoutIntro] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const decidedShootoutResult: MatchResult | undefined = penaltyShootout?.winner
    ? penaltyShootout.winner === "user"
      ? "win"
      : "loss"
    : undefined;

  const shootoutStartedRef = useRef(false);
  const shootoutStartTimeoutRef = useRef<number | null>(null);
  const shootoutIntroTimeoutRef = useRef<number | null>(null);
  const goalVisualTimeoutRef = useRef<number | null>(null);
  const goalModalTimeoutRef = useRef<number | null>(null);
  const summaryTimeoutRef = useRef<number | null>(null);
  const handledGoalEventIdRef = useRef<string | null>(null);
  const handledGoalModalIdRef = useRef<string | null>(null);
  const latestGoalModalIdRef = useRef<string | null>(null);

  const startPenaltyShootout = useCallback(
    (testMode = false) => {
      if (!isDraftMatch || shootoutStartedRef.current) return;

      const startingSide: PossessionSide =
        Math.random() < 0.5 ? "user" : "opponent";
      const shootout = createPenaltyShootout(startingSide);
      const team =
        startingSide === "user" ? matchState.userTeam : matchState.opponentTeam;
      const taker = selectShootoutTaker({
        state: shootout,
        side: startingSide,
        team,
        disciplinaryState: matchState.disciplinaryState,
      });

      if (!taker) return;

      shootoutStartedRef.current = true;
      setIsShootoutTestMode(testMode);
      setPenaltyShootout(shootout);
      setShootoutTakerId(taker.id);
      setShowSummary(false);
      setShowShootoutIntro(true);
    },
    [
      isDraftMatch,
      matchState.disciplinaryState,
      matchState.opponentTeam,
      matchState.userTeam,
      setIsShootoutTestMode,
      setPenaltyShootout,
      setShootoutTakerId,
      setShowShootoutIntro,
      setShowSummary,
    ]
  );

  useEffect(() => {
    if (!import.meta.env.DEV || !isDraftMatch) return;

    function handleShootoutTestShortcut(event: KeyboardEvent) {
      if (
        event.repeat ||
        !event.shiftKey ||
        event.code !== "KeyP" ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      event.preventDefault();
      startPenaltyShootout(true);
    }

    window.addEventListener("keydown", handleShootoutTestShortcut);
    return () => window.removeEventListener("keydown", handleShootoutTestShortcut);
  }, [isDraftMatch, startPenaltyShootout]);

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

      if (shootoutStartTimeoutRef.current !== null) {
        window.clearTimeout(shootoutStartTimeoutRef.current);
      }

      if (shootoutIntroTimeoutRef.current !== null) {
        window.clearTimeout(shootoutIntroTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showShootoutIntro || goalModalState.isOpen) return;

    shootoutIntroTimeoutRef.current = window.setTimeout(() => {
      setShowShootoutIntro(false);
      shootoutIntroTimeoutRef.current = null;
    }, 2600);

    return () => {
      if (shootoutIntroTimeoutRef.current !== null) {
        window.clearTimeout(shootoutIntroTimeoutRef.current);
        shootoutIntroTimeoutRef.current = null;
      }
    };
  }, [goalModalState.isOpen, showShootoutIntro]);

  useEffect(() => {
    if (!matchState.isFinished) return;
    if (isDraftMatch && score.user === score.opponent) return;

    summaryTimeoutRef.current = window.setTimeout(() => {
      setShowSummary(true);
    }, 2000);

    return () => {
      if (summaryTimeoutRef.current !== null) {
        window.clearTimeout(summaryTimeoutRef.current);
      }
    };
  }, [isDraftMatch, matchState.isFinished, score.opponent, score.user]);

  useEffect(() => {
    if (
      !isDraftMatch ||
      !matchState.isFinished ||
      score.user !== score.opponent ||
      shootoutStartedRef.current
    ) {
      return;
    }

    shootoutStartTimeoutRef.current = window.setTimeout(() => {
      startPenaltyShootout(false);
      shootoutStartTimeoutRef.current = null;
    }, 2000);

    return () => {
      if (shootoutStartTimeoutRef.current !== null) {
        window.clearTimeout(shootoutStartTimeoutRef.current);
        shootoutStartTimeoutRef.current = null;
      }
    };
  }, [
    isDraftMatch,
    matchState.disciplinaryState,
    matchState.isFinished,
    matchState.opponentTeam,
    matchState.userTeam,
    score.opponent,
    score.user,
    startPenaltyShootout,
  ]);

  useLayoutEffect(() => {
    if (!latestGoal) {
      return;
    }

    if (handledGoalEventIdRef.current === latestGoal.id) {
      return;
    }

    handledGoalEventIdRef.current = latestGoal.id;

    if (goalVisualTimeoutRef.current !== null) {
      window.clearTimeout(goalVisualTimeoutRef.current);
    }

    // The visual lock must be committed before the goal-frame paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

      goalModalTimeoutRef.current = window.setTimeout(() => {
        setGoalModalState({
          isOpen: false,
          scorer: null,
          assistPlayer: null,
          scorerSide: null,
        });
        goalModalTimeoutRef.current = null;
      }, 0);

      return;
    }

    const goalKey = latestGoal.id;

    if (handledGoalModalIdRef.current === goalKey) return;
    handledGoalModalIdRef.current = goalKey;
    latestGoalModalIdRef.current = goalKey;

    const scoringPlayers =
      latestGoal.scorerSide === "user" ? allUserPlayers : allOpponentPlayers;

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
  }, [allOpponentPlayers, allUserPlayers, latestGoal]);

  const userFormation = userSquad
    ? FORMATIONS[userSquad.formation as keyof typeof FORMATIONS]
    : undefined;

  const oppPositions = displayedOpponentLineupPositions;

  const userAssignedPositions = useMemo(() => {
    const positions = new Map<string, string>();

    userSquad?.pitch.forEach((player, index) => {
      if (!player) return;

      positions.set(
        player.name,
        userFormation?.positions[index] ?? player.position
      );
    });

    const substitutions = [
      ...matchState.substitutionState.completedUserSubstitutions,
      ...matchState.substitutionState.pendingUserSubstitutions,
    ];

    substitutions.forEach(({ outPlayer, inPlayer }) => {
      positions.set(
        outPlayer.name,
        outPlayer.lineupPosition ?? outPlayer.position
      );
      positions.set(inPlayer.name, inPlayer.lineupPosition ?? inPlayer.position);
    });

    return positions;
  }, [
    matchState.substitutionState.completedUserSubstitutions,
    matchState.substitutionState.pendingUserSubstitutions,
    userFormation,
    userSquad?.pitch,
  ]);

  const opponentAssignedPositions = useMemo(() => {
    const positions = new Map<string, string>();

    displayedOpponentLineupPlayers.forEach((player, index) => {
      if (!player) return;

      positions.set(player.name, oppPositions[index] ?? player.position);
    });

    return positions;
  }, [displayedOpponentLineupPlayers, oppPositions]);

  // ── Posições dos slots para o MatchSummaryModal ───────────────────────────
  // userFormation.positions pode ter nulls (slots vazios do pitch), então
  // alinhamos com userPlayers (já filtrados) pela mesma lógica do MatchLineup.
  const summaryUserParticipants = useMemo(
    () =>
      userMatchParticipants.flatMap((player) => {
        const resolvedPlayer = findPlayerById(allUserPlayers, player.id);
        if (!resolvedPlayer) {
          return [];
        }

        return [
          {
            player: resolvedPlayer,
            position: player.lineupPosition ?? player.position,
          },
        ];
      }),
    [allUserPlayers, userMatchParticipants]
  );

  const summaryOpponentParticipants = useMemo(() => {
    const seenPlayerIds = new Set<number>();
    const participants = [
      ...displayedOpponentStarters,
      ...matchState.substitutionState.completedOpponentSubstitutions.flatMap(
        ({ outPlayer, inPlayer }) => [outPlayer, inPlayer]
      ),
    ];

    return participants.flatMap((player) => {
      if (seenPlayerIds.has(player.id)) {
        return [];
      }

      seenPlayerIds.add(player.id);

      const resolvedPlayer = findPlayerById(allOpponentPlayers, player.id);
      if (!resolvedPlayer) {
        return [];
      }

      return [
        {
          player: resolvedPlayer,
          position: player.lineupPosition ?? player.position,
        },
      ];
    });
  }, [
    allOpponentPlayers,
    displayedOpponentStarters,
    matchState.substitutionState.completedOpponentSubstitutions,
  ]);

  const matchMvp = useMemo(() => {
    if (!matchState.isFinished && !isShootoutTestMode) {
      return null;
    }

    const playersWithRatings = buildPlayersWithRatings(
      summaryUserParticipants.map(({ player }) => player),
      summaryOpponentParticipants.map(({ player }) => player),
      matchState.playerMatchStats,
      summaryUserParticipants.map(({ position }) => position),
      summaryOpponentParticipants.map(({ position }) => position)
    );

    return getMatchMVP(
      playersWithRatings,
      decidedShootoutResult ?? getResult(score.user, score.opponent)
    );
  }, [
    decidedShootoutResult,
    isShootoutTestMode,
    matchState.isFinished,
    matchState.playerMatchStats,
    score.opponent,
    score.user,
    summaryOpponentParticipants,
    summaryUserParticipants,
  ]);

  const userMvpPlayerId =
    matchMvp?.side === "user" ? Number(matchMvp.player.id) : null;
  const opponentMvpPlayerId =
    matchMvp?.side === "opponent" ? Number(matchMvp.player.id) : null;

  const phase = matchState.isFinished ? "finished" : "playing";

  const eventLogBuildContext = useMemo<EventLogBuildContext>(
    () => ({
      opponentAssignedPositions,
      opponentPlayers: allOpponentPlayers,
      userAssignedPositions,
      userPlayers: allUserPlayers,
    }),
    [
      allOpponentPlayers,
      allUserPlayers,
      opponentAssignedPositions,
      userAssignedPositions,
    ]
  );

  const legacyEvents = useMemo<EventLogEntry[]>(() => {
    return history.flatMap((entry) =>
      getHistoryEventLogEntries(entry, eventLogBuildContext)
    );
  }, [eventLogBuildContext, history]);

  const userSubstitutionEvents = useMemo<EventLogEntry[]>(() => {
    return matchState.substitutionState.completedUserSubstitutions.flatMap(
      (substitution, index) => {
        const outPlayer = findPlayerById(allUserPlayers, substitution.outPlayer.id);
        const inPlayer = findPlayerById(allUserPlayers, substitution.inPlayer.id);

        if (!outPlayer || !inPlayer) {
          return [];
        }

        return [
          buildSubstitutionEventLogEntry({
            side: "user",
            outPlayer,
            inPlayer,
            minute:
              substitution.appliedAtMinute ?? substitution.requestedAtMinute,
            outPlayerPosition:
              userAssignedPositions.get(outPlayer.name) ??
              substitution.outPlayer.lineupPosition ??
              substitution.outPlayer.position,
            inPlayerPosition:
              userAssignedPositions.get(inPlayer.name) ??
              substitution.inPlayer.lineupPosition ??
              substitution.inPlayer.position,
            index: index + 1,
          }),
        ];
      }
    );
  }, [
    allUserPlayers,
    matchState.substitutionState.completedUserSubstitutions,
    userAssignedPositions,
  ]);

  const opponentSubstitutionEvents = useMemo<EventLogEntry[]>(() => {
    return matchState.substitutionState.completedOpponentSubstitutions.flatMap(
      (substitution, index) => {
        const outPlayer = findPlayerById(
          allOpponentPlayers,
          substitution.outPlayer.id
        );
        const inPlayer = findPlayerById(allOpponentPlayers, substitution.inPlayer.id);

        if (!outPlayer || !inPlayer) {
          return [];
        }

        return [
          buildSubstitutionEventLogEntry({
            side: "opponent",
            outPlayer,
            inPlayer,
            minute:
              substitution.appliedAtMinute ?? substitution.requestedAtMinute,
            outPlayerPosition:
              opponentAssignedPositions.get(outPlayer.name) ??
              substitution.outPlayer.lineupPosition ??
              substitution.outPlayer.position,
            inPlayerPosition:
              opponentAssignedPositions.get(inPlayer.name) ??
              substitution.inPlayer.lineupPosition ??
              substitution.inPlayer.position,
            index: index + 101,
          }),
        ];
      }
    );
  }, [
    allOpponentPlayers,
    matchState.substitutionState.completedOpponentSubstitutions,
    opponentAssignedPositions,
  ]);

  const events = useMemo(
    () => [
      ...legacyEvents,
      ...userSubstitutionEvents,
      ...opponentSubstitutionEvents,
    ],
    [legacyEvents, opponentSubstitutionEvents, userSubstitutionEvents]
  );

  const summaryUserPlayers = useMemo(
    () => summaryUserParticipants.map(({ player }) => player),
    [summaryUserParticipants]
  );

  const summaryUserPositions = useMemo(
    () => summaryUserParticipants.map(({ position }) => position),
    [summaryUserParticipants]
  );

  const summaryOpponentPlayers = useMemo(
    () => summaryOpponentParticipants.map(({ player }) => player),
    [summaryOpponentParticipants]
  );

  const summaryOpponentPositions = useMemo(
    () => summaryOpponentParticipants.map(({ position }) => position),
    [summaryOpponentParticipants]
  );

  const finalizeDraftMatch = useCallback(
    (result: MatchResult): DraftMatchResolution | null => {
      if (!isDraftMatch || isShootoutTestMode) return null;

      const progress = loadDraftProgress();
      if (!progress) {
        onReturnToModeSelect?.();
        return null;
      }

      const round = routeState?.draftRound ?? progress.currentRound;
      const previousFinalization = draftMatchFinalizationRef.current;

      if (
        previousFinalization &&
        previousFinalization.round === round &&
        previousFinalization.result === result
      ) {
        return previousFinalization.resolution;
      }

      const campaign = recordDraftMatch({
        campaign: progress.campaign,
        round,
        score: {
          user: score.user,
          opponent: score.opponent,
        },
        penaltyShootoutScore: penaltyShootout?.winner
          ? getPenaltyShootoutScore(penaltyShootout)
          : null,
        performances: summaryUserParticipants.map(({ player, position }) => {
          const stats =
            matchState.playerMatchStats[`user:${player.id}`] ?? emptyStatLine();

          return {
            playerId: player.id,
            playerName: player.name,
            rating: calculatePlayerRating(stats, position),
            goals: stats.goals,
            assists: stats.assists,
          };
        }),
      });
      const progressWithCampaign = { ...progress, campaign };
      const resolution = resolveDraftMatch(round, result);

      if (resolution.kind === "eliminated") {
        saveDraftProgress({
          ...progressWithCampaign,
          campaign: completeDraftCampaign(campaign, {
            kind: "eliminated",
            round,
          }),
        });
      } else if (resolution.kind === "champion") {
        saveDraftProgress({
          ...progressWithCampaign,
          campaign: completeDraftCampaign(campaign, {
            kind: "champion",
            round,
          }),
        });
      } else if (resolution.kind === "advance") {
        saveDraftProgress({
          ...progressWithCampaign,
          currentRound: resolution.nextRound,
        });
      } else {
        saveDraftProgress(progressWithCampaign);
      }

      allowDraftMatchUnloadRef.current = true;
      draftMatchFinalizationRef.current = { round, result, resolution };

      return resolution;
    },
    [
      isDraftMatch,
      isShootoutTestMode,
      matchState.playerMatchStats,
      onReturnToModeSelect,
      penaltyShootout,
      routeState?.draftRound,
      score.opponent,
      score.user,
      summaryUserParticipants,
    ]
  );

  useEffect(() => {
    if (!isDraftMatch || isShootoutTestMode || !matchState.isFinished) return;

    const decidedResult = penaltyShootout?.winner
      ? penaltyShootout.winner === "user"
        ? "win"
        : "loss"
      : score.user === score.opponent
        ? null
        : getResult(score.user, score.opponent);

    if (!decidedResult) return;

    finalizeDraftMatch(decidedResult);
  }, [
    finalizeDraftMatch,
    isDraftMatch,
    isShootoutTestMode,
    matchState.isFinished,
    penaltyShootout?.winner,
    score.opponent,
    score.user,
  ]);

  const handleSummaryContinue = (result: MatchResult) => {
    if (isShootoutTestMode) {
      navigate("/draft-prematch");
      return;
    }

    if (!isDraftMatch) {
      navigate("/PreMatch");
      return;
    }

    const resolution = finalizeDraftMatch(result);
    if (!resolution) return;

    if (resolution.kind === "eliminated") {
      navigate("/draft-summary");
      return;
    }

    if (resolution.kind === "repeat") {
      navigate("/draft-prematch");
      return;
    }

    if (resolution.kind === "champion") {
      navigate("/draft-champion");
      return;
    }

    navigate("/draft-prematch");
  };

  const displayPossession = matchState.possession;
  const displayZone = matchState.zone;
  const isUserAttacking = displayPossession === "user";

  const attackerName = currentActors.attackerName;
  const defenderName =
    currentActors.defenderName ?? currentActors.goalkeeperName ?? null;
  const activeActors =
    matchState.interactiveSetPiece?.actors ?? matchState.currentSituation.actors;

  const userFrontPlayer =
    findPlayerByMatchPlayer(allUserPlayers, activeActors.userPlayer) ??
    (isUserAttacking
      ? getFallbackOutfieldPlayer(activeUserPlayers, [
          "ST",
          "CAM",
          "LW",
          "RW",
          "CM",
        ])
      : getFallbackOutfieldPlayer(activeUserPlayers, ["CB", "CDM", "LB", "RB"]));

  const opponentFrontPlayer =
    findPlayerByMatchPlayer(allOpponentPlayers, activeActors.opponentPlayer) ??
    (isUserAttacking
      ? getFallbackOutfieldPlayer(allOpponentPlayers, ["CB", "CDM", "LB", "RB"])
      : getFallbackOutfieldPlayer(allOpponentPlayers, [
          "ST",
          "CAM",
          "LW",
          "RW",
          "CM",
        ]));

  const fieldHeaderText = getCurrentPhaseText({
    isUserAttacking,
    zone: displayZone,
    attackerName,
    defenderName,
  });

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
    allUserPlayers,
    interactiveActors?.userPlayer
  );

  const modalOpponentPlayer = findPlayerByMatchPlayer(
    allOpponentPlayers,
    interactiveActors?.opponentPlayer
  );

  const modalUserGoalkeeper = findPlayerByMatchPlayer(
    allUserPlayers,
    interactiveActors?.userGoalkeeper
  );

  const modalOpponentGoalkeeper = findPlayerByMatchPlayer(
    allOpponentPlayers,
    interactiveActors?.opponentGoalkeeper
  );

  const modalSupportUserPlayer = findPlayerByMatchPlayer(
    allUserPlayers,
    interactiveActors?.supportUserPlayer
  );

  const modalSupportOpponentPlayer = findPlayerByMatchPlayer(
    allOpponentPlayers,
    interactiveActors?.supportOpponentPlayer
  );

  const prePlayer =
    interactiveSetPiece?.side === "opponent"
      ? modalOpponentPlayer
      : modalUserPlayer;

  const preCardNotice = useMemo<PreInteractiveCardNotice | null>(() => {
    if (interactiveSetPiece?.stage !== "pre") {
      return null;
    }

    const foulResult = matchState.lastEvent?.foulResult;

    if (
      !foulResult?.committed ||
      foulResult.card === "none" ||
      foulResult.playerSide == null
    ) {
      return null;
    }

    const playerPool =
      foulResult.playerSide === "user" ? allUserPlayers : allOpponentPlayers;
    const cardedPlayer = findPlayerById(playerPool, foulResult.playerId);

    if (!cardedPlayer) {
      return null;
    }

    return {
      card: foulResult.card,
      playerName: cardedPlayer.name,
    };
  }, [
    allUserPlayers,
    interactiveSetPiece,
    matchState.lastEvent,
    allOpponentPlayers,
  ]);

  const penaltyResolution =
    pendingSetPieceResolution?.setPieceType === "penalty"
      ? pendingSetPieceResolution.resolution
      : null;

  const shootoutActiveSide =
    shootoutKickResolution?.side ?? penaltyShootout?.currentSide ?? null;
  const shootoutAttackingTeam =
    shootoutActiveSide === "user"
      ? matchState.userTeam
      : shootoutActiveSide === "opponent"
        ? matchState.opponentTeam
        : null;
  const shootoutDefendingTeam =
    shootoutActiveSide === "user"
      ? matchState.opponentTeam
      : shootoutActiveSide === "opponent"
        ? matchState.userTeam
        : null;
  const shootoutMatchTaker =
    shootoutAttackingTeam?.starters.find(
      (player) => player.id === shootoutTakerId
    ) ?? null;
  const shootoutMatchGoalkeeper = shootoutDefendingTeam
    ? getShootoutGoalkeeper(shootoutDefendingTeam)
    : null;
  const shootoutShooter = findPlayerByMatchPlayer(
    shootoutActiveSide === "user" ? allUserPlayers : allOpponentPlayers,
    shootoutMatchTaker
  );
  const shootoutGoalkeeper = findPlayerByMatchPlayer(
    shootoutActiveSide === "user" ? allOpponentPlayers : allUserPlayers,
    shootoutMatchGoalkeeper
  );
  const isShootoutModalOpen = Boolean(
    penaltyShootout &&
      !goalModalState.isOpen &&
      !showShootoutIntro &&
      shootoutActiveSide &&
      shootoutMatchTaker &&
      shootoutMatchGoalkeeper &&
      (!penaltyShootout.winner || shootoutKickResolution)
  );

  const freekickResolution =
    pendingSetPieceResolution?.setPieceType === "freekick"
      ? pendingSetPieceResolution.resolution
      : null;

  const cornerResolution =
    pendingSetPieceResolution?.setPieceType === "corner"
      ? pendingSetPieceResolution.resolution
      : null;

  function handleContinueInteractiveSetPiece() {
    setPendingSetPieceResolution(null);
    continueInteractiveSetPiece();
  }

  function handleInteractiveResolutionContinue() {
    if (!pendingSetPieceResolution || !interactiveSetPiece) return;

    resolveInteractiveSetPieceChoice(pendingSetPieceResolution);
    setPendingSetPieceResolution(null);
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

  function handleShootoutUserPenaltyPick(choice: PenaltyChoice) {
    if (
      !penaltyShootout ||
      shootoutKickResolution ||
      shootoutActiveSide !== "user" ||
      !shootoutMatchTaker ||
      !isOutfieldMatchPlayer(shootoutMatchTaker) ||
      !shootoutMatchGoalkeeper ||
      !isGoalkeeperMatchPlayer(shootoutMatchGoalkeeper)
    ) {
      return;
    }

    const resolution = resolvePen({
      shooterChoice: choice,
      taker: {
        finishing: shootoutMatchTaker.stats.shooting,
        overall: shootoutMatchTaker.overall,
      },
      goalkeeper: {
        reflexes: shootoutMatchGoalkeeper.stats.reflexes,
        diving: shootoutMatchGoalkeeper.stats.diving,
      },
    });

    setPenaltyShootout(
      recordPenaltyShootoutAttempt({
        state: penaltyShootout,
        side: "user",
        takerId: shootoutMatchTaker.id,
        scored: resolution.result === "goal",
      })
    );
    setShootoutKickResolution({
      side: "user",
      takerId: shootoutMatchTaker.id,
      resolution,
    });
  }

  function handleShootoutOpponentPenaltyPick(
    shooterChoice: PenaltyChoice,
    keeperChoice: PenaltyChoice
  ) {
    if (
      !penaltyShootout ||
      shootoutKickResolution ||
      shootoutActiveSide !== "opponent" ||
      !shootoutMatchTaker ||
      !isOutfieldMatchPlayer(shootoutMatchTaker) ||
      !shootoutMatchGoalkeeper ||
      !isGoalkeeperMatchPlayer(shootoutMatchGoalkeeper)
    ) {
      return;
    }

    const resolution = resolvePen({
      shooterChoice,
      keeperChoice,
      taker: {
        finishing: shootoutMatchTaker.stats.shooting,
        overall: shootoutMatchTaker.overall,
      },
      goalkeeper: {
        reflexes: shootoutMatchGoalkeeper.stats.reflexes,
        diving: shootoutMatchGoalkeeper.stats.diving,
      },
    });

    setPenaltyShootout(
      recordPenaltyShootoutAttempt({
        state: penaltyShootout,
        side: "opponent",
        takerId: shootoutMatchTaker.id,
        scored: resolution.result === "goal",
      })
    );
    setShootoutKickResolution({
      side: "opponent",
      takerId: shootoutMatchTaker.id,
      resolution,
    });
  }

  function handleShootoutContinue() {
    if (!penaltyShootout || !shootoutKickResolution) return;

    if (penaltyShootout.winner) {
      setShootoutKickResolution(null);
      setShootoutTakerId(null);
      setShowSummary(true);
      return;
    }

    const nextSide = penaltyShootout.currentSide;
    const nextTeam =
      nextSide === "user" ? matchState.userTeam : matchState.opponentTeam;
    const nextTaker = selectShootoutTaker({
      state: penaltyShootout,
      side: nextSide,
      team: nextTeam,
      disciplinaryState: matchState.disciplinaryState,
    });

    if (!nextTaker) return;

    setShootoutTakerId(nextTaker.id);
    setShootoutKickResolution(null);
  }

  if (!routeState || !userSquad || !opponent) {
    return null;
  }

  const mapZone = goalVisualLock.active
    ? goalVisualLock.lockedZone
    : matchState.zone;
  const mapLane = goalVisualLock.active
    ? goalVisualLock.lockedLane
    : matchState.lane;

  return (
    <div className="match-screen">
      <div
        className={`match-lineup-drawer match-lineup-drawer--user${
          mobileLineupPanel === "user" ? " is-open" : ""
        }`}
      >
        <button
          type="button"
          className="match-lineup-drawer__close"
          onClick={() => setMobileLineupPanel(null)}
          aria-label="Close your lineup"
        >
          <span aria-hidden="true">X</span>
        </button>

        <MatchLineup
          title="Your lineup"
          players={displayedUserLineupPlayers}
          positions={displayedUserLineupPositions}
          starterMatchPlayers={displayedUserStarters}
          benchPlayers={displayedUserBenchPlayers}
          playerMatchStats={matchState.playerMatchStats}
          disciplinaryState={matchState.disciplinaryState}
          subsUsed={userSubstitutionsUsed}
          maxSubs={matchState.substitutionState.maxUserSubstitutions}
          substitutedOutIds={substitutedOutUserPlayerIds}
          substitutedInIds={substitutedInUserPlayerIds}
          completedSubstitutions={
            matchState.substitutionState.completedUserSubstitutions
          }
          subbedOffPlayers={userSubbedOffPlayers}
          pendingInIds={pendingUserSubstitutionInIds}
          isMatchFinished={matchState.isFinished}
          finalMinute={matchState.minute}
          finalTeamGoalsConceded={score.opponent}
          mvpPlayerId={userMvpPlayerId}
          canSubstitute={phase === "playing"}
          onSubstitute={queueUserSubstitution}
        />
      </div>

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

        <MatchMapTip />

        <Scoreboard
          homeScore={score.user}
          awayScore={score.opponent}
          gameTime={phase === "finished" ? "FT" : `${matchState.minute}'`}
        />

        <div className="match-mobile-lineup-tabs" aria-label="Match lineups">
          <button
            type="button"
            className="match-mobile-lineup-tab"
            onClick={() => setMobileLineupPanel("user")}
          >
            <img
              src="/images/field.png"
              alt=""
              className="match-mobile-lineup-tab__icon"
              aria-hidden="true"
            />
            <span>Your Lineup</span>
          </button>

          <button
            type="button"
            className="match-mobile-lineup-tab"
            onClick={() => setMobileLineupPanel("opponent")}
          >
            <img
              src="/images/field.png"
              alt=""
              className="match-mobile-lineup-tab__icon"
              aria-hidden="true"
            />
            <span>Opp. Lineup</span>
          </button>
        </div>

        <MatchField
          situation={fieldHeaderText}
          userPlayer={userFrontPlayer}
          opponentPlayer={opponentFrontPlayer}
          userGK={userGK}
          opponentGK={opponentGK}
          options={interactiveSetPiece ? [] : availableActions}
          onAction={handleMatchAction}
          actionsLocked={areActionButtonsLocked}
          phase={phase}
          isUserAttacking={isUserAttacking}
          zone={displayZone}
        />

        <EventLog events={events} />
      </main>

      <div
        className={`match-lineup-drawer match-lineup-drawer--opponent${
          mobileLineupPanel === "opponent" ? " is-open" : ""
        }`}
      >
        <button
          type="button"
          className="match-lineup-drawer__close"
          onClick={() => setMobileLineupPanel(null)}
          aria-label="Close opponent lineup"
        >
          <span aria-hidden="true">X</span>
        </button>

        <MatchLineup
          title="Opp. Lineup"
          players={displayedOpponentLineupPlayers}
          positions={displayedOpponentLineupPositions}
          isOpponent={true}
          starterMatchPlayers={displayedOpponentStarters}
          playerMatchStats={matchState.playerMatchStats}
          disciplinaryState={matchState.disciplinaryState}
          subsUsed={opponentSubstitutionsUsed}
          maxSubs={matchState.substitutionState.maxOpponentSubstitutions}
          substitutedOutIds={substitutedOutOpponentPlayerIds}
          substitutedInIds={substitutedInOpponentPlayerIds}
          completedSubstitutions={
            matchState.substitutionState.completedOpponentSubstitutions
          }
          subbedOffPlayers={opponentSubbedOffPlayers}
          isMatchFinished={matchState.isFinished}
          finalMinute={matchState.minute}
          finalTeamGoalsConceded={score.user}
          mvpPlayerId={opponentMvpPlayerId}
        />
      </div>

      {mobileLineupPanel ? (
        <button
          type="button"
          className="match-lineup-backdrop"
          onClick={() => setMobileLineupPanel(null)}
          aria-label="Close lineup drawer"
        />
      ) : null}

      <PreInteractiveModal
        isOpen={isPreModalOpen}
        type={preType}
        player={prePlayer ?? undefined}
        side={interactiveSetPiece?.side ?? "user"}
        cardNotice={preCardNotice}
        onContinue={handleContinueInteractiveSetPiece}
      />

      {showShootoutIntro && !goalModalState.isOpen ? (
        <div className="shootout-intro" role="status" aria-live="assertive">
          <div className="shootout-intro__glow" />
          <span className="shootout-intro__kicker">Knockout decider</span>
          <strong>PENALTY SHOOTOUT!</strong>
        </div>
      ) : null}

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

      {isShootoutModalOpen &&
        shootoutActiveSide === "user" &&
        penaltyShootout && (
          <PenModal
            key={`shootout-user-${shootoutTakerId}`}
            isOpen={true}
            shooter={shootoutShooter ?? undefined}
            goalkeeper={shootoutGoalkeeper ?? undefined}
            resolution={shootoutKickResolution?.resolution ?? null}
            shootoutState={penaltyShootout}
            onPick={handleShootoutUserPenaltyPick}
            onContinue={handleShootoutContinue}
          />
        )}

      {isShootoutModalOpen &&
        shootoutActiveSide === "opponent" &&
        penaltyShootout && (
          <OppPenModal
            key={`shootout-opponent-${shootoutTakerId}`}
            isOpen={true}
            shooter={shootoutShooter ?? undefined}
            goalkeeper={shootoutGoalkeeper ?? undefined}
            resolution={shootoutKickResolution?.resolution ?? null}
            shootoutState={penaltyShootout}
            onPick={handleShootoutOpponentPenaltyPick}
            onContinue={handleShootoutContinue}
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

      {matchState.isFinished || isShootoutTestMode ? (
        <MatchSummaryModal
          isOpen={
            showSummary &&
            (!isDraftMatch ||
              score.user !== score.opponent ||
              Boolean(penaltyShootout?.winner && !shootoutKickResolution))
          }
          onViewDetails={() => setShowSummary(false)}
          userScore={score.user}
          opponentScore={score.opponent}
          decidedResult={decidedShootoutResult}
          penaltyShootoutScore={
            penaltyShootout?.winner
              ? getPenaltyShootoutScore(penaltyShootout)
              : undefined
          }
          opponentName={opponent.name}
          playerMatchStats={matchState.playerMatchStats}
          userPlayers={summaryUserPlayers}
          opponentPlayers={summaryOpponentPlayers}
          history={history}
          onOpen={() => onMatchFinished?.()}
          userPositions={summaryUserPositions}
          opponentPositions={summaryOpponentPositions}
          onContinue={handleSummaryContinue}
        />
      ) : null}
    </div>
  );
}
