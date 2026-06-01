import { ChevronRight, ChevronLeft } from "lucide-react";
import { playButton, playConfirm } from "../../utils/sound";
import "./FeatureButton.css";

type FeatureButtonProps = {
  label: string;
  onClick?: () => void;
  variant?: "default" | "less" | "save" | "playMatch" | "danger" | "random";
  disabled?: boolean;
  animated?: boolean;
};

export default function FeatureButton({
  label,
  onClick,
  variant = "default",
  disabled = false,
  animated = false,
}: FeatureButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    playConfirm(0.4);
    onClick?.();
  };

  return (
    <button
      className={[
        "feature-button",
        `feature-button--${variant}`,
        disabled ? "feature-button--disabled" : "",
        animated && !disabled ? "feature-button--animated" : "",
      ].filter(Boolean).join(" ")}
      type="button"
      onClick={handleClick}
      onMouseEnter={() => !disabled && playButton(0.3)}
    >
      <span className="feature-button__icon-wrap">
        <span className="feature-button__icon-circle">
          {variant === "less" || variant === "save" ? (
            <>
              <ChevronLeft size={34} strokeWidth={3} />
              <ChevronLeft size={34} strokeWidth={3} />
            </>
          ) : (
            <>
              <ChevronRight size={34} strokeWidth={3} />
              <ChevronRight size={34} strokeWidth={3} />
            </>
          )}
        </span>
      </span>
      <span className="feature-button__label">{label}</span>
    </button>
  );
}