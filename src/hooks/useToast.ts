import { useState, useCallback, useRef, useEffect } from 'react';

export interface Toast {
  id: number;
  playerName: string;
  playerPosition: string;
  type?: 'error' | 'success';
}

export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const addToast = useCallback((
    playerName: string,
    playerPosition: string,
    type: 'error' | 'success' = 'error',
    silent: boolean = false // 3. Novo parâmetro para silenciar o visual
  ) => {
    const id = ++counterRef.current;

    // Se for silent, apenas logamos (opcional) e não atualizamos o estado visual
    if (silent) {
      console.log(`[Silent Toast] ${playerName} - ${playerPosition} (${type})`);
      return;
    }

    // Lógica normal para toasts visíveis
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