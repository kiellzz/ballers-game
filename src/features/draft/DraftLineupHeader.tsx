import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useCallback } from "react";
import type { FormationKey } from "../../utils/formations";
import { playButton, playConfirm } from "../../utils/sound";
import "../../components/lineup/LineupHeader.css";
import "./DraftLineupHeader.css";

type DraftLineupHeaderProps = {
  formation: FormationKey | null;
  onReturn: () => void;
};

export default function DraftLineupHeader({ formation, onReturn }: DraftLineupHeaderProps) {
  const handleReturn = useCallback(() => {
    playConfirm(0.4);
    onReturn();
  }, [onReturn]);

  return (
    <header className="pack-header">
      <img
        src="/images/headerart.png"
        alt=""
        className="pack-header__art"
        aria-hidden="true"
      />

      <div className="pack-header__content">
        <button
          className="pack-header__back"
          onClick={handleReturn}
          onMouseEnter={() => playButton(0.3)}
          aria-label="Return to game mode selection"
        >
          <ArrowLeft size={22} strokeWidth={2.4} />
          Return
        </button>

        <img
          src="/images/logo.webp"
          alt="Ballers logo"
          className="pack-header__logo"
        />

        <div className="draft-formation-lock" aria-label={formation ? `Locked formation ${formation}` : "Formation pending"}>
          <LockKeyhole size={14} aria-hidden="true" />
          <span>{formation ?? "DRAFT"}</span>
        </div>
      </div>
    </header>
  );
}

