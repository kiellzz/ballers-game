import { useEffect, useRef, useState } from "react";
import { Layers3, Sparkles, Trophy } from "lucide-react";
import "./WelcomePage.css";
import Demo from "../components/demo/Demo";

export type GameMode = "draft" | "freestyle";

interface WelcomePageProps {
  onStart: (mode: GameMode) => void;
  onDraftChampionPreview?: () => void;
  openModeSelectOnMount?: boolean;
}

export default function WelcomePage({
  onStart,
  onDraftChampionPreview,
  openModeSelectOnMount = false,
}: WelcomePageProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isModeSelectOpen, setIsModeSelectOpen] = useState(openModeSelectOnMount);
  const draftButtonRef = useRef<HTMLButtonElement>(null);

  const handleStart = () => {
    setIsModeSelectOpen(true);
  };

  const handleModeStart = (mode: GameMode) => {
    if (typeof onStart !== "function" || isExiting) return;

    setIsModeSelectOpen(false);
    setIsExiting(true);
    setTimeout(() => {
      onStart(mode);
    }, 900);
  };

  const handleDraftChampionPreview = () => {
    if (!onDraftChampionPreview || isExiting) return;

    setIsModeSelectOpen(false);
    onDraftChampionPreview();
  };

  useEffect(() => {
    if (!isModeSelectOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    draftButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModeSelectOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isModeSelectOpen]);

  return (
    <div className={`welcome-container ${isExiting ? "exit-animation" : ""}`}>

      <div className="web-only-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Best experienced on desktop — mobile responsiveness can be inconsistent
      </div>

      <div className="welcome-content">

            <Demo />

        <div className="logo-wrapper">
          <img
            src="/images/logo.webp"
            alt="Ballers Logo"
            className="ballers-logo"
          />
          <div className="glow-effect" />
          <div className="logo-ring" />
        </div>
        <button className="start-btn" onClick={handleStart}>
          <div className="btn-border" />
          <div className="btn-bg">
            <span className="btn-diamond btn-diamond--left" />
            <span className="btn-text">PRESS TO START</span>
            <span className="btn-diamond btn-diamond--right" />
          </div>
        </button>

        <p className="btn-hint">——————————————————————</p>
      </div>

      {isModeSelectOpen && (
        <div
          className="game-mode-modal__backdrop"
          onMouseDown={() => setIsModeSelectOpen(false)}
        >
          <section
            className="game-mode-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-mode-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="game-mode-modal__close"
              type="button"
              onClick={() => setIsModeSelectOpen(false)}
              aria-label="Close game mode selection"
            >
              ×
            </button>

            <div className="game-mode-modal__heading">
              <h2 id="game-mode-title">SELECT GAME MODE</h2>
              <p>Choose how you want to build your team.</p>
            </div>

            <div className="game-mode-modal__options">
              {/* ── Draft ── */}
              <button
                ref={draftButtonRef}
                className="game-mode-card game-mode-card--draft"
                type="button"
                onClick={() => handleModeStart("draft")}
                aria-describedby="draft-mode-description"
              >
                <span className="game-mode-card__badge">RECOMMENDED</span>
                <span className="game-mode-card__icon" aria-hidden="true">
                  <Layers3 size={30} strokeWidth={1.6} />
                </span>
                <span className="game-mode-card__title">DRAFT MODE</span>
                <span id="draft-mode-description" className="game-mode-card__description">
                  Pick from random player choices and create your best possible squad.
                </span>
                <span className="game-mode-card__action">
                  START DRAFT
                  <span className="game-mode-card__action-arrow" aria-hidden="true">→</span>
                </span>
              </button>

              {/* ── Divider ── */}
              <div className="game-mode-modal__divider" aria-hidden="true">
                <span>OR</span>
              </div>

              {/* ── Freestyle ── */}
              <button
                className="game-mode-card game-mode-card--freestyle"
                type="button"
                onClick={() => handleModeStart("freestyle")}
                aria-describedby="freestyle-mode-description"
              >
                <span className="game-mode-card__icon" aria-hidden="true">
                  <Sparkles size={22} strokeWidth={1.6} />
                </span>
                <span className="game-mode-card__freestyle-text">
                  <span className="game-mode-card__title">FREESTYLE MODE</span>
                  <span id="freestyle-mode-description" className="game-mode-card__description">
                    Browse every player, create custom cards and build your dream squad.
                  </span>
                </span>
                <span className="game-mode-card__action">
                  PLAY NOW
                  <span className="game-mode-card__action-arrow" aria-hidden="true">→</span>
                </span>
              </button>
            </div>

            {onDraftChampionPreview ? (
              <button
                className="draft-champion-preview-shortcut"
                type="button"
                onClick={handleDraftChampionPreview}
              >
                <Trophy size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>TEST DRAFT CHAMPION</span>
              </button>
            ) : null}
          </section>
        </div>
      )}

      <footer className="welcome-footer">
        <p className="welcome-disclaimer">
          This project is for educational purposes only. All media assets, including player photos and official trademarks,<br />
          belong to their respective owners. No copyright infringement is intended.
        </p>
        <span className="welcome-footer-text">© 2026 BALLERS PROJECT</span>
      </footer>
    </div>
  );
}
