import BenchSlot from "./BenchSlot";
import type { Player } from "../../types/PlayerTypes";
import type { DragSource, DropTarget } from "../../hooks/useDragDrop";
import type { TouchEvent } from "react";
import "./Bench.css";

interface Props {
  benchPlayers: (Player | null)[];
  dragSource: DragSource | null;
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
  onDropToBench: (targetBenchIndex: number) => void;
  onBenchSlotClick: (benchIndex: number) => void;
  onRemoveBenchPlayer?: (benchIndex: number) => void;
}

export default function Bench({
  benchPlayers,
  dragSource,
  onDragStart,
  onDragEnd,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  onTouchDragCancel,
  onTouchDrop,
  onDropToBench,
  onBenchSlotClick,
  onRemoveBenchPlayer,
}: Props) {
  return (
    <div className="bench">
      <span className="bench__title">Substitutes</span>
      <div className="bench__slots">
        {benchPlayers.map((player, index) => (
          <BenchSlot
            key={index}
            index={index}
            player={player}
            isDragging={dragSource?.zone === "bench" && dragSource.index === index}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onTouchDragStart={onTouchDragStart}
            onTouchDragMove={onTouchDragMove}
            onTouchDragEnd={onTouchDragEnd}
            onTouchDragCancel={onTouchDragCancel}
            onTouchDrop={onTouchDrop}
            onDrop={onDropToBench}
            onClick={onBenchSlotClick}
            onRemovePlayer={onRemoveBenchPlayer}
          />
        ))}
      </div>
    </div>
  );
}
