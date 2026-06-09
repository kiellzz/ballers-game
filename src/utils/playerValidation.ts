import type { Player, Position } from '../types/PlayerTypes';

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export const canPlayerPlayInPosition = (player: Player, slotPosition: Position): boolean => {
  if (!player || !slotPosition) return false;

  // Normaliza as strings para evitar erro de Maiúscula/Minúscula ou espaços
  const targetPos = slotPosition.toString().trim().toUpperCase();
  const mainPos = player.position.toString().trim().toUpperCase();

  // 1. Verifica posição principal
  if (mainPos === targetPos) return true;

  // 2. Verifica posições secundárias com check de segurança e normalização
  if (player.secondaryPositions && Array.isArray(player.secondaryPositions)) {
    return player.secondaryPositions.some(
      pos => pos.toString().trim().toUpperCase() === targetPos
    );
  }

  return false;
};

export function isSamePlayerIdentity(playerA: Player, playerB: Player): boolean {
  return (
    playerA.id === playerB.id ||
    normalizePlayerName(playerA.name) === normalizePlayerName(playerB.name)
  );
}

export function isPlayerAlreadySelected(player: Player, selectedPlayers: Player[]): boolean {
  return selectedPlayers.some(selectedPlayer => isSamePlayerIdentity(player, selectedPlayer));
}

export function findDuplicatePlayer(players: (Player | null)[]): Player | null {
  const selectedPlayers = players.filter((player): player is Player => player !== null);
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();

  for (const player of selectedPlayers) {
    const normalizedName = normalizePlayerName(player.name);

    if (seenIds.has(player.id) || seenNames.has(normalizedName)) {
      return player;
    }

    seenIds.add(player.id);
    seenNames.add(normalizedName);
  }

  return null;
}

export function hasDuplicatePlayers(players: (Player | null)[]): boolean {
  return findDuplicatePlayer(players) !== null;
}
