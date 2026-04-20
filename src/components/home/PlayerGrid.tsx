import PlayerCard from "../player-card/PlayerCard";
import type { Player } from "../../types/PlayerTypes";
import "./PlayerGrid.css";

type PlayerGridProps = {
  players: Player[];
  favorites?: number[];
  onCardClick?: (player: Player) => void;
};

export default function PlayerGrid({ players, favorites = [], onCardClick }: PlayerGridProps) {
  return (
    <section className="player-grid">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isFavorite={favorites.includes(player.id)}
          onCardClick={onCardClick ? () => onCardClick(player) : undefined}
        />
      ))}
    </section>
  );
}