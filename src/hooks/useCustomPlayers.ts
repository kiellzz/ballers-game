import { useState, useCallback } from "react";
import type { Player } from "../types/PlayerTypes";

const STORAGE_KEY = "ballers_custom_players";

function loadFromStorage(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(players: Player[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  } catch (error) {
    console.error("Failed to save custom players:", error);
  }
}

export function useCustomPlayers() {
  const [customPlayers, setCustomPlayers] = useState<Player[]>(loadFromStorage);

  const addCustomPlayer = useCallback((player: Player) => {
    setCustomPlayers(prev => {
      const updated = [player, ...prev];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeCustomPlayer = useCallback((id: number) => {
    setCustomPlayers(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  return { customPlayers, addCustomPlayer, removeCustomPlayer };
}
