import type { Player } from "../../types/PlayerTypes";
import type { DragSource } from "../../hooks/useDragDrop";
import { useCallback } from "react";
import { getCardTier } from "../../utils/getCardTier";
import { getCardBackgroundImage } from "../../utils/getCardImage";
import { getPlayerImage } from "../../utils/getPlayerImage";
import { getFlagUrl } from "../../utils/getFlagUrl";
import { playHover } from "../../utils/sound";
import "./BenchSlot.css";

type BenchSlotProps = {
  index: number;
  player: Player | null;
  isDragging: boolean;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDrop: (targetIndex: number) => void;
  onClick: (index: number) => void;
  onRemovePlayer?: (index: number) => void;
};

export default function BenchSlot({
  index,
  player,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onClick,
  onRemovePlayer,
}: BenchSlotProps) {
  const tier = player ? getCardTier(player.overall, player.isLegend) : null;
  const cardBackground = player ? getCardBackgroundImage(player) : null;

  const handleMouseEnter = useCallback(() => {
    playHover(0.25);
  }, []);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemovePlayer?.(index);
  }, [onRemovePlayer, index]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src = "/images/players/default.webp";
  }, []);

  return (
    <div
      className={`bench-slot ${isDragging ? "bench-slot--dragging" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onClick={() => onClick(index)}
      onMouseEnter={handleMouseEnter}
    >
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
        style={{ width: "100%", height: "100%" }}
      >
        {player ? (
          <article
            className={`bench-slot__card bench-slot__card--${tier}`}
            style={{
              backgroundImage: `url(${cardBackground})`,
            }}
          >
            {onRemovePlayer && (
              <button
                className="bench-slot__remove-btn"
                onClick={handleRemoveClick}
                type="button"
              >
                <span>×</span>
              </button>
            )}

            <div className="bench-slot__image-wrap">
              <img
                src={player.customImage ?? getPlayerImage(player.name, player.isWCCard)}
                alt={player.name}
                className="bench-slot__image"
                onError={handleImageError}
              />
            </div>

            <div className="bench-slot__info-bar">
              <span className="bench-slot__overall">{player.overall}</span>
              <img
                src={getFlagUrl(player.nationality)}
                alt={player.nationality}
                className="bench-slot__flag"
              />
              <span className="bench-slot__position">{player.position}</span>
            </div>
          </article>
        ) : (
          <div className="bench-slot__empty">
            <img
              src="/images/cards/emptycard.png"
              alt="Empty Slot"
              className="bench-slot__empty-img"
            />
            <span className="bench-slot__empty-label">SUB</span>
          </div>
        )}
      </div>
    </div>
  );
}
