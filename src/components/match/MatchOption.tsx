// components/match/MatchOption.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './MatchOption.css';

const PRIMARY_ACTION_COOLDOWN_MS = 300;

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
  const cooldownTimeoutRef = useRef<number | null>(null);
  const isCoolingDownRef = useRef(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const shouldBlockForCooldown = type === 'primary' && isCoolingDown;
  const isDisabled = Boolean(disabled || shouldBlockForCooldown);

  const clearCooldown = useCallback(() => {
    isCoolingDownRef.current = false;
    setIsCoolingDown(false);

    if (cooldownTimeoutRef.current !== null) {
      window.clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearCooldown, [clearCooldown]);

  const handleClick = useCallback(() => {
    if (disabled || isCoolingDownRef.current || !onClick) return;

    if (type === 'primary') {
      isCoolingDownRef.current = true;
      setIsCoolingDown(true);

      if (cooldownTimeoutRef.current !== null) {
        window.clearTimeout(cooldownTimeoutRef.current);
      }

      cooldownTimeoutRef.current = window.setTimeout(() => {
        isCoolingDownRef.current = false;
        setIsCoolingDown(false);
        cooldownTimeoutRef.current = null;
      }, PRIMARY_ACTION_COOLDOWN_MS);
    }

    onClick();
  }, [disabled, onClick, type]);

  return (
    <button
      className={`opt-btn opt-btn--${type}${shouldBlockForCooldown ? ' opt-btn--cooldown' : ''}`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={isDisabled}
      aria-busy={shouldBlockForCooldown}
    >
      {label}
      <span className="opt-check" aria-hidden="true">✓</span>
    </button>
  );
};
