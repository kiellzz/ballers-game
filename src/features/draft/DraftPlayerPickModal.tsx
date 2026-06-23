import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { Player, Position } from "../../types/PlayerTypes";
import LineupCard from "../../components/lineup/LineupCard";
import "./DraftModals.css";

type DraftPlayerPickModalProps = {
  options: Player[];
  slotPosition: Position | null;
  isBench: boolean;
  onSelect: (player: Player) => void;
};

const playerOptionVariants: Variants = {
  hidden: (index: number) => ({
    opacity: 0,
    x: index % 2 === 0 ? -86 : 86,
    y: 16,
    scale: 0.94,
  }),
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.12 + index * 0.24,
      type: "spring",
      stiffness: 140,
      damping: 22,
      mass: 1.1,
    },
  }),
};

export default function DraftPlayerPickModal({
  options,
  slotPosition,
  isBench,
  onSelect,
}: DraftPlayerPickModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const playerOptions = options.slice(0, 4);

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
          {playerOptions.map((player, index) => (
            <motion.button
              key={`${player.id}-${player.name}-${player.overall}`}
              className="draft-player-option"
              type="button"
              onClick={() => onSelect(player)}
              aria-label={`Select ${player.name}, ${player.overall} overall, ${player.position}`}
              custom={index}
              initial={shouldReduceMotion ? false : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              variants={shouldReduceMotion ? undefined : playerOptionVariants}
              whileHover={shouldReduceMotion ? undefined : { y: -7, scale: 1.012 }}
              whileTap={shouldReduceMotion ? undefined : { y: -3, scale: 1.006 }}
            >
              <span className="draft-player-option__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="draft-player-option__card-wrap">
                <LineupCard player={player} />
              </span>
              <span className="draft-player-option__name">{player.name}</span>
              <span className="draft-player-option__select">
                SELECT PLAYER
                <ArrowRight size={13} className="draft-player-option__arrow" aria-hidden="true" />
              </span>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
