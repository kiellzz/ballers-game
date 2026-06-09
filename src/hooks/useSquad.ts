import type { Player } from '../types/PlayerTypes';
import type { FormationKey } from '../utils/formations';
import { hasDuplicatePlayers } from '../utils/playerValidation';
import { playSelect } from '../utils/sound';

interface SquadData {
  formation: FormationKey;
  pitch: (Player | null)[];
  bench: (Player | null)[];
  updatedAt: string;
}

export function useSquad(
  // [] default for total security agaisnt undefined
  pitchPlayers: (Player | null)[] = [],
  benchPlayers: (Player | null)[] = []
) {
  const selectedPlayers = [...pitchPlayers, ...benchPlayers];
  const hasDuplicateSquadPlayers = hasDuplicatePlayers(selectedPlayers);

  const isTeamComplete =
    (pitchPlayers?.length === 11) &&
    (pitchPlayers?.every(p => p !== null) ?? false) &&
    (benchPlayers?.length > 0) && 
    (benchPlayers?.every(p => p !== null) ?? false) &&
    !hasDuplicateSquadPlayers;

  const saveProgress = (
    pitch: (Player | null)[],
    bench: (Player | null)[],
    formation: FormationKey
  ) => {
    if (hasDuplicatePlayers([...pitch, ...bench])) {
      console.warn("Cannot save squad: duplicate player identity found.");
      return false;
    }

    try {
      const squadData: SquadData = {
        formation,
        pitch,
        bench,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('ballers_saved_progress', JSON.stringify(squadData));
      playSelect(0.5);

      return true;
    } catch (error) {
      console.error("Failed to save progress:", error);
      return false;
    }
  };

  const saveAndPlay = (
    pitch: (Player | null)[],
    bench: (Player | null)[],
    formation: FormationKey
  ) => {
    if (hasDuplicatePlayers([...pitch, ...bench])) {
      console.warn("Cannot start match: duplicate player identity found.");
      return false;
    }

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
