import type { Player } from '../types/PlayerTypes';
import type { FormationKey } from '../utils/formations';
import { playSelect } from '../utils/sound';

interface SquadData {
  formation: FormationKey;
  pitch: (Player | null)[];
  bench: (Player | null)[];
  updatedAt: string;
}

export function useSquad(
  // Mantemos o default [] para segurança total contra undefined
  pitchPlayers: (Player | null)[] = [],
  benchPlayers: (Player | null)[] = []
) {

  // ─── Validação de Time Completo ──────────────────────────────────────────
  // Adicionei a verificação de .length para garantir que o time não esteja 
  // "vazio" (apenas um array de nulos) antes de validar os jogadores.
  const isTeamComplete =
    (pitchPlayers?.length === 11) &&
    (pitchPlayers?.every(p => p !== null) ?? false) &&
    (benchPlayers?.length > 0) && // Opcional: verifique se há reservas se quiser exigir
    (benchPlayers?.every(p => p !== null) ?? false);

  // ─── 1. SALVAR PROGRESSO (Livre de travas) ────────────────────────────────
  const saveProgress = (
    pitch: (Player | null)[],
    bench: (Player | null)[],
    formation: FormationKey
  ) => {
    try {
      const squadData: SquadData = {
        formation,
        pitch,
        bench,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('ballers_saved_progress', JSON.stringify(squadData));
      playSelect(0.5);

      console.log("💾 Squad progress saved with", pitch.filter(p => p).length, "players on pitch.");
      return true;
    } catch (error) {
      console.error("Failed to save progress:", error);
      return false;
    }
  };

  // ─── 2. SALVAR E JOGAR (Validação rigorosa) ───────────────────────────────
  const saveAndPlay = (
    pitch: (Player | null)[],
    bench: (Player | null)[],
    formation: FormationKey
  ) => {
    // IMPORTANTE: Aqui usamos o isTeamComplete que foi calculado no topo
    if (!isTeamComplete) {
      console.warn("⚠️ Cannot start match: Squad is incomplete.");
      return false;
    }

    try {
      const squadData: SquadData = {
        formation,
        pitch,
        bench,
        updatedAt: new Date().toISOString()
      };

      // Salva no 'active_squad' que é o que a sua PreMatch vai ler
      localStorage.setItem('ballers_active_squad', JSON.stringify(squadData));
      playSelect(0.8);
      return true;
    } catch (error) {
      console.error("Failed to save active squad:", error);
      return false;
    }
  };

  return {
    isTeamComplete,
    saveProgress,
    saveAndPlay
  };
}