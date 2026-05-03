import type { Player } from "../types/PlayerTypes";
import { FORMATIONS, type FormationKey } from "../utils/formations";
import { playersData } from "../data/PlayersData";
import { canPlayerPlayInPosition } from "../utils/playerValidation";

export interface OpponentTeam {
  id: string;
  name: string;
  formation: FormationKey;
  players: Player[];
  logo?: string;
}

// Embaralhamento Fisher-Yates — garante ordem diferente a cada chamada
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Formações agrupadas por tier para variar sem quebrar a média
const TIER_FORMATIONS: Record<string, FormationKey[]> = {
  low: [
    "4-4-2", "4-4-2 (2)", "4-4-2 (3)",
    "4-3-3", "4-3-3 (2)", "4-3-3 (3)", "4-3-3 (4)",
    "4-2-4", "4-1-2-1-2",
  ],
  mid: [
    "4-3-3", "4-3-3 (2)", "4-3-3 (3)",
    "4-4-2", "4-4-2 (2)",
    "3-4-3", "3-5-2", "3-5-2 (2)", "3-5-2 (3)",
    "5-2-3",
  ],
  high: [
    "3-5-2", "3-5-2 (2)", "3-5-2 (3)",
    "4-3-3", "4-3-3 (2)", "4-3-3 (4)",
    "5-3-2", "5-3-2 (2)", "5-3-2 (3)",
    "5-2-3", "3-4-3",
  ],
  elite: [
    "4-3-3", "4-3-3 (2)", "4-3-3 (3)", "4-3-3 (4)",
    "3-4-3", "3-5-2", "3-5-2 (2)",
    "5-2-3", "4-1-2-1-2",
  ],
};

const createRandomTeam = (
  id: string,
  name: string,
  tier: keyof typeof TIER_FORMATIONS,
  minOvrTarget: number,
  maxOvrTarget: number
): OpponentTeam => {
  // Sorteia a formação dentro do tier
  const formationKey = pickRandom(TIER_FORMATIONS[tier]);
  const formation = FORMATIONS[formationKey];

  if (!formation) {
    return createRandomTeam(id, name, tier, minOvrTarget, maxOvrTarget);
  }

  // Pool mais generoso: ±8 OVR em torno do alvo
  const poolMin = minOvrTarget - 8;
  const poolMax = maxOvrTarget + 8;

  // Janela de média aceita também mais larga: ±1.5 em vez de ±0.5
  const acceptMin = minOvrTarget - 1.5;
  const acceptMax = maxOvrTarget + 1.5;

  let finalPlayers: Player[] = [];
  let bestAttempt: Player[] = [];
  let bestDelta = Infinity;
  const targetMid = (minOvrTarget + maxOvrTarget) / 2;
  const MAX_ATTEMPTS = 80;

  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const usedIds = new Set<number>();
    const currentTeam: Player[] = [];

    // Pool embaralhado a cada tentativa — principal fix da repetição
    const poolShuffled = shuffle(
      playersData.filter((p) => p.overall >= poolMin && p.overall <= poolMax)
    );

    for (const targetPos of formation.positions) {
      // Filtra do pool embaralhado os elegíveis para essa posição
      let candidates = poolShuffled.filter(
        (p) => !usedIds.has(p.id) && canPlayerPlayInPosition(p, targetPos)
      );

      // Fallback 1: qualquer jogador dentro do OVR geral, sem restrição de pool
      if (candidates.length === 0) {
        candidates = shuffle(playersData).filter(
          (p) => !usedIds.has(p.id) && canPlayerPlayInPosition(p, targetPos)
        );
      }

      // Fallback 2: qualquer jogador disponível
      if (candidates.length === 0) {
        candidates = playersData.filter((p) => !usedIds.has(p.id));
      }

      const chosen = candidates[0];
      currentTeam.push({ ...chosen, position: targetPos });
      usedIds.add(chosen.id);
    }

    const avg =
      currentTeam.reduce((acc, p) => acc + p.overall, 0) / currentTeam.length;
    const delta = Math.abs(avg - targetMid);

    // Guarda a melhor tentativa mesmo que não passe no critério
    if (delta < bestDelta) {
      bestDelta = delta;
      bestAttempt = currentTeam;
    }

    if (avg >= acceptMin && avg <= acceptMax) {
      finalPlayers = currentTeam;
      break;
    }
  }

  // Se nenhuma tentativa passou, usa a mais próxima da média alvo
  if (finalPlayers.length === 0) {
    finalPlayers = bestAttempt;
  }

  return { id, name, formation: formationKey, players: finalPlayers };
};

export const MOCK_OPPONENTS: OpponentTeam[] = [
  createRandomTeam("team_1", "Challengers FC", "low",   80, 81),
  createRandomTeam("team_2", "Elite Pro",      "mid",   84, 85),
  createRandomTeam("team_3", "Champions Squad","high",  87, 88),
  createRandomTeam("team_4", "All-Stars Random","elite", 90, 91),
];

export const generateOpponents = (): OpponentTeam[] => [
  createRandomTeam("team_1", "Challengers FC", "low",   80, 81),
  createRandomTeam("team_2", "Elite Pro",      "mid",   84, 85),
  createRandomTeam("team_3", "Champions Squad","high",  87, 88),
  createRandomTeam("team_4", "All-Stars Random","elite", 90, 91),
];