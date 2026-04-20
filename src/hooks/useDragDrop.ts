import { useState, useCallback } from 'react';

export type DragSource =
  | { zone: 'pitch'; index: number }
  | { zone: 'bench'; index: number };

export function useDragDrop() {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);

  const onDragStart = useCallback((source: DragSource) => {
    setDragSource(source);
  }, []);

  const onDragEnd = useCallback(() => {
    setDragSource(null);
  }, []);

  return { dragSource, onDragStart, onDragEnd };
}