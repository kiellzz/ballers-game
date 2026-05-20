import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Player } from "../../types/PlayerTypes";
import PlayerCard from "../player-card/PlayerCard";
import "./PackOpeningCardModal.css";

type PackOpeningCardModalProps = {
  player: Player;
  onClose: () => void;
  // TODO: adicionar mais ações conforme necessário
};

export default function PackOpeningCardModal({
  player,
  onClose,
}: PackOpeningCardModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const allPositions = [player.position, ...(player.secondaryPositions ?? [])];

  return createPortal(
    <div className="card-modal__overlay" onClick={onClose}>
      <div className="card-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal__close" onClick={onClose} aria-label="Fechar modal">
          ✕
        </button>

        {/* HEADER */}
        <div className="card-modal__header">
          <span className="card-modal__header-name">{player.name}</span>
          <div className="card-modal__header-positions">
            {allPositions.map((pos, i) => (
              <span key={i} className={`card-modal__position-badge ${i === 0 ? "card-modal__position-badge--primary" : ""}`}>
                {pos}
              </span>
            ))}
          </div>
          <div className="card-modal__header-meta">
          {player.nationality} · {player.height}cm
        </div>
        </div>

        {/* BODY */}
        <div className="card-modal__content">
          <div className="card-modal__left">
            <PlayerCard player={player} />
          </div>

          <div className="card-modal__center">
            <img src="/images/logo.webp" alt="Ballers" className="card-modal__logo" />
          </div>

          <div className="card-modal__actions">
            {/* TODO: adicionar ações específicas do pack opening */}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
