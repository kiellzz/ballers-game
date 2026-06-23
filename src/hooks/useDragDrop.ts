import { useState, useCallback, useRef, type TouchEvent } from 'react';

export type DragSource =
  | { zone: 'pitch'; index: number }
  | { zone: 'bench'; index: number };

export type DropTarget = DragSource;

const TOUCH_MOVE_THRESHOLD = 8;
const SUPPRESS_CLICK_MS = 350;

type TouchDragState = {
  source: DragSource;
  startX: number;
  startY: number;
  moved: boolean;
};

function readDropTarget(touch: { clientX: number; clientY: number }): DropTarget | null {
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  const dropElement = element?.closest<HTMLElement>(
    '[data-lineup-drop-zone][data-lineup-drop-index]',
  );

  if (!dropElement) return null;

  const zone = dropElement.dataset.lineupDropZone;
  const index = Number(dropElement.dataset.lineupDropIndex);

  if ((zone !== 'pitch' && zone !== 'bench') || !Number.isInteger(index)) {
    return null;
  }

  return { zone, index };
}

export function useDragDrop() {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const touchDragRef = useRef<TouchDragState | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);

  const onDragStart = useCallback((source: DragSource) => {
    setDragSource(source);
  }, []);

  const onDragEnd = useCallback(() => {
    setDragSource(null);
    touchDragRef.current = null;
  }, []);

  const onTouchDragStart = useCallback((source: DragSource, event: TouchEvent) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    touchDragRef.current = {
      source,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    };
  }, []);

  const onTouchDragMove = useCallback((event: TouchEvent) => {
    const touchDrag = touchDragRef.current;
    const touch = event.touches[0];

    if (!touchDrag || !touch) return;

    const distance = Math.hypot(
      touch.clientX - touchDrag.startX,
      touch.clientY - touchDrag.startY,
    );

    if (distance >= TOUCH_MOVE_THRESHOLD && !touchDrag.moved) {
      touchDrag.moved = true;
      setDragSource(touchDrag.source);
    }

    if (touchDrag.moved) {
      event.preventDefault();
    }
  }, []);

  const onTouchDragEnd = useCallback((
    event: TouchEvent,
    onDrop: (target: DropTarget, source: DragSource) => void,
  ) => {
    const touchDrag = touchDragRef.current;
    const touch = event.changedTouches[0];

    if (!touchDrag) return;

    touchDragRef.current = null;

    if (!touchDrag.moved || !touch) {
      setDragSource(null);
      return;
    }

    event.preventDefault();
    suppressClickRef.current = true;

    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }

    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, SUPPRESS_CLICK_MS);

    const target = readDropTarget(touch);

    if (target) {
      onDrop(target, touchDrag.source);
      return;
    }

    setDragSource(null);
  }, []);

  const onTouchDragCancel = useCallback(() => {
    touchDragRef.current = null;
    setDragSource(null);
  }, []);

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  return {
    dragSource,
    onDragStart,
    onDragEnd,
    onTouchDragStart,
    onTouchDragMove,
    onTouchDragEnd,
    onTouchDragCancel,
    shouldSuppressClick,
  };
}
