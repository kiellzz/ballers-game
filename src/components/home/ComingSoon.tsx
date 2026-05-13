import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./ComingSoon.css";

type ComingSoonProps = {
  onClose: () => void;
};

export default function ComingSoon({ onClose }: ComingSoonProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="card-modal__overlay" onClick={onClose}>
      <div className="card-modal__dialog coming-soon__dialog" onClick={(e) => e.stopPropagation()}>
        <button className="card-modal__close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <div className="card-modal__header">
          <span className="card-modal__header-name">Draft Mode</span>
          <div className="card-modal__header-positions">
            <span className="card-modal__position-badge card-modal__position-badge--primary">
              Coming Soon
            </span>
          </div>
        </div>

        <div className="card-modal__content coming-soon__content">
          <div className="coming-soon__center">
            <img
              src="/images/logo.webp"
              alt="Ballers"
              className="coming-soon__logo"
            />
            <p className="coming-soon__title">Feature in Development</p>
            <p className="coming-soon__description">
              Draft Mode will be available in future updates.
              <br />
              Stay tuned for more exciting features coming to Ballers!
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
