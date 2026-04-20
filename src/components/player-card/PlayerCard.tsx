import type { Player } from "../../types/PlayerTypes";
import { isGKStats } from "../../types/PlayerTypes";
import { getCardTier } from "../../utils/getCardTier";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { getDisplayName } from "../../utils/getDisplayName";
import { playHover } from "../../utils/sound";
import "./PlayerCard.css";

type PlayerCardProps = {
  player: Player;
  className?: string;
  isFavorite?: boolean;
  onCardClick?: () => void;
};

const cardBackgroundMap = {
  legend: "/images/cards/legendcard.png",
  gold: "/images/cards/goldcard.png",
  silver: "/images/cards/silvercard.png",
  bronze: "/images/cards/bronzecard.png",
};

export default function PlayerCard({
  player,
  className = "",
  isFavorite = false,
  onCardClick,
}: PlayerCardProps) {
  const tier = getCardTier(player.overall, player.isLegend);
  const cardBackground = cardBackgroundMap[tier];
  const { stats } = player;

  return (
    <article
      className={`player-card player-card--${tier} ${className} ${
        onCardClick ? "player-card--clickable" : ""
      }`}
      style={{ backgroundImage: `url(${cardBackground})` }}
      onClick={onCardClick}
      onMouseEnter={() => playHover(0.25)}
    >
      {isFavorite && <div className="player-card__favorite-star">★</div>}

      <div className="player-card__top-left">
        <div className="player-card__overall">{player.overall}</div>
        <div className="player-card__position">{player.position}</div>

        <img
          src="/images/badge.png"
          alt="Ballers logo"
          className="player-card__badge"
        />

        <img
          src={getFlagUrl(player.nationality)}
          alt={player.nationality}
          className="player-card__flag"
        />
      </div>

      <div className="player-card__image-wrap">
        <img
          src={getPlayerImage(player.name)}
          alt={player.name}
          className="player-card__image"
          onError={(event) => {
            event.currentTarget.src = "/images/players/default.webp";
          }}
        />
      </div>

      <div className="player-card__name">{getDisplayName(player)}</div>

      <div className="player-card__stats">
        {isGKStats(stats) ? (
          <>
            <div className="player-card__stats-column">
              <p>
                <strong>{stats.diving}</strong> DIV
              </p>
              <p>
                <strong>{stats.handling}</strong> HAN
              </p>
              <p>
                <strong>{stats.kicking}</strong> KIC
              </p>
            </div>
            <div className="player-card__stats-column">
              <p>
                <strong>{stats.reflexes}</strong> REF
              </p>
              <p>
                <strong>{stats.speed}</strong> SPD
              </p>
              <p>
                <strong>{stats.positioning}</strong> POS
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="player-card__stats-column">
              <p>
                <strong>{stats.pace}</strong> SPD
              </p>
              <p>
                <strong>{stats.shooting}</strong> SHO
              </p>
              <p>
                <strong>{stats.passing}</strong> PAS
              </p>
            </div>
            <div className="player-card__stats-column">
              <p>
                <strong>{stats.dribbling}</strong> DRI
              </p>
              <p>
                <strong>{stats.defending}</strong> DEF
              </p>
              <p>
                <strong>{stats.physical}</strong> PHY
              </p>
            </div>
          </>
        )}
      </div>
    </article>
  );
}