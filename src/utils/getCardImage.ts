import type { Player } from "../types/PlayerTypes";
import { getCardTier, type CardTier } from "./getCardTier";

const cardBackgroundMap: Record<CardTier, string> = {
  legend: "/images/cards/legendcard.png",
  gold: "/images/cards/goldcard.png",
  silver: "/images/cards/silvercard.png",
  bronze: "/images/cards/bronzecard.png",
};

const cardFlipImageMap: Record<CardTier, string> = {
  legend: "/images/cards/legendflip.png",
  gold: "/images/cards/goldflip.png",
  silver: "/images/cards/silverflip.png",
  bronze: "/images/cards/bronzeflip.png",
};

export function getCardBackgroundImage(player: Pick<Player, "overall" | "isLegend" | "isWCCard">): string {
  if (player.isWCCard) {
    return "/images/cards/wccard.png";
  }

  return cardBackgroundMap[getCardTier(player.overall, player.isLegend)];
}

export function getCardFlipImage(player: Pick<Player, "overall" | "isLegend" | "isWCCard">): string {
  if (player.isWCCard) {
    return "/images/cards/wcflip.png";
  }

  return cardFlipImageMap[getCardTier(player.overall, player.isLegend)];
}
