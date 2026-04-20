import { useCallback } from "react";
import type { Player } from "../../types/PlayerTypes";
import { getCardTier } from "../../utils/getCardTier";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { playHover } from "../../utils/sound";
import "./MatchEventPlayerCard.css";

type MatchEventPlayerCardProps = {
  player: Player;
  assignedPosition?: string;
  className?: string;
};

const cardBackgroundMap = {
  legend: "/images/cards/legendcard.png",
  gold: "/images/cards/goldcard.png",
  silver: "/images/cards/silvercard.png",
  bronze: "/images/cards/bronzecard.png",
};

export default function MatchEventPlayerCard({
  player,
  assignedPosition,
  className = "",
}: MatchEventPlayerCardProps) {
  const tier = getCardTier(player.overall, player.isLegend);
  const cardBackground = cardBackgroundMap[tier];
  const position = assignedPosition || player.position;

  const handleMouseEnter = useCallback(() => {
    playHover(0.25);
  }, []);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src = "/images/players/default.webp";
  }, []);

  return (
    <article
      className={`match-event-player-card match-event-player-card--${tier} ${className}`}
      style={{ backgroundImage: `url(${cardBackground})` }}
      onMouseEnter={handleMouseEnter}
    >

      <div className="match-event-player-card__image-wrap">
        <img
          src={getPlayerImage(player.name)}
          alt={player.name}
          className="match-event-player-card__image"
          onError={handleImageError}
        />
      </div>

      <div className="match-event-player-card__info-bar">
        <span className="match-event-player-card__overall">{player.overall}</span>
        <img
          src={getFlagUrl(player.nationality)}
          alt={player.nationality}
          className="match-event-player-card__flag"
        />
        <span className="match-event-player-card__position">{position}</span>
      </div>
    </article>
  );
}
