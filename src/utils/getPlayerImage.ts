export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getPlayerImage(name: string): string {
  const normalizedName = normalizePlayerName(name);
  return `/images/players/${normalizedName}.webp`;
}