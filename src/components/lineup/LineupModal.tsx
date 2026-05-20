import type { Player } from "../../types/PlayerTypes";
import PlayerCard from "../player-card/PlayerCard";
import "./LineupModal.css";

interface LineupModalProps {
  player: Player;
  position: string;
  onClose: () => void;
  onReplace: () => void;
  onRemove: () => void;
}

export default function LineupModal({
  player,
  position,
  onClose,
  onReplace,
  onRemove
}: LineupModalProps) {
  return (
    <div className="lineup-card-modal__overlay" onClick={onClose}>
      <div className="lineup-card-modal__dialog" onClick={e => e.stopPropagation()}>

        {/* Close Button */}
        <button className="lineup-card-modal__close" onClick={onClose}>✕</button>

        {/* Header with Name and Badges */}
        <div className="lineup-card-modal__header">
          <span className="lineup-card-modal__header-name">{player.name}</span>
          <div className="lineup-card-modal__header-positions">
            <span className="lineup-card-modal__position-badge lineup-card-modal__position-badge--primary">
              {player.position}
            </span>

            {player.secondaryPositions?.map((pos) => (
              <span key={pos} className="lineup-card-modal__position-badge">
                {pos}
              </span>
            ))}
          </div>
          <div className="card-modal__header-meta">
          {player.nationality} · {player.height}cm
        </div>
        </div>

        <div className="lineup-card-modal__content">
          {/* Player Card Preview */}
          <div className="lineup-card-modal__left">
            <PlayerCard player={player} />
          </div>

          {/* Centered Logo with Glow Effect */}
          <div className="lineup-card-modal__center">
            <img
              src="/images/logo.webp"
              alt="Ballers Logo"
              className="lineup-card-modal__logo"
            />
          </div>

          {/* Action Buttons */}
          <div className="lineup-card-modal__actions">

            {/* Field Position stylized as Badge */}
            <div className="lineup-card-modal__field-info">
              <span className="lineup-card-modal__pos-label">Field Position:</span>
              <span className="lineup-card-modal__pos-value">{position}</span>
            </div>

            <button
              className="lineup-card-modal__btn lineup-card-modal__btn--replace"
              onClick={onReplace}
            >
              <span className="lineup-card-modal__btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </span>
              Replace Player
            </button>

            <button
              className="lineup-card-modal__btn lineup-card-modal__btn--remove"
              onClick={onRemove}
            >
              <span className="lineup-card-modal__btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
              Remove from Team
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}