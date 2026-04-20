import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Player } from "../../types/PlayerTypes";
import { playFavorite } from "../../utils/sound";
import PlayerCard from "./PlayerCard";
import "./PlayerCardModal.css";

type PlayerCardModalProps = {
  player: Player;
  isFavorite: boolean;
  onClose: () => void;
  onRemove: () => void;
  onToggleFavorite: () => void;
};

export default function PlayerCardModal({
  player,
  isFavorite,
  onClose,
  onRemove,
  onToggleFavorite,
}: PlayerCardModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const allPositions = [player.position, ...(player.secondaryPositions ?? [])];

  const handleToggleFavorite = () => {
    playFavorite(0.4);
    onToggleFavorite();
  };

  return createPortal(
    <div className="card-modal__overlay" onClick={onClose}>
      <div className="card-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal__close" onClick={onClose} aria-label="Fechar modal">
          ✕
        </button>

        <div className="card-modal__header">
          <span className="card-modal__header-name">{player.name}</span>
          <div className="card-modal__header-positions">
            {allPositions.map((pos, i) => (
              <span key={i} className={`card-modal__position-badge ${i === 0 ? "card-modal__position-badge--primary" : ""}`}>
                {pos}
              </span>
            ))}
          </div>
        </div>

        <div className="card-modal__content">
          <div className="card-modal__left">
            <PlayerCard player={player} isFavorite={isFavorite} />
          </div>

          <div className="card-modal__center">
            <img src="/images/logo.webp" alt="Ballers" className="card-modal__logo" />
          </div>

          <div className="card-modal__actions">
            <button className="card-modal__btn card-modal__btn--remove" onClick={onRemove}>
              To be added
            </button>
            <button
              className={`card-modal__btn card-modal__btn--favorite ${isFavorite ? "card-modal__btn--favorite-active" : ""}`}
              onClick={handleToggleFavorite}
            >
              {isFavorite ? "★ Favorited" : "☆ Mark as favorite"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
