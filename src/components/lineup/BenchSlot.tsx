import type { Player } from "../../types/PlayerTypes";
import type { DragSource } from "../../hooks/useDragDrop";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { getCardTier } from "../../utils/getCardTier";
import "./BenchSlot.css";

const cardBackgroundMap = {
  legend: "/images/cards/legendcard.png",
  gold: "/images/cards/goldcard.png",
  silver: "/images/cards/silvercard.png",
  bronze: "/images/cards/bronzecard.png",
};

interface Props {
  index: number;
  player: Player | null;
  isDragging: boolean;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDrop: (targetIndex: number) => void;
  onClick: (index: number) => void;
  onRemovePlayer: (index: number) => void;
}

export default function BenchSlot({
  index,
  player,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onClick,
}: Props) {
  return (
    <div
      className={`bench-slot ${isDragging ? "bench-slot--dragging" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onClick={() => onClick(index)}
    >
      {}
      <div
        draggable={!!player}
        onDragStart={(e) => {
          if (player) {
            onDragStart({ zone: "bench", index });
          } else {
            e.preventDefault();
          }
        }}
        onDragEnd={onDragEnd}
        className="draggable-wrapper"
        style={{ width: "100%", height: "100%" }}
      >
        {player ? (
          <div
            className="bench-slot__card"
            style={{
              backgroundImage: `url(${cardBackgroundMap[getCardTier(player.overall, player.isLegend)]
                })`,
            }}
          >
            <div className="bench-slot__img-wrap">
              <img
                src={player.customImage ?? getPlayerImage(player.name)}
                alt={player.name}
                className="bench-slot__img"
                onError={(e) => {
                  e.currentTarget.src = "/images/players/default.webp";
                }}
              />
            </div>

            <div className="bench-slot__info">
              <span className="bench-slot__overall">{player.overall}</span>
              <img
                src={getFlagUrl(player.nationality)}
                alt={player.nationality}
                className="bench-slot__flag"
              />
              <span className="bench-slot__pos">{player.position}</span>
            </div>
          </div>
        ) : (
          <div className="player-slot__empty">
            <img
              src="/images/cards/emptycard.png"
              alt="Empty Slot"
              className="empty-card-img"
            />
            <span className="slot-pos-label">SUB</span>
          </div>
        )}
      </div>
    </div>
  );
}