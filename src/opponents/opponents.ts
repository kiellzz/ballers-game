import type { Player, Position } from "../types/PlayerTypes";
import { FORMATIONS, type FormationKey } from "../utils/formations";
import { playersData } from "../data/PlayersData";
import {
  canPlayerPlayInPosition,
  normalizePlayerName,
} from "../utils/playerValidation";

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

const playersByPosition = new Map<Position, Player[]>();
const normalizedPlayerNames = new WeakMap<Player, string>();

function getNormalizedPlayerName(player: Player): string {
  const cachedName = normalizedPlayerNames.get(player);
  if (cachedName) return cachedName;

  const normalizedName = normalizePlayerName(player.name);
  normalizedPlayerNames.set(player, normalizedName);
  return normalizedName;
}

function getPlayersForPosition(position: Position): Player[] {
  const cachedPlayers = playersByPosition.get(position);
  if (cachedPlayers) return cachedPlayers;

  const eligiblePlayers = playersData.filter((player) =>
    canPlayerPlayInPosition(player, position)
  );
  playersByPosition.set(position, eligiblePlayers);
  return eligiblePlayers;
}

function addSelectedPlayer(
  player: Player,
  selectedIds: Set<number>,
  selectedNames: Set<string>
): void {
  selectedIds.add(player.id);
  selectedNames.add(getNormalizedPlayerName(player));
}

function isSelectedPlayer(
  player: Player,
  selectedIds: Set<number>,
  selectedNames: Set<string>
): boolean {
  return (
    selectedIds.has(player.id) ||
    selectedNames.has(getNormalizedPlayerName(player))
  );
}

function pickRandomAvailable(
  candidates: Player[],
  selectedIds: Set<number>,
  selectedNames: Set<string>
): Player | undefined {
  if (candidates.length === 0) return undefined;

  const startIndex = Math.floor(Math.random() * candidates.length);

  for (let offset = 0; offset < candidates.length; offset++) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    if (!isSelectedPlayer(candidate, selectedIds, selectedNames)) {
      return candidate;
    }
  }

  return undefined;
}

function buildOpponentBench(params: {
  formationPositions: Position[];
  usedPlayers: Player[];
  poolMin: number;
  poolMax: number;
}): Player[] {
  const { formationPositions, usedPlayers, poolMin, poolMax } = params;
  const selectedIds = new Set<number>();
  const selectedNames = new Set<string>();
  usedPlayers.forEach((player) =>
    addSelectedPlayer(player, selectedIds, selectedNames)
  );

  const pool = shuffle(
    playersData.filter(
      (player) =>
        player.overall >= poolMin &&
        player.overall <= poolMax
    )
  );
  const bench: Player[] = [];
  const benchTargets = buildOpponentBenchTargets(formationPositions);

  for (const targetPosition of benchTargets) {
    const preferredCandidates = getPlayersForPosition(targetPosition).filter(
      (player) => player.overall >= poolMin && player.overall <= poolMax
    );
    const nextPlayer =
      pickRandomAvailable(preferredCandidates, selectedIds, selectedNames) ??
      pickRandomAvailable(
        getPlayersForPosition(targetPosition),
        selectedIds,
        selectedNames
      ) ??
      pickRandomAvailable(playersData, selectedIds, selectedNames);

    if (!nextPlayer) {
      continue;
    }

    bench.push(nextPlayer);
    addSelectedPlayer(nextPlayer, selectedIds, selectedNames);

    if (bench.length >= OPPONENT_BENCH_SIZE) {
      return bench;
    }
  }

  if (bench.length >= OPPONENT_BENCH_SIZE) {
    return bench;
  }

  for (const player of pool) {
    if (isSelectedPlayer(player, selectedIds, selectedNames)) {
      continue;
    }

    bench.push(player);
    addSelectedPlayer(player, selectedIds, selectedNames);

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

export type OpponentTier = keyof typeof TIER_FORMATIONS;

type CreateOpponentOptions = {
  strictAverage?: boolean;
};

export const createRandomTeam = (
  id: string,
  name: string,
  tier: OpponentTier,
  minOvrTarget: number,
  maxOvrTarget: number,
  options: CreateOpponentOptions = {},
): OpponentTeam => {
  // Sorteia a formação dentro do tier
  const formationKey = pickRandom(TIER_FORMATIONS[tier]);
  const formation = FORMATIONS[formationKey];

  if (!formation) {
    return createRandomTeam(id, name, tier, minOvrTarget, maxOvrTarget, options);
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
  const MAX_ATTEMPTS = options.strictAverage ? 160 : 48;
  const preferredPlayersByPosition = new Map<Position, Player[]>();

  formation.positions.forEach((position) => {
    if (preferredPlayersByPosition.has(position)) return;

    preferredPlayersByPosition.set(
      position,
      getPlayersForPosition(position).filter(
        (player) => player.overall >= poolMin && player.overall <= poolMax
      )
    );
  });

  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const currentTeam: Player[] = [];
    const selectedIds = new Set<number>();
    const selectedNames = new Set<string>();

    for (const targetPos of formation.positions) {
      const chosen =
        pickRandomAvailable(
          preferredPlayersByPosition.get(targetPos) ?? [],
          selectedIds,
          selectedNames
        ) ??
        pickRandomAvailable(
          getPlayersForPosition(targetPos),
          selectedIds,
          selectedNames
        ) ??
        pickRandomAvailable(playersData, selectedIds, selectedNames);

      if (!chosen) break;

      const opponentPlayer = { ...chosen, position: targetPos };
      currentTeam.push(opponentPlayer);
      addSelectedPlayer(opponentPlayer, selectedIds, selectedNames);
    }

    if (currentTeam.length !== formation.positions.length) continue;

    const avg =
      currentTeam.reduce((acc, p) => acc + p.overall, 0) / currentTeam.length;
    const delta = Math.abs(avg - targetMid);

    // Guarda a melhor tentativa mesmo que não passe no critério
    if (delta < bestDelta) {
      bestDelta = delta;
      bestAttempt = currentTeam;
    }

    const isAccepted = options.strictAverage
      ? Math.round(avg) >= minOvrTarget && Math.round(avg) <= maxOvrTarget
      : avg >= acceptMin && avg <= acceptMax;

    if (isAccepted) {
      finalPlayers = currentTeam;
      break;
    }
  }

  // Se nenhuma tentativa passou, usa a mais próxima da média alvo
  if (finalPlayers.length === 0) {
    finalPlayers = bestAttempt;
  }

  const bench = buildOpponentBench({
    formationPositions: formation.positions,
    usedPlayers: finalPlayers,
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
