import { useEffect, useState } from "react";
import "./MatchMapTip.css";

interface MatchMapTipProps {
  duration?: number;   // tempo total visível
  fadeOut?: number;    // duração do sumiço
}

export const MatchMapTip = ({
  duration = 7500,
  fadeOut = 2000,
}: MatchMapTipProps) => {
  const [isMounted, setIsMounted] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, Math.max(0, duration - fadeOut));

    const unmountTimer = window.setTimeout(() => {
      setIsMounted(false);
    }, duration);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [duration, fadeOut]);

  if (!isMounted) return null;

  return (
    <div className={`matchmap-tip-container ${isLeaving ? "is-leaving" : ""}`}>
      <div className="tip-icon">?</div>

      <div className="tip-content">
        <span className="tip-label">Tip:</span>
        <p className="tip-text">Take a look at the Match Map!</p>
      </div>

      <button
        type="button"
        className="tip-close-btn"
        onClick={() => setIsMounted(false)}
        aria-label="Close tip"
      >
        ×
      </button>
        <div className="tip-arrow" aria-hidden="true">
          <img 
            src="/images/arrow.png" 
            alt="" 
            className="tip-arrow-img" 
          />
        </div>
    </div>
  );
};