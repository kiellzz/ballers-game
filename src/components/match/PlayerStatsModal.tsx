import type { Player } from "../../types/PlayerTypes";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { getPlayerImage } from "../../utils/getPlayerImage";
import {
  calculatePlayerRating,
  getRatingClass,
} from "../../match-engine/playerRating";
import type { PlayerMatchStatLine } from "../../match-engine/matchTypes";
import MatchModal from "./MatchModal";
import "./PlayerStatsModal.css";
import { motion, type Variants } from "framer-motion";

interface PlayerStatsModalProps {
  isOpen: boolean;
  player: Player | null;
  position: string | null;
  stats: PlayerMatchStatLine | null;
  minutesPlayed: number | null;
  teamGoalsConceded: number | null;
  isMvp?: boolean;
  onClose: () => void;
}

const PRIMARY_STATS: Array<{
  key: keyof PlayerMatchStatLine;
  label: string;
}> = [
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "yellowCards", label: "Yellow cards" },
  { key: "dismissals", label: "Red card" },
  { key: "bigChancesCreated", label: "Big chances created" },
  { key: "shotAttempts", label: "Shot attempts" },
  { key: "successfulActions", label: "Successful actions" },
  { key: "failedActions", label: "Failed actions" },
  { key: "clearances", label: "Clearances" },
  { key: "penaltyMisses", label: "Penalty misses" },
];

const GOALKEEPER_STATS: Array<{
  key: keyof PlayerMatchStatLine;
  label: string;
}> = [
  { key: "saves", label: "Saves" },
  { key: "highSaves", label: "High saves" },
  { key: "penaltySaves", label: "Penalty saves" },
  { key: "goalsConceded", label: "Goals conceded" },
  { key: "weakGoalsConceded", label: "Weak goals conceded" },
  { key: "successfulActions", label: "Successful actions" },
  { key: "failedActions", label: "Failed actions" },
  { key: "clearances", label: "Clearances" },
  { key: "yellowCards", label: "Yellow cards" },
  { key: "dismissals", label: "Red card" },
];

// Configurações de animação tipadas para evitar o erro TS2322
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};

const badgeVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, delay: 0.2 },
  },
};

export function PlayerStatsModal(props: PlayerStatsModalProps) {
  const {
    isOpen,
    player,
    position,
    stats,
    minutesPlayed,
    teamGoalsConceded,
    isMvp = false,
    onClose,
  } = props;

  if (!isOpen || !player || !position || !stats) {
    return null;
  }

  const rating = calculatePlayerRating(stats, position);
  const ratingClass = getRatingClass(rating);
  const hasCleanSheet = (teamGoalsConceded ?? 0) === 0;
  const statItems = position === "GK" ? GOALKEEPER_STATS : PRIMARY_STATS;

  return (
    <MatchModal
      isOpen={isOpen}
      size="compact"
      eyebrow="Match Stats"
      title={player.name}
      subtitle={`${position} · ${player.nationality}`}
      className="player-stats-modal"
      bodyClassName="player-stats-modal__body"
      primaryAction={
        <button
          type="button"
          className="match-modal__btn match-modal__btn--primary"
          onClick={onClose}
        >
          Close
        </button>
      }
      headerContent={
        <div className="player-stats-modal__hero">
          <div
            className={`player-stats-modal__hero-main${
              isMvp ? " player-stats-modal__hero-main--mvp" : ""
            }`}
          >
            {isMvp ? (
              <motion.span
                className="player-stats-modal__mvp-badge"
                variants={badgeVariants}
                initial="hidden"
                animate="visible"
              >
                MVP!
              </motion.span>
            ) : null}
            <div className="player-stats-modal__avatar-wrap">
              <img
                src={player.customImage ?? getPlayerImage(player.name)}
                alt={player.name}
                className="player-stats-modal__avatar"
                onError={(event) => {
                  event.currentTarget.src = "/images/players/default.webp";
                }}
              />
            </div>
            <span
              className={`player-stats-modal__rating player-stats-modal__rating--${ratingClass}`}
            >
              {rating.toFixed(1)}
            </span>
            <span className="player-stats-modal__ovr">{player.overall} OVR</span>
            <div className="player-stats-modal__flag-wrap">
              <img
                src={getFlagUrl(player.nationality)}
                alt={player.nationality}
                className="player-stats-modal__flag"
              />
            </div>
          </div>
        </div>
      }
    >
      <motion.section
        className="player-stats-modal__section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="player-stats-modal__clean-sheet" variants={itemVariants}>
          <span className="player-stats-modal__clean-sheet-label">
            Minutes played
          </span>
          <span className="player-stats-modal__clean-sheet-minutes">
            {minutesPlayed ?? 0}
          </span>
        </motion.div>

        <motion.div className="player-stats-modal__clean-sheet" variants={itemVariants}>
          <span className="player-stats-modal__clean-sheet-label">
            Clean sheet
          </span>
          <span
            className={`player-stats-modal__clean-sheet-value${
              hasCleanSheet
                ? " player-stats-modal__clean-sheet-value--true"
                : " player-stats-modal__clean-sheet-value--false"
            }`}
          >
            {hasCleanSheet ? "\u2713" : "\u2715"}
          </span>
        </motion.div>

        <div className="player-stats-modal__grid">
          {statItems.map(({ key, label }) => (
            <motion.div
              key={String(key)}
              className="player-stats-modal__stat-card"
              variants={itemVariants}
              whileHover={{ scale: 1.03, translateY: -2 }}
            >
              <span className="player-stats-modal__stat-label">{label}</span>
              <span className="player-stats-modal__stat-value">
                {stats[key] ?? 0}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </MatchModal>
  );
}