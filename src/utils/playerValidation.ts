import type { Player, Position } from '../types/PlayerTypes';

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