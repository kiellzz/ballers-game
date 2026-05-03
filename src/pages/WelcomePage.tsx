import { useState } from "react";
import "./WelcomePage.css";

interface WelcomePageProps {
  onStart: () => void;
}

export default function WelcomePage({ onStart }: WelcomePageProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = () => {
    if (typeof onStart === "function") {
      setIsExiting(true);
      setTimeout(() => {
        onStart();
      }, 900);
    }
  };

  return (
    <div className={`welcome-container ${isExiting ? "exit-animation" : ""}`}>

      <div className="web-only-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Best experienced on desktop — mobile is not supported
      </div>

      <div className="welcome-content">
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
