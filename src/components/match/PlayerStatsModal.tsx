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
  { key: "duelWins", label: "Duel wins" },
  { key: "duelLosses", label: "Duel losses" },
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
              <span className="player-stats-modal__mvp-badge">MVP</span>
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
      <section className="player-stats-modal__section">
        <div className="player-stats-modal__clean-sheet">
          <span className="player-stats-modal__clean-sheet-label">
            Minutes played
          </span>
          <span className="player-stats-modal__clean-sheet-minutes">
            {minutesPlayed ?? 0}
          </span>
        </div>

        <div className="player-stats-modal__clean-sheet">
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
        </div>

        <div className="player-stats-modal__grid">
          {statItems.map(({ key, label }) => (
            <div key={String(key)} className="player-stats-modal__stat-card">
              <span className="player-stats-modal__stat-label">{label}</span>
              <span className="player-stats-modal__stat-value">
                {stats[key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </section>
    </MatchModal>
  );
}
