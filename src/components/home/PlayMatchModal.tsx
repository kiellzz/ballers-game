import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "./PlayMatchModal.css";

type PlayMatchModalProps = {
  onClose: () => void;
};

export default function PlayMatchModal({ onClose }: PlayMatchModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="card-modal__overlay" onClick={onClose}>
      <div className="card-modal__dialog play-match-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal__close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <div className="card-modal__header">
          <span className="card-modal__header-name">Play Match</span>
          <div className="card-modal__header-positions">
            <span className="card-modal__position-badge card-modal__position-badge--primary">
              Lineup Required
            </span>
          </div>
        </div>

        <div className="card-modal__content play-match-modal__content">
          <div className="play-match-modal__center">
            <img
              src="/images/field.png"
              alt="Field"
              className="play-match-modal__icon"
            />
            <p className="play-match-modal__title">Lineup Not Ready</p>
            <p className="play-match-modal__description">
              You need to set up your lineup before playing a match!
              <br />
              Fill your starting XI and your bench to get started.
            </p>
            <button
              className="play-match-modal__cta"
              onClick={() => { onClose(); navigate("/lineup"); }}
            >
              Go to Lineup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
