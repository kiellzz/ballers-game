import type { Player } from "../../types/PlayerTypes";
import type { DragSource, DropTarget } from "../../hooks/useDragDrop";
import { memo, useCallback, type TouchEvent } from "react";
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
  onTouchDragStart: (source: DragSource, event: TouchEvent) => void;
  onTouchDragMove: (event: TouchEvent) => void;
  onTouchDragEnd: (
    event: TouchEvent,
    onDrop: (target: DropTarget, source: DragSource) => void,
  ) => void;
  onTouchDragCancel: () => void;
  onTouchDrop: (target: DropTarget, source: DragSource) => void;
  onDrop: (targetIndex: number) => void;
  onClick: (index: number) => void;
  onRemovePlayer?: (index: number) => void;
};

function BenchSlot({
  index,
  player,
  isDragging,
  onDragStart,
  onDragEnd,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  onTouchDragCancel,
  onTouchDrop,
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
      className={[
        "bench-slot",
        player ? "bench-slot--filled" : "bench-slot--empty",
        isDragging ? "bench-slot--dragging" : "",
      ].filter(Boolean).join(" ")}
      data-lineup-drop-zone="bench"
      data-lineup-drop-index={index}
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
        onTouchStart={(event) => {
          if (player) onTouchDragStart({ zone: "bench", index }, event);
        }}
        onTouchMove={onTouchDragMove}
        onTouchEnd={(event) => onTouchDragEnd(event, onTouchDrop)}
        onTouchCancel={onTouchDragCancel}
        style={{ width: "100%", height: "100%", touchAction: player ? "none" : "manipulation" }}
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
                decoding="async"
                draggable={false}
                loading="lazy"
              />
            </div>

            <div className="bench-slot__info-bar">
              <span className="bench-slot__overall">{player.overall}</span>
              <img
                src={getFlagUrl(player.nationality)}
                alt={player.nationality}
                className="bench-slot__flag"
                decoding="async"
                draggable={false}
                loading="lazy"
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
              decoding="async"
              draggable={false}
              loading="lazy"
            />
            <span className="bench-slot__empty-label">SUB</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BenchSlot);
