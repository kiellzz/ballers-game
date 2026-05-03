import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo, useRef } from "react";
import MatchModal from "../../components/match/MatchModal";
import type { Player } from "../../types/PlayerTypes";
import {
  emptyStatLine,
  type PlayerMatchStats,
  type PossessionSide,
} from "../../match-engine/matchTypes";
import { calculatePlayerRating } from "../playerRating";
import type { MatchHistoryEntry } from "./useMatchEngine";
import { getDisplayName } from "../../utils/getDisplayName";
import { getPlayerImage } from "../../utils/getPlayerImage";
import "./MatchSummaryModal.css";

interface GoalEntry {
  scorerName: string;
  assistName: string | null;
  minute: number;
}

interface MatchSummaryModalProps {
  isOpen: boolean;
  onViewDetails?: () => void;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  playerMatchStats: PlayerMatchStats;
  userPlayers: Player[];
  opponentPlayers: Player[];
  history: MatchHistoryEntry[];
}

type MatchResult = "win" | "draw" | "loss";

function getResult(userScore: number, opponentScore: number): MatchResult {
  if (userScore > opponentScore) return "win";
  if (userScore < opponentScore) return "loss";
  return "draw";
}

interface PlayerWithRating {
  player: Player;
  side: "user" | "opponent";
  rating: number;
  goalContributions: number; // goals + assists
}

function buildPlayersWithRatings(
  userPlayers: Player[],
  opponentPlayers: Player[],
  playerMatchStats: PlayerMatchStats
): PlayerWithRating[] {
  const rows: PlayerWithRating[] = [];
  for (const p of userPlayers) {
    const line = playerMatchStats[`user:${p.id}`] ?? emptyStatLine();
    rows.push({
      player: p,
      side: "user",
      rating: calculatePlayerRating(line, p.position),
      goalContributions: line.goals + line.assists,
    });
  }
  for (const p of opponentPlayers) {
    const line = playerMatchStats[`opponent:${p.id}`] ?? emptyStatLine();
    rows.push({
      player: p,
      side: "opponent",
      rating: calculatePlayerRating(line, p.position),
      goalContributions: line.goals + line.assists,
    });
  }
  return rows;
}

/**
 * Deterministic seed from player id + rating, so "random" tie-break is
 * stable across re-renders without needing external state.
 */
function seededPick<T extends { player: Player }>(items: T[]): T {
  // Use the sum of all candidate ids as a stable seed — same candidates
  // always produce the same winner.
  const seed = items.reduce((acc, c) => acc + c.player.id, 0);
  return items[seed % items.length]!;
}

/**
 * MVP selection:
 *  1. Highest rating wins.
 *  2. Tie → most goal contributions (goals + assists).
 *  3. Still tied → non-draw: prefer winning side; draw: stable deterministic pick.
 *  4. Stable pick is seeded from candidate ids — never changes on re-render.
 */
function getMatchMVP(
  players: PlayerWithRating[],
  result: MatchResult
): PlayerWithRating | null {
  if (players.length === 0) return null;

  const maxRating = Math.max(...players.map((p) => p.rating));
  let candidates = players.filter((p) => p.rating === maxRating);

  if (candidates.length === 1) return candidates[0]!;

  // Tie-break 1: most goal contributions
  const maxContributions = Math.max(...candidates.map((c) => c.goalContributions));
  candidates = candidates.filter((c) => c.goalContributions === maxContributions);

  if (candidates.length === 1) return candidates[0]!;

  // Tie-break 2: prefer winning side (non-draw only)
  if (result !== "draw") {
    const winningSide: "user" | "opponent" = result === "win" ? "user" : "opponent";
    const fromWinner = candidates.filter((c) => c.side === winningSide);
    if (fromWinner.length > 0) candidates = fromWinner;
  }

  // Tie-break 3: stable deterministic pick (same candidates → same winner always)
  return seededPick(candidates);
}

/**
 * Builds goal entries for one side from match history.
 */
function buildGoalEntries(
  side: PossessionSide,
  history: MatchHistoryEntry[]
): GoalEntry[] {
  return history
    .filter((entry) => entry.isGoal && entry.scorerSide === side && entry.scorerName)
    .map((event) => ({
      scorerName:
        (event.scorerName ?? "") + (event.isPenaltyGoal ? " (P)" : ""),
      assistName: event.assisterName,
      minute: event.minute,
    }));
}

function getResultConfig(result: MatchResult) {
  switch (result) {
    case "win":
      return {
        label: "VICTORY",
        subtitle: "Full time — well played!",
        className: "summary-modal--win",
        accentClass: "summary-accent--win",
        badgeClass: "summary-badge--win",
        scoreClass: "summary-score--win",
      };
    case "loss":
      return {
        label: "DEFEAT",
        subtitle: "Full time — better luck next time.",
        className: "summary-modal--loss",
        accentClass: "summary-accent--loss",
        badgeClass: "summary-badge--loss",
        scoreClass: "summary-score--loss",
      };
    case "draw":
      return {
        label: "DRAW",
        subtitle: "Full time — honours even.",
        className: "summary-modal--draw",
        accentClass: "summary-accent--draw",
        badgeClass: "summary-badge--draw",
        scoreClass: "summary-score--draw",
      };
  }
}

// ── Animação framer-motion ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", damping: 15, stiffness: 120 } as const,
  },
};

const itemRightVariants = {
  hidden: { opacity: 0, x: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", damping: 15, stiffness: 120 } as const,
  },
};

function GoalList({
  entries,
  side,
}: {
  entries: GoalEntry[];
  side: "user" | "opponent";
}) {
  if (entries.length === 0) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="summary-no-goals"
      >
        —
      </motion.p>
    );
  }

  const variants = side === "user" ? itemVariants : itemRightVariants;
  const isOpp = side === "opponent";

  return (
    <motion.ul
      className="summary-goal-list"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {entries.map((entry, i) => (
        <motion.li
          key={i}
          className={`summary-goal-item summary-goal-item--${side}`}
          variants={variants}
        >
          <div className="summary-goal-row">
            {!isOpp && (
              <span className="summary-goal-minute">{entry.minute}'</span>
            )}

            <motion.img
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              src="/images/ball.png"
              alt="goal"
              className="summary-goal-ball"
              draggable={false}
            />

            <span
              className="summary-goal-scorer"
              style={{ animationDelay: `${i * 1.5}s` }}
            >
              {entry.scorerName}
            </span>

            {isOpp && (
              <span className="summary-goal-minute">{entry.minute}'</span>
            )}
          </div>

          {entry.assistName && (
            <p className="summary-goal-assist">
              <span className="summary-goal-assist-label">Assist</span>
              {" · "}
              <span className="summary-goal-assist-name">{entry.assistName}</span>
            </p>
          )}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export default function MatchSummaryModal({
  isOpen,
  onViewDetails,
  userScore,
  opponentScore,
  opponentName,
  playerMatchStats,
  userPlayers,
  opponentPlayers,
  history,
}: MatchSummaryModalProps) {
  const navigate = useNavigate();
  const result = getResult(userScore, opponentScore);
  const config = getResultConfig(result);

  const userGoals = buildGoalEntries("user", history);
  const opponentGoals = buildGoalEntries("opponent", history);

  // Build ratings once. useMemo keeps this stable as long as stats don't change.
  const playersWithRatings = useMemo(
    () => buildPlayersWithRatings(userPlayers, opponentPlayers, playerMatchStats),
    // playerMatchStats is a new object reference every render in some setups,
    // so we stringify it as a stable cache key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userPlayers, opponentPlayers, JSON.stringify(playerMatchStats)]
  );

  // MVP is computed once when the modal first opens and pinned in a ref so it
  // never changes across re-renders or open/close cycles.
  // We use a separate "locked" flag so the pick only happens after isOpen=true,
  // guaranteeing playerMatchStats is fully populated with final match data.
  const mvpRef = useRef<PlayerWithRating | null>(null);
  const mvpLockedRef = useRef(false);
  if (isOpen && !mvpLockedRef.current) {
    mvpRef.current = getMatchMVP(playersWithRatings, result);
    mvpLockedRef.current = true;
  }
  const mvpPick = mvpRef.current;

  const mvpPlayer = mvpPick?.player ?? null;
  const mvpSide = mvpPick?.side ?? null;
  const mvpRating = mvpPick?.rating ?? null;

  return (
    <MatchModal
      isOpen={isOpen}
      size="default"
      eyebrow="FULL TIME"
      title={config.label}
      subtitle={config.subtitle}
      className={`summary-modal ${config.className}`}
      headerContent={
        <div className="summary-header-content">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, delay: 0.1 }}
            className={`summary-score-block ${config.scoreClass}`}
          >
            <div className="summary-team-label">Your Team</div>
            <div className="summary-scoreline">
              <span className="summary-score-digit">{userScore}</span>
              <span className="summary-score-sep">–</span>
              <span className="summary-score-digit">{opponentScore}</span>
            </div>
            <div className="summary-team-label summary-team-label--opp">
              {opponentName}
            </div>
          </motion.div>

          {mvpPlayer && mvpSide && (
            <div className={`summary-mvp summary-mvp--${mvpSide}`}>
              <div className="summary-mvp__frame">
                <div className="summary-mvp__inner">
                  <img
                    src={getPlayerImage(mvpPlayer.name)}
                    alt={mvpPlayer.name}
                    className="summary-mvp__img"
                    draggable={false}
                  />
                </div>
                <div className="summary-mvp__name-bar">
                  <span className="summary-mvp__name">
                    {getDisplayName(mvpPlayer)}{mvpRating !== null ? ` (${mvpRating.toFixed(1)})` : ""}
                  </span>
                </div>
              </div>
              <p className="summary-mvp__label">MVP</p>
            </div>
          )}
        </div>
      }
      primaryAction={
        <button
          type="button"
          className={`summary-btn-return ${config.badgeClass}`}
          onClick={() => navigate("/PreMatch")}
          autoFocus
        >
          Continue
        </button>
      }
      secondaryAction={
        <button
          type="button"
          className="summary-btn-details"
          onClick={onViewDetails}
        >
          View match details
        </button>
      }
    >
      <div className="summary-body">
        <div className="summary-events">
          <div className="summary-events-col summary-events-col--user">
            <h3 className="summary-events-heading summary-events-heading--user">
              Your Team
            </h3>
            <GoalList entries={userGoals} side="user" />
          </div>

          <div className={`summary-events-divider ${config.accentClass}`} />

          <div className="summary-events-col summary-events-col--opp">
            <h3 className="summary-events-heading summary-events-heading--opp">
              {opponentName}
            </h3>
            <GoalList entries={opponentGoals} side="opponent" />
          </div>
        </div>
      </div>
    </MatchModal>
  );
}
