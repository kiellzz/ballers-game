import type { Player } from "../types/PlayerTypes";

const NAME_PREFIXES = new Set([
  "de", "da", "do", "dos", "das",
  "van", "von", "der", "den",
  "di", "del", "le", "la", "mac"
]);

export function getDisplayName(player: Player): string {
  if (!player?.name) return "";

  if (player.displayFullName) return player.name;

  const parts = player.name.trim().split(/\s+/);

  if (parts.length === 1) return parts[0];

  let startIndex = parts.length - 1;

  while (
    startIndex > 0 &&
    NAME_PREFIXES.has(parts[startIndex - 1].toLowerCase())
  ) {
    startIndex--;
  }

  return parts.slice(startIndex).join(" ");
}