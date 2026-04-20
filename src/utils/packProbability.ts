import type { Player } from "../types/PlayerTypes";

// Pesos atualizados com a nova categoria Elite
const WEIGHTS = {
  legend: 0.5,      // Ídolos
  goldSpecial: 3.5, // 86+ (raro)
  goldElite: 16,    // 83-86 (Destaques)
  gold: 70,         // 75-82 (Base)
  silver: 7,       // 65-74
  bronze: 3,       // < 65
};

type WeightKey = keyof typeof WEIGHTS;

export function drawPack(players: Player[], packSize = 5): Player[] {
  // Inicializa os buckets
  const buckets: Record<WeightKey, Player[]> = {
    legend: [],
    goldSpecial: [],
    goldElite: [],
    gold: [],
    silver: [],
    bronze: []
  };

  // Distribui os jogadores nos novos intervalos
  players.forEach(p => {
    if (p.isLegend) buckets.legend.push(p);
    else if (p.overall >= 86) buckets.goldSpecial.push(p);
    else if (p.overall >= 83) buckets.goldElite.push(p);
    else if (p.overall >= 75) buckets.gold.push(p);
    else if (p.overall >= 65) buckets.silver.push(p);
    else buckets.bronze.push(p);
  });

  const drawn: Player[] = [];
  const usedIds = new Set<number>();

  function getWeightedTier(): WeightKey {
    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;

    for (const [key, weight] of Object.entries(WEIGHTS) as [WeightKey, number][]) {
      rand -= weight;
      if (rand <= 0) return key;
    }
    return "gold";
  }

  for (let i = 0; i < packSize; i++) {
    let tier = getWeightedTier();

    // Tenta pegar do tier sorteado, se não houver ninguém disponível, 
    // tenta o tier imediatamente abaixo (fallback em cascata)
    const tiers: WeightKey[] = ["legend", "goldSpecial", "goldElite", "gold", "silver", "bronze"];
    let currentTierIndex = tiers.indexOf(tier);
    let player: Player | null = null;

    while (currentTierIndex < tiers.length && !player) {
      const activeTier = tiers[currentTierIndex];
      const available = buckets[activeTier].filter(p => !usedIds.has(p.id));

      if (available.length > 0) {
        player = available[Math.floor(Math.random() * available.length)];
      }
      currentTierIndex++;
    }

    if (player) {
      usedIds.add(player.id);
      drawn.push(player);
    }
  }

  // Ordena por overall (descendente) para o melhor jogador ser o destaque do pack
  return drawn.sort((a, b) => b.overall - a.overall);
}