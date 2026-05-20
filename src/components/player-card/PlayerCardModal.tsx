import { useEffect, useMemo, useState } from "react";
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
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const isInSquad = useMemo(() => {
    try {
      const raw = localStorage.getItem("ballers_saved_progress");
      if (!raw) return false;
      const { pitch, bench } = JSON.parse(raw);
      return [...(pitch ?? []), ...(bench ?? [])].some(
        (p: Player | null) => p?.id === player.id
      );
    } catch {
      return false;
    }
  }, [player.id]);

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

  function handleRemoveClick() {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
    } else {
      onRemove();
    }
  }

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
              <span
                key={i}
                className={`card-modal__position-badge ${i === 0 ? "card-modal__position-badge--primary" : ""}`}
              >
                {pos}
              </span>
            ))}
          </div>
          <div className="card-modal__header-meta">
            {player.nationality} · {player.height}cm
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
            {player.isCustom ? (
              <>
                {isInSquad && (
                  <span className="card-modal__squad-warning">
                    ⚠ Player is in your active lineup — unable to remove
                  </span>
                )}
                <button
                  className={`card-modal__btn card-modal__btn--remove ${confirmingRemove ? "card-modal__btn--remove-confirm" : ""}`}
                  onClick={handleRemoveClick}
                  disabled={isInSquad}
                  title={isInSquad ? "Remove from squad before deleting" : undefined}
                >
                  {confirmingRemove ? "CONFIRM?" : "Remove player"}
                </button>
              </>
            ) : (
              <button className="card-modal__btn card-modal__btn--remove" disabled>
                To be added
              </button>
            )}
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
