import { normalizePlayerName } from "./playerValidation";

export function getPlayerImage(name: string, isWCCard?: boolean): string {
  const normalizedName = normalizePlayerName(name);
  const folder = isWCCard ? "wc/" : "";
  return `/images/players/${folder}${normalizedName}.webp`;
}
