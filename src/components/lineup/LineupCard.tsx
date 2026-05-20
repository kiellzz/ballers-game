import type { Player } from "../../types/PlayerTypes";
import { useCallback } from "react";
import { getCardTier } from "../../utils/getCardTier";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { playHover } from "../../utils/sound";
import "./LineupCard.css";

type LineupCardProps = {
  player: Player;
  assignedPosition?: string;
  className?: string;
  isFavorite?: boolean;
  onRemovePlayer?: () => void;
};

const cardBackgroundMap = {
  legend: "/images/cards/legendcard.png",
  gold: "/images/cards/goldcard.png",
  silver: "/images/cards/silvercard.png",
  bronze: "/images/cards/bronzecard.png",
};

export default function LineupCard({
  player,
  assignedPosition,
  className = "",
  isFavorite = false,
  onRemovePlayer
}: LineupCardProps) {
  const tier = getCardTier(player.overall, player.isLegend);
  const cardBackground = cardBackgroundMap[tier];

  const handleMouseEnter = useCallback(() => {
    playHover(0.25);
  }, []);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemovePlayer?.();
  }, [onRemovePlayer]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src = "/images/players/default.webp";
  }, []);

  return (
    <article
      className={`lineup-card lineup-card--${tier} ${className}`}
      style={{ backgroundImage: `url(${cardBackground})` }}
      onMouseEnter={handleMouseEnter}
    >
      {onRemovePlayer && (
        <button
          className="lineup-card__remove-btn"
          onClick={handleRemoveClick}
          type="button"
        >
          <span>×</span>
        </button>
      )}

      {isFavorite && (
        <div className="lineup-card__favorite">
          <span className="star-icon">★</span>
        </div>
      )}

      <div className="lineup-card__image-wrap">
        <img
          src={player.customImage ?? getPlayerImage(player.name)}
          alt={player.name}
          className="lineup-card__image"
          onError={handleImageError}
        />
      </div>

      <div className="lineup-card__info-bar">
        <span className="lineup-card__overall">{player.overall}</span>
        <img
          src={getFlagUrl(player.nationality)}
          alt={player.nationality}
          className="lineup-card__flag"
        />
        <span className="lineup-card__position">
          {assignedPosition || player.position}
        </span>
      </div>
    </article>
  );
}
