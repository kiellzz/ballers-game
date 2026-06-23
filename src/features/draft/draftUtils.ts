import type { Player } from "../../types/PlayerTypes";
import type { OpponentTeam } from "../../opponents/opponents";
import {
  generateDraftOpponents,
  isDraftRoundIndex,
  type DraftRoundIndex,
} from "../../opponents/draftOpponents";
import { FORMATIONS, FORMATION_KEYS } from "../../utils/formations";
import type { FormationKey } from "../../utils/formations";
import type { Position } from "../../types/PlayerTypes";
import { isSamePlayerIdentity } from "../../utils/playerValidation";
import { canPlayerPlayInPosition } from "../../utils/playerValidation";
import {
  createEmptyDraftCampaign,
  normalizeDraftCampaign,
  type DraftCampaignState,
} from "./draftCampaign";

export const DRAFT_PROGRESS_STORAGE_KEY = "ballers_draft_progress";
export const DRAFT_ACTIVE_SQUAD_STORAGE_KEY = "ballers_draft_active_squad";
export const DRAFT_MATCH_RELOAD_PENDING_KEY = "ballers_draft_match_reload_pending";
export const DRAFT_MATCH_RELOAD_WARNING_MESSAGE =
  "If you reload the page, all draft campaign progress will be lost. Do you still want to reload?";
export const DRAFT_BENCH_SIZE = 5;
export const DRAFT_PLAYER_OPTION_COUNT = 4;
export const DRAFT_FORMATION_OPTION_COUNT = 3;

export type DraftZone = "pitch" | "bench";

export type DraftPick = {
  zone: DraftZone;
  index: number;
  targetPosition: Position;
  optionIds: number[];
};

export type DraftProgress = {
  version: 3;
  formationChoices: FormationKey[];
  formation: FormationKey | null;
  pitchPlayerIds: (number | null)[];
  benchPlayerIds: (number | null)[];
  activePick: DraftPick | null;
  opponents: OpponentTeam[];
  currentRound: DraftRoundIndex;
  campaign: DraftCampaignState;
  updatedAt: string;
};

function isFormationKey(value: unknown): value is FormationKey {
  return typeof value === "string" && FORMATION_KEYS.includes(value as FormationKey);
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function drawFormationChoices(random: () => number = Math.random): FormationKey[] {
  return shuffle(FORMATION_KEYS, random).slice(0, DRAFT_FORMATION_OPTION_COUNT);
}

export function getDraftPlayerWeight(player: Player): number {
  return Math.max(1, 100 - player.overall);
}

export function drawWeightedPlayers(
  players: readonly Player[],
  count: number = DRAFT_PLAYER_OPTION_COUNT,
  random: () => number = Math.random,
): Player[] {
  let available = [...players];
  const selected: Player[] = [];

  while (available.length > 0 && selected.length < count) {
    const totalWeight = available.reduce(
      (total, player) => total + getDraftPlayerWeight(player),
      0,
    );
    let target = random() * totalWeight;
    let selectedIndex = available.length - 1;

    for (let index = 0; index < available.length; index += 1) {
      target -= getDraftPlayerWeight(available[index]);
      if (target < 0) {
        selectedIndex = index;
        break;
      }
    }

    const pickedPlayer = available[selectedIndex];
    selected.push(pickedPlayer);
    available = available.filter(
      (player) => !isSamePlayerIdentity(player, pickedPlayer),
    );
  }

  return selected;
}

export function drawDraftBenchPosition(
  formationPositions: readonly Position[],
  availablePlayers: readonly Player[],
  random: () => number = Math.random,
): Position | null {
  const eligiblePositions = [...new Set(formationPositions)].filter((position) =>
    availablePlayers.some((player) => canPlayerPlayInPosition(player, position)),
  );

  if (eligiblePositions.length === 0) return null;

  const index = Math.floor(random() * eligiblePositions.length);
  return eligiblePositions[index] ?? eligiblePositions[0];
}

export function createDraftProgress(): DraftProgress {
  return {
    version: 3,
    formationChoices: drawFormationChoices(),
    formation: null,
    pitchPlayerIds: Array(11).fill(null),
    benchPlayerIds: Array(DRAFT_BENCH_SIZE).fill(null),
    activePick: null,
    opponents: generateDraftOpponents(),
    currentRound: 0,
    campaign: createEmptyDraftCampaign(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadDraftProgress(): DraftProgress | null {
  try {
    const rawProgress = localStorage.getItem(DRAFT_PROGRESS_STORAGE_KEY);
    if (!rawProgress) return null;

    const parsed = JSON.parse(rawProgress) as Partial<DraftProgress>;
    const formationChoices = Array.isArray(parsed.formationChoices)
      ? parsed.formationChoices.filter(isFormationKey).slice(0, DRAFT_FORMATION_OPTION_COUNT)
      : [];
    const formation = isFormationKey(parsed.formation) ? parsed.formation : null;
    const opponents =
      Array.isArray(parsed.opponents) && parsed.opponents.length === 4
        ? parsed.opponents
        : generateDraftOpponents();
    const currentRound = isDraftRoundIndex(parsed.currentRound) ? parsed.currentRound : 0;

    if (formationChoices.length !== DRAFT_FORMATION_OPTION_COUNT) return null;
    if (!Array.isArray(parsed.pitchPlayerIds) || parsed.pitchPlayerIds.length !== 11) return null;
    if (!Array.isArray(parsed.benchPlayerIds) || parsed.benchPlayerIds.length !== DRAFT_BENCH_SIZE) return null;

    const normalizeIds = (ids: unknown[]): (number | null)[] =>
      ids.map((id) => typeof id === "number" ? id : null);

    const activePick = parsed.activePick;
    const activePickTargetPosition =
      activePick?.zone === "pitch" && formation
        ? FORMATIONS[formation].positions[activePick.index]
        : activePick?.zone === "bench" &&
            formation &&
            typeof activePick.targetPosition === "string" &&
            FORMATIONS[formation].positions.includes(activePick.targetPosition as Position)
          ? activePick.targetPosition as Position
          : null;
    const normalizedActivePick =
      activePick &&
      (activePick.zone === "pitch" || activePick.zone === "bench") &&
      Number.isInteger(activePick.index) &&
      Array.isArray(activePick.optionIds) &&
      activePickTargetPosition
        ? {
            zone: activePick.zone,
            index: activePick.index,
            targetPosition: activePickTargetPosition,
            optionIds: activePick.optionIds.filter((id): id is number => typeof id === "number"),
          }
        : null;

    return {
      version: 3,
      formationChoices,
      formation,
      pitchPlayerIds: normalizeIds(parsed.pitchPlayerIds),
      benchPlayerIds: normalizeIds(parsed.benchPlayerIds),
      activePick: normalizedActivePick,
      opponents,
      currentRound,
      campaign: normalizeDraftCampaign(parsed.campaign),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveDraftProgress(progress: DraftProgress): void {
  localStorage.setItem(
    DRAFT_PROGRESS_STORAGE_KEY,
    JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }),
  );
}

export function resetDraftProgress(): void {
  localStorage.removeItem(DRAFT_PROGRESS_STORAGE_KEY);
  localStorage.removeItem(DRAFT_ACTIVE_SQUAD_STORAGE_KEY);
}
