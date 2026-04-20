export type CardTier = "legend" | "gold" | "silver" | "bronze";

export function getCardTier(overall: number, isLegend?: boolean): CardTier {
  if (isLegend) return "legend";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}