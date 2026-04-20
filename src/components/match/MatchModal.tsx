import type { ReactNode } from "react";
import "./MatchModal.css";

interface MatchModalProps {
  isOpen: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;

  headerContent?: ReactNode;
  children: ReactNode;

  hint?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;

  bodyClassName?: string;
  footerClassName?: string;
  size?: "default" | "compact";
}

export default function MatchModal({
  isOpen,
  eyebrow = "MATCH EVENT",
  title,
  subtitle,
  className = "",
  headerContent,
  children,
  hint,
  primaryAction,
  secondaryAction,
  bodyClassName = "",
  footerClassName = "",
  size = "default",
}: MatchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="match-modal-overlay">
      <div className={`match-modal match-modal--${size} ${className}`.trim()}>
        <div className="match-modal__header">
          <div className="match-modal__header-main">
            <div className="match-modal__eyebrow">{eyebrow}</div>
            <h2 className="match-modal__title">{title}</h2>

            {subtitle && (
              <p className="match-modal__subtitle">{subtitle}</p>
            )}

            {headerContent && (
              <div className="match-modal__header-content">
                {headerContent}
              </div>
            )}
          </div>
        </div>

        <div className={`match-modal__body ${bodyClassName}`}>
          {children}
        </div>

        <div className={`match-modal__footer ${footerClassName}`}>
          {hint && <div className="match-modal__hint">{hint}</div>}

          {secondaryAction && (
            <div className="match-modal__secondary-action">
              {secondaryAction}
            </div>
          )}

          {primaryAction && (
            <div className="match-modal__primary-action">
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
