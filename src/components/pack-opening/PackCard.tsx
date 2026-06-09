import type { Player } from "../../types/PlayerTypes";
import { getCardTier } from "../../utils/getCardTier";
import { getCardFlipImage } from "../../utils/getCardImage";
import PlayerCard from "../player-card/PlayerCard";
import "./PackOpening.css";

interface PackCardProps {
  player: Player;
  index: number;
  allRevealed: boolean;
  flipped: boolean;
  onFlip: () => void;
  onCardClick?: () => void;
}

export function PackCard({ player, index, allRevealed, flipped, onFlip, onCardClick }: PackCardProps) {
  const tier = getCardTier(player.overall, player.isLegend);
  const cardFlipImage = getCardFlipImage(player);

  function handleClick() {
    if (flipped) {
      onCardClick?.();
    } else {
      onFlip();
    }
  }

  return (
    <div
      className={`pack-card-wrapper ${allRevealed ? "pack-card-wrapper--visible" : ""}`}
      style={{ animationDelay: `${index * 0.12}s` }}
      onClick={handleClick}
    >
      <div className={`pack-card-flip ${flipped ? "pack-card-flip--flipped" : ""}`}>
        {/* VERSO */}
        <div className="pack-card-face pack-card-face--back">
          <img
            src={cardFlipImage}
            alt={`${tier} card back`}
            className="pack-card-back__img"
          />
        </div>

        {/* FRENTE — pointer-events none para não interceptar o clique */}
        <div className="pack-card-face pack-card-face--front" style={{ pointerEvents: "none" }}>
          <PlayerCard player={player} />
        </div>
      </div>

      {flipped && tier === "legend" && (
        <div className="pack-card-legend-glow" />
      )}
    </div>
  );
}
