import { memo, useCallback } from "react";
import PlayerCard from "../player-card/PlayerCard";
import type { Player } from "../../types/PlayerTypes";
import "./PlayerGrid.css";

type PlayerGridProps = {
  players: Player[];
  favoriteIds: ReadonlySet<number>;
  onCardClick?: (player: Player) => void;
};

interface PlayerGridCardProps {
  player: Player;
  isFavorite: boolean;
  onCardClick?: (player: Player) => void;
}

const PlayerGridCard = memo(function PlayerGridCard({
  player,
  isFavorite,
  onCardClick,
}: PlayerGridCardProps) {
  const handleClick = useCallback(() => {
    onCardClick?.(player);
  }, [onCardClick, player]);

  return (
    <PlayerCard
      player={player}
      isFavorite={isFavorite}
      onCardClick={onCardClick ? handleClick : undefined}
    />
  );
});

function PlayerGrid({ players, favoriteIds, onCardClick }: PlayerGridProps) {
  return (
    <section className="player-grid">
      {players.map((player) => (
        <PlayerGridCard
          key={player.id}
          player={player}
          isFavorite={favoriteIds.has(player.id)}
          onCardClick={onCardClick}
        />
      ))}
    </section>
  );
}

export default memo(PlayerGrid);
