import { LockKeyhole } from "lucide-react";
import { FORMATIONS } from "../../utils/formations";
import type { FormationKey, SlotLayout } from "../../utils/formations";
import "./DraftModals.css";

const PREVIEW_MIN_BOTTOM = 7;
const PREVIEW_MAX_BOTTOM = 89;
const FORMATION_MIN_BOTTOM = -8;
const FORMATION_MAX_BOTTOM = 57;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPreviewPosition(slot: SlotLayout): React.CSSProperties {
  const sourceBottom = Number.parseFloat(slot.bottom);
  const sourceLeft = Number.parseFloat(slot.left);
  const normalizedBottom = PREVIEW_MIN_BOTTOM +
    ((sourceBottom - FORMATION_MIN_BOTTOM) / (FORMATION_MAX_BOTTOM - FORMATION_MIN_BOTTOM)) *
      (PREVIEW_MAX_BOTTOM - PREVIEW_MIN_BOTTOM);
  const expandedLeft = 50 + (sourceLeft - 50) * 1.1;

  return {
    bottom: `${clamp(normalizedBottom, PREVIEW_MIN_BOTTOM, PREVIEW_MAX_BOTTOM)}%`,
    left: `${clamp(expandedLeft, 8, 92)}%`,
  };
}

type DraftFormationModalProps = {
  choices: FormationKey[];
  onSelect: (formation: FormationKey) => void;
};

export default function DraftFormationModal({ choices, onSelect }: DraftFormationModalProps) {
  return (
    <div className="draft-modal-backdrop">
      <section
        className="draft-modal draft-formation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-formation-title"
      >
        <header className="draft-modal__header">
          <span className="draft-modal__kicker">DRAFT STEP 1</span>
          <h2 id="draft-formation-title">CHOOSE YOUR FORMATION</h2>
          <p>Three formations were drawn. Your choice will be locked for this draft.</p>
        </header>

        <div className="draft-formation-modal__grid">
          {choices.map((formationKey) => {
            const formation = FORMATIONS[formationKey];

            return (
              <button
                key={formationKey}
                className="draft-formation-option"
                type="button"
                onClick={() => onSelect(formationKey)}
              >
                <span className="draft-formation-option__pitch" aria-hidden="true">
                  <span className="draft-formation-option__halfway" />
                  {formation.layout.map((slot, index) => (
                    <span
                      key={`${formationKey}-${index}`}
                      className="draft-formation-option__player"
                      style={getPreviewPosition(slot)}
                    />
                  ))}
                </span>
                <strong>{formation.label}</strong>
                <span className="draft-formation-option__positions">
                  {formation.positions.join(" · ")}
                </span>
                <span className="draft-formation-option__select">
                  SELECT FORMATION
                  <LockKeyhole size={14} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
