import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Player } from "../../types/PlayerTypes";
import PlayerCard from "../../components/player-card/PlayerCard";
import "../../components/pack-opening/PackOpeningCardModal.css";
import "./DraftPlayerModal.css";

type DraftPlayerModalProps = {
  player: Player;
  onClose: () => void;
};

export default function DraftPlayerModal({ player, onClose }: DraftPlayerModalProps) {
  const allPositions = [player.position, ...(player.secondaryPositions ?? [])];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="card-modal__overlay" onClick={onClose}>
      <section
        className="card-modal__dialog draft-player-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-player-info-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="card-modal__close" onClick={onClose} aria-label="Close player details">
          ✕
        </button>

        <header className="card-modal__header">
          <span id="draft-player-info-title" className="card-modal__header-name">
            {player.name}
          </span>
          <div className="card-modal__header-positions">
            {allPositions.map((position, index) => (
              <span
                key={`${position}-${index}`}
                className={`card-modal__position-badge ${index === 0 ? "card-modal__position-badge--primary" : ""}`}
              >
                {position}
              </span>
            ))}
          </div>
          <div className="card-modal__header-meta">
            {player.nationality} · {player.height}cm
          </div>
        </header>

        <div className="card-modal__content draft-player-info-modal__content">
          <div className="card-modal__left draft-player-info-modal__card">
            <PlayerCard player={player} />
          </div>

          <aside className="draft-player-info-modal__details" aria-label="Player information">
            <img src="/images/logo.webp" alt="Ballers" className="card-modal__logo" />

            <dl className="draft-player-info-modal__meta">
              <div>
                <dt>Country</dt>
                <dd>{player.nationality}</dd>
              </div>
              <div>
                <dt>Height</dt>
                <dd>{player.height} cm</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </div>,
    document.body,
  );
}
