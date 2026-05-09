// components/match/MatchOption.tsx
import React from 'react';
import './MatchOption.css';

interface MatchOptionProps {
  label: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disabled?: boolean;
  type?: 'primary' | 'secondary';
}

export const MatchOption: React.FC<MatchOptionProps> = ({
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  type = 'primary'
}) => {
  return (
    <button
      className={`opt-btn opt-btn--${type}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
    >
      {label}
      <span className="opt-check" aria-hidden="true">✓</span>
    </button>
  );
};
