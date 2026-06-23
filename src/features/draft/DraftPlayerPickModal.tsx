import type { Player, Position } from "../../types/PlayerTypes";
import LineupCard from "../../components/lineup/LineupCard";
import "./DraftModals.css";

type DraftPlayerPickModalProps = {
  options: Player[];
  slotPosition: Position | null;
  isBench: boolean;
  onSelect: (player: Player) => void;
};

export default function DraftPlayerPickModal({
  options,
  slotPosition,
  isBench,
  onSelect,
}: DraftPlayerPickModalProps) {
  const title = isBench
    ? `CHOOSE A ${slotPosition ?? ""} SUBSTITUTE`
    : `CHOOSE YOUR ${slotPosition ?? "PLAYER"}`;

  return (
    <div className="draft-modal-backdrop">
      <section
        className="draft-modal draft-player-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-player-title"
      >
        <header className="draft-modal__header">
          <span className="draft-modal__kicker">DRAFT PICK</span>
          <h2 id="draft-player-title">{title}</h2>
          <p>Choose one of the drawn players. This pick is final.</p>
        </header>

        <div className="draft-player-modal__grid">
          {options.map((player) => (
            <button
              key={`${player.id}-${player.name}-${player.overall}`}
              className="draft-player-option"
              type="button"
              onClick={() => onSelect(player)}
              aria-label={`Select ${player.name}, ${player.overall} overall, ${player.position}`}
            >
              <LineupCard player={player} />
              <span className="draft-player-option__name">{player.name}</span>
              <span className="draft-player-option__select">SELECT PLAYER</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
