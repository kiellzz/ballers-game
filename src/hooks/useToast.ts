import { useState, useCallback, useRef, useEffect } from 'react';

export interface Toast {
  id: number;
  playerName: string;
  playerPosition: string;
  type?: 'error' | 'success';
  message?: string;
}

export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((
    playerName: string,
    playerPosition: string,
    type: 'error' | 'success' = 'error',
    silent: boolean = false // 3. New parameter for silent toast
  ) => {
    const id = ++counterRef.current;

    // If it's silent toast, we only log in (optional) and don't update the visual state.
    if (silent) {
      console.log(`[Silent Toast] ${playerName} - ${playerPosition} (${type})`);
      return;
    }

    // Logic for visible toasts
    setToasts(prev => [...prev, { id, playerName, playerPosition, type }]);

    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id)!);
    }

    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutsRef.current.delete(id);
    }, duration);

    timeoutsRef.current.set(id, timeoutId);
  }, [duration]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id)!);
      timeoutsRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return { toasts, addToast, removeToast };
}
