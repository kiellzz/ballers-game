// components/match/MatchOption.tsx
import React from 'react';
import './MatchOption.css';

interface MatchOptionProps {
  label: string;
  onClick?: () => void;
  onMouseEnter?: () => void; // Adicionado
  onMouseLeave?: () => void; // Adicionado
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
      onMouseEnter={onMouseEnter} // Repassando o evento
      onMouseLeave={onMouseLeave} // Repassando o evento
      disabled={disabled}
    >
      {label}
      <span className="opt-check">✓</span>
    </button>
  );
};