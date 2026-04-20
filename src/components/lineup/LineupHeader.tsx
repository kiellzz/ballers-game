import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { FORMATION_KEYS } from "../../utils/formations";
import type { FormationKey } from "../../utils/formations";
import { playButton, playConfirm } from "../../utils/sound";
import "./LineupHeader.css";

interface LineupHeaderProps {
  currentFormation: FormationKey;
  onFormationChange: (formation: FormationKey) => void;
}

export default function LineupHeader({ currentFormation, onFormationChange }: LineupHeaderProps) {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    playConfirm(0.4);
    navigate("/");
  }, [navigate]);

  const handleFormationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    playConfirm(0.4);
    onFormationChange(e.target.value as FormationKey);
  }, [onFormationChange]);

  const handleButtonHover = useCallback(() => {
    playButton(0.3);
  }, []);

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
          onClick={handleBack}
          onMouseEnter={handleButtonHover}
          aria-label="Return"
        >
          <ArrowLeft size={22} strokeWidth={2.4} />
          Return
        </button>

        <img
          src="/images/logo.webp"
          alt="Ballers logo"
          className="pack-header__logo"
        />

        <div className="formation-selector">
          <ChevronDown size={14} className="formation-selector__icon" />
          <select
            className="formation-selector__select"
            value={currentFormation}
            onChange={handleFormationChange}
            onMouseEnter={handleButtonHover}
            aria-label="Selecionar formação"
          >
            {FORMATION_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
