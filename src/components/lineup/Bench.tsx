import BenchSlot from "./BenchSlot";
import type { Player } from "../../types/PlayerTypes";
import type { DragSource } from "../../hooks/useDragDrop";
import "./Bench.css";

interface Props {
  benchPlayers: (Player | null)[];
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDropToBench: (targetBenchIndex: number) => void;
  onBenchSlotClick: (benchIndex: number) => void;
  onRemoveBenchPlayer?: (benchIndex: number) => void;
}

export default function Bench({
  benchPlayers,
  dragSource,
  onDragStart,
  onDragEnd,
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
            onDrop={onDropToBench}
            onClick={onBenchSlotClick}
            onRemovePlayer={onRemoveBenchPlayer}
          />
        ))}
      </div>
    </div>
  );
}
