import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import MatchModal from "../../components/match/MatchModal";
import type { Player } from "../../types/PlayerTypes";
import {
  emptyStatLine,
  type PlayerMatchStats,
} from "../../match-engine/matchTypes";
import { calculatePlayerRating } from "../playerRating";
import type { MatchHistoryEntry } from "./useMatchEngine";
import {
  buildSummaryEntries,
  type SummaryEventEntry,
} from "./summaryEvents";
import { getDisplayName } from "../../utils/getDisplayName";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { matchSound } from "../../match-engine/sounds/matchSound";
import "./MatchSummaryModal.css";

interface MatchSummaryModalProps {
  isOpen: boolean;
  onViewDetails?: () => void;
  onOpen?: () => void;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  playerMatchStats: PlayerMatchStats;
  userPlayers: Player[];
  opponentPlayers: Player[];
  history: MatchHistoryEntry[];
  // ── posições dos slots (mesmas que o MatchLineup recebe) ──
  userPositions: string[];
  opponentPositions: string[];
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
  goalContributions: number;
}

function buildPlayersWithRatings(
  userPlayers: Player[],
  opponentPlayers: Player[],
  playerMatchStats: PlayerMatchStats,
  userPositions: string[],      // ← novo
  opponentPositions: string[],  // ← novo
): PlayerWithRating[] {
  const rows: PlayerWithRating[] = [];

  for (let i = 0; i < userPlayers.length; i++) {
    const p = userPlayers[i]!;
    const line = playerMatchStats[`user:${p.id}`] ?? emptyStatLine();
    // Usa a posição do slot; cai na posição nativa só como fallback
    const slotPosition = userPositions[i] ?? p.position;
    rows.push({
      player: p,
      side: "user",
      rating: calculatePlayerRating(line, slotPosition),
      goalContributions: line.goals + line.assists,
    });
  }

  for (let i = 0; i < opponentPlayers.length; i++) {
    const p = opponentPlayers[i]!;
    const line = playerMatchStats[`opponent:${p.id}`] ?? emptyStatLine();
    const slotPosition = opponentPositions[i] ?? p.position;
    rows.push({
      player: p,
      side: "opponent",
      rating: calculatePlayerRating(line, slotPosition),
      goalContributions: line.goals + line.assists,
    });
  }

  return rows;
}

function seededPick<T extends { player: Player }>(items: T[]): T {
  const seed = items.reduce((acc, c) => acc + c.player.id, 0);
  return items[seed % items.length]!;
}

function getMatchMVP(
  players: PlayerWithRating[],
  result: MatchResult
): PlayerWithRating | null {
  if (players.length === 0) return null;

  const maxRating = Math.max(...players.map((p) => p.rating));
  let candidates = players.filter((p) => p.rating === maxRating);

  if (candidates.length === 1) return candidates[0]!;

  const maxContributions = Math.max(...candidates.map((c) => c.goalContributions));
  candidates = candidates.filter((c) => c.goalContributions === maxContributions);

  if (candidates.length === 1) return candidates[0]!;

  if (result !== "draw") {
    const winningSide: "user" | "opponent" = result === "win" ? "user" : "opponent";
    const fromWinner = candidates.filter((c) => c.side === winningSide);
    if (fromWinner.length > 0) candidates = fromWinner;
  }

  return seededPick(candidates);
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

function SummaryEventList({
  entries,
  side,
}: {
  entries: SummaryEventEntry[];
  side: "user" | "opponent";
}) {
  if (entries.length === 0) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="summary-no-events"
      >
        —
      </motion.p>
    );
  }

  const variants = side === "user" ? itemVariants : itemRightVariants;
  const isOpp = side === "opponent";

  return (
    <motion.ul
      className="summary-event-list"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {entries.map((entry, i) => (
        <motion.li
          key={i}
          className={`summary-event-item summary-event-item--${side}`}
          variants={variants}
        >
          <div className="summary-event-row">
            {!isOpp && (
              <span className="summary-event-minute">{entry.minute}'</span>
            )}

            {entry.type === "goal" ? (
              <motion.img
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                src="/images/ball.png"
                alt="goal"
                className="summary-event-icon summary-event-icon--goal"
                draggable={false}
              />
            ) : (
              <span
                className="summary-event-icon summary-event-icon--red-card"
                aria-label="red card"
                role="img"
              />
            )}

            <span
              className={
                entry.type === "goal"
                  ? "summary-goal-scorer"
                  : "summary-event-primary summary-event-primary--red-card"
              }
              style={{ animationDelay: `${i * 1.5}s` }}
            >
              {entry.primaryName}
            </span>

            {isOpp && (
              <span className="summary-event-minute">{entry.minute}'</span>
            )}
          </div>

          {entry.secondaryLabel && (
            entry.type === "goal" ? (
              <p className="summary-goal-assist">
                <span className="summary-goal-assist-label">
                  {entry.secondaryLabel}
                </span>
                {entry.secondaryValue ? (
                  <>
                    {" · "}
                    <span className="summary-goal-assist-name">
                      {entry.secondaryValue}
                    </span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="summary-event-secondary summary-event-secondary--red-card">
                <span className="summary-event-secondary-label">
                  {entry.secondaryLabel}
                </span>
                {entry.secondaryValue ? (
                  <>
                    {" · "}
                    <span className="summary-event-secondary-value">
                      {entry.secondaryValue}
                    </span>
                  </>
                ) : null}
              </p>
            )
          )}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export default function MatchSummaryModal({
  isOpen,
  onViewDetails,
  onOpen,
  userScore,
  opponentScore,
  opponentName,
  playerMatchStats,
  userPlayers,
  opponentPlayers,
  history,
  userPositions,
  opponentPositions,
}: MatchSummaryModalProps) {
  const navigate = useNavigate();
  const result = getResult(userScore, opponentScore);
  const config = getResultConfig(result);

  const userEvents = useMemo(() => buildSummaryEntries("user", history), [history]);
  const opponentEvents = useMemo(
    () => buildSummaryEntries("opponent", history),
    [history]
  );

  useEffect(() => {
    if (!isOpen) return;
    matchSound.onMatchFinished(result);
    onOpen?.();
  }, [isOpen, onOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const playersWithRatings = useMemo(
    () =>
      buildPlayersWithRatings(
        userPlayers,
        opponentPlayers,
        playerMatchStats,
        userPositions,
        opponentPositions,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userPlayers, opponentPlayers, JSON.stringify(playerMatchStats), userPositions, opponentPositions]
  );

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
                    src={mvpPlayer.customImage ?? getPlayerImage(mvpPlayer.name)}
                    alt={mvpPlayer.name}
                    className="summary-mvp__img"
                    draggable={false}
                    onError={(e) => { e.currentTarget.src = "/images/players/default.webp"; }}
                  />
                </div>
                <div className="summary-mvp__name-bar">
                  <div className="summary-mvp__name">
                    <span className="mvp-text-name">{getDisplayName(mvpPlayer)}</span>
                    {mvpRating !== null && (
                      <span className="mvp-text-rating">&nbsp;({mvpRating.toFixed(1)})</span>
                    )}
                  </div>
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
            <SummaryEventList entries={userEvents} side="user" />
          </div>

          <div className={`summary-events-divider ${config.accentClass}`} />

          <div className="summary-events-col summary-events-col--opp">
            <h3 className="summary-events-heading summary-events-heading--opp">
              {opponentName}
            </h3>
            <SummaryEventList entries={opponentEvents} side="opponent" />
          </div>
        </div>
      </div>
    </MatchModal>
  );
}
