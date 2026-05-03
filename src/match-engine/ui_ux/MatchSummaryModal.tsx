import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MatchModal from "../../components/match/MatchModal";
import type { Player } from "../../types/PlayerTypes";
import type { PlayerMatchStats, PossessionSide } from "../../match-engine/matchTypes";
import type { MatchHistoryEntry } from "./useMatchEngine";
import { getPlayerImage } from "../../utils/getPlayerImage";
import "./MatchSummaryModal.css";

interface GoalEntry {
  scorerName: string;
  assistName: string | null;
  minute: number;
}

interface MatchSummaryModalProps {
  isOpen: boolean;
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

/**
 * Builds goal entries for one side, with correct minute from match history.
 *
 * Strategy:
 *  1. Filter history entries that are goals for this side → gives us
 *     scorerName + minute in chronological order.
 *  2. Build assister pool from playerMatchStats (one slot per assist).
 *  3. Pair each goal entry with one assist slot via findIndex (excludes
 *     self-assist, which the engine already prevents, but safe).
 */
function buildGoalEntries(
  side: PossessionSide,
  playerMatchStats: PlayerMatchStats,
  players: Player[],
  history: MatchHistoryEntry[]
): GoalEntry[] {
  // Pull goals in order from history — gives us scorerName + minute
  const goalEvents = history.filter(
    (entry) => entry.isGoal && entry.scorerSide === side && entry.scorerName
  );

  // Build assister pool from playerMatchStats
  const assisterPool: Array<{ name: string; id: number }> = [];

  for (const [key, stats] of Object.entries(playerMatchStats)) {
    if (!key.startsWith(`${side}:`)) continue;
    if (stats.assists === 0) continue;

    const playerId = Number(key.split(":")[1]);
    const player = players.find((p) => Number(p.id) === playerId);
    if (!player) continue;

    for (let i = 0; i < stats.assists; i++) {
      assisterPool.push({ name: player.name, id: playerId });
    }
  }

  return goalEvents.map((event) => {
    // Find scorer id to exclude self-assist (safety check)
    const scorerPlayer = players.find((p) => p.name === event.scorerName);
    const scorerId = scorerPlayer ? Number(scorerPlayer.id) : -1;

    const assistIdx = assisterPool.findIndex((a) => a.id !== scorerId);
    let assistName: string | null = null;

    if (assistIdx !== -1) {
      const [assist] = assisterPool.splice(assistIdx, 1);
      assistName = assist.name;
    }

    return {
      scorerName: event.scorerName ?? "",
      assistName,
      minute: event.minute,
    };
  });
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
    transition: { type: "spring", damping: 15, stiffness: 120 },
  },
};

const itemRightVariants = {
  hidden: { opacity: 0, x: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", damping: 15, stiffness: 120 },
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
            {/* Minuto — lado esquerdo para user, direito para opponent */}
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

  const userGoals = buildGoalEntries(
    "user",
    playerMatchStats,
    userPlayers,
    history
  );
  const opponentGoals = buildGoalEntries(
    "opponent",
    playerMatchStats,
    opponentPlayers,
    history
  );

  const mvpSide: "user" | "opponent" | null =
    result === "win" ? "user" : result === "loss" ? "opponent" : null;

  const mvpPlayer =
    mvpSide === "user"
      ? userPlayers.find(
          (p) => (playerMatchStats[`user:${p.id}`]?.goals ?? 0) > 0
        )
      : mvpSide === "opponent"
      ? opponentPlayers.find(
          (p) => (playerMatchStats[`opponent:${p.id}`]?.goals ?? 0) > 0
        )
      : null;

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
                  <span className="summary-mvp__name">{mvpPlayer.name}</span>
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
