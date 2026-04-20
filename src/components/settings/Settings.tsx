import React from 'react';
import './Settings.css';

interface SettingsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onSkip: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
}

const IconVolume = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const IconMuted = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const IconSkip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconBellOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
    <path d="M18 8a6 6 0 0 0-9.33-5" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Settings: React.FC<SettingsProps> = ({
  isMuted,
  onToggleMute,
  onSkip,
  isSoundMuted,
  onToggleSound,
}) => {
  return (
    <div className="settings-container">
      <button
        className={`settings-btn ${isMuted ? 'muted' : ''}`}
        onClick={onToggleMute}
        title={isMuted ? "Music Off" : "Music On"}
      >
        <span className="settings-btn__icon">
          {isMuted ? <IconMuted /> : <IconVolume />}
        </span>
        <span className="settings-btn__ripple" />
      </button>

      <button
        className={`settings-btn sound-btn ${isSoundMuted ? 'muted' : ''}`}
        onClick={onToggleSound}
        title={isSoundMuted ? "Sounds Off" : "Sounds On"}
      >
        <span className="settings-btn__icon">
          {isSoundMuted ? <IconBellOff /> : <IconBell />}
        </span>
        <span className="settings-btn__ripple" />
      </button>

      <button
        className="settings-btn skip-btn"
        onClick={onSkip}
        title="Next Music"
      >
        <span className="settings-btn__icon">
          <IconSkip />
        </span>
        <span className="settings-btn__ripple" />
      </button>
    </div>
  );
};

export default Settings;
