import type { Player, Position } from "../types/PlayerTypes";
import { FORMATIONS, type FormationKey } from "../utils/formations";
import { playersData } from "../data/PlayersData";
import { canPlayerPlayInPosition } from "../utils/playerValidation";

export interface OpponentTeam {
  id: string;
  name: string;
  formation: FormationKey;
  players: Player[];
  bench: Player[];
  logo?: string;
}

const OPPONENT_BENCH_SIZE = 5;

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

function buildOpponentBench(params: {
  formationPositions: Position[];
  usedIds: Set<number>;
  poolMin: number;
  poolMax: number;
}): Player[] {
  const { formationPositions, usedIds, poolMin, poolMax } = params;
  const pool = shuffle(
    playersData.filter(
      (player) =>
        !usedIds.has(player.id) &&
        player.overall >= poolMin &&
        player.overall <= poolMax
    )
  );
  const bench: Player[] = [];
  const benchTargets = buildOpponentBenchTargets(formationPositions);

  for (const targetPosition of benchTargets) {
    const nextPlayer =
      pool.find(
        (player) =>
          !usedIds.has(player.id) &&
          canPlayerPlayInPosition(player, targetPosition)
      ) ??
      shuffle(playersData).find(
        (player) =>
          !usedIds.has(player.id) &&
          canPlayerPlayInPosition(player, targetPosition)
      ) ??
      playersData.find((player) => !usedIds.has(player.id));

    if (!nextPlayer) {
      continue;
    }

    bench.push(nextPlayer);
    usedIds.add(nextPlayer.id);

    if (bench.length >= OPPONENT_BENCH_SIZE) {
      return bench;
    }
  }

  if (bench.length >= OPPONENT_BENCH_SIZE) {
    return bench;
  }

  for (const player of pool) {
    if (usedIds.has(player.id)) {
      continue;
    }

    bench.push(player);
    usedIds.add(player.id);

    if (bench.length >= OPPONENT_BENCH_SIZE) {
      break;
    }
  }

  return bench;
}

function buildOpponentBenchTargets(formationPositions: Position[]): Position[] {
  const firstIndexByPosition = new Map<Position, number>();
  const countsByPosition = new Map<Position, number>();

  formationPositions.forEach((position, index) => {
    if (position === "GK") {
      return;
    }

    if (!firstIndexByPosition.has(position)) {
      firstIndexByPosition.set(position, index);
    }

    countsByPosition.set(position, (countsByPosition.get(position) ?? 0) + 1);
  });

  return [...countsByPosition.entries()]
    .sort((a, b) => {
      const countDelta = b[1] - a[1];

      if (countDelta !== 0) {
        return countDelta;
      }

      return (
        (firstIndexByPosition.get(a[0]) ?? Number.MAX_SAFE_INTEGER) -
        (firstIndexByPosition.get(b[0]) ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .map(([position]) => position)
    .slice(0, OPPONENT_BENCH_SIZE);
}

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

  const usedIds = new Set(finalPlayers.map((player) => player.id));
  const bench = buildOpponentBench({
    formationPositions: formation.positions,
    usedIds,
    poolMin,
    poolMax,
  });

  return { id, name, formation: formationKey, players: finalPlayers, bench };
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
