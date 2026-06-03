import type {
  ActionType,
  CardType,
  ShotResult,
} from "../matchTypes";
import {
  getCardOutcomeLabel,
  getMatchActionLabel,
  getMatchOutcomeLabel,
} from "./narrator";
import type { MatchHistoryEntry } from "./useMatchEngine";
import type { Player } from "../../types/PlayerTypes";

export interface DuelEventLogEntry {
  id: string;
  kind: "duel";
  minute: number;
  attacker: Player;
  defender: Player;
  attackerPosition?: string;
  defenderPosition?: string;
  action: string;
  outcome: string;
}

export interface CardEventLogEntry {
  id: string;
  kind: "card";
  minute: number;
  player: Player;
  playerPosition?: string;
  action: string;
  outcome: string;
  cardType: Exclude<CardType, "none">;
}

export interface SubstitutionEventLogEntry {
  id: string;
  kind: "substitution";
  minute: number;
  outPlayer: Player;
  inPlayer: Player;
  outPlayerPosition?: string;
  inPlayerPosition?: string;
  outcome: string;
}

export type EventLogEntry =
  | DuelEventLogEntry
  | CardEventLogEntry
  | SubstitutionEventLogEntry;

interface BuildHistoryEventLogEntriesParams {
  entry: MatchHistoryEntry;
  userPlayers: Player[];
  opponentPlayers: Player[];
  userAssignedPositions: Map<string, string>;
  opponentAssignedPositions: Map<string, string>;
}

function findPlayerByName(players: Player[], name?: string | null): Player | null {
  if (!name) {
    return null;
  }

  return players.find((player) => player.name === name) ?? null;
}

function findPlayerById(players: Player[], playerId?: number | null): Player | null {
  if (playerId == null) {
    return null;
  }

  return players.find((player) => Number(player.id) === playerId) ?? null;
}

function shouldUseGoalkeeperAsDefender(params: {
  actionType: ActionType;
  shotOutcome?: ShotResult["outcome"] | null;
}): boolean {
  const { actionType, shotOutcome } = params;

  if (actionType === "rush_save" || actionType === "wait") {
    return true;
  }

  if (shotOutcome && shotOutcome !== "blocked") {
    return true;
  }

  return (
    actionType === "long_shot" ||
    actionType === "finish" ||
    actionType === "header"
  );
}

function buildHistoryDuelEventLogEntry(
  params: BuildHistoryEventLogEntriesParams
): DuelEventLogEntry | null {
  const {
    entry,
    userPlayers,
    opponentPlayers,
    userAssignedPositions,
    opponentAssignedPositions,
  } = params;

  const attackerName = entry.attackerName ?? null;
  const defenderName = shouldUseGoalkeeperAsDefender({
    actionType: entry.actionType,
    shotOutcome: entry.shotOutcome,
  })
    ? entry.goalkeeperName ?? entry.defenderName ?? null
    : entry.defenderName ?? entry.goalkeeperName ?? null;

  if (!attackerName || !defenderName) {
    return null;
  }

  const userAttacker = findPlayerByName(userPlayers, attackerName);
  const opponentAttacker = findPlayerByName(opponentPlayers, attackerName);
  const userDefender = findPlayerByName(userPlayers, defenderName);
  const opponentDefender = findPlayerByName(opponentPlayers, defenderName);

  if (userAttacker && opponentDefender) {
    return {
      id: entry.id,
      kind: "duel",
      minute: entry.minute,
      attacker: userAttacker,
      defender: opponentDefender,
      attackerPosition: userAssignedPositions.get(userAttacker.name),
      defenderPosition: opponentAssignedPositions.get(opponentDefender.name),
      action: getMatchActionLabel(entry.actionType),
      outcome: getMatchOutcomeLabel({
        outcome: entry.outcome,
        shotOutcome: entry.shotOutcome,
      }),
    };
  }

  if (opponentAttacker && userDefender) {
    return {
      id: entry.id,
      kind: "duel",
      minute: entry.minute,
      attacker: opponentAttacker,
      defender: userDefender,
      attackerPosition: opponentAssignedPositions.get(opponentAttacker.name),
      defenderPosition: userAssignedPositions.get(userDefender.name),
      action: getMatchActionLabel(entry.actionType),
      outcome: getMatchOutcomeLabel({
        outcome: entry.outcome,
        shotOutcome: entry.shotOutcome,
      }),
    };
  }

  return null;
}

function buildHistoryCardEventLogEntry(
  params: BuildHistoryEventLogEntriesParams
): CardEventLogEntry | null {
  const {
    entry,
    userPlayers,
    opponentPlayers,
    userAssignedPositions,
    opponentAssignedPositions,
  } = params;

  if (entry.cardType === null || entry.cardedPlayerSide === null) {
    return null;
  }

  const playerPool =
    entry.cardedPlayerSide === "user" ? userPlayers : opponentPlayers;
  const positionMap =
    entry.cardedPlayerSide === "user"
      ? userAssignedPositions
      : opponentAssignedPositions;

  const player =
    findPlayerById(playerPool, entry.cardedPlayerId) ??
    findPlayerByName(playerPool, entry.cardedPlayerName);

  if (!player) {
    return null;
  }

  return {
    id: `${entry.id}-card`,
    kind: "card",
    minute: entry.minute,
    player,
    playerPosition: positionMap.get(player.name),
    action: getMatchActionLabel(entry.actionType),
    outcome: getCardOutcomeLabel(entry.cardType, entry.dismissalType),
    cardType: entry.cardType,
  };
}

export function buildHistoryEventLogEntries(
  params: BuildHistoryEventLogEntriesParams
): EventLogEntry[] {
  const duelEntry = buildHistoryDuelEventLogEntry(params);
  const cardEntry = buildHistoryCardEventLogEntry(params);

  return [duelEntry, cardEntry].filter(
    (
      entry
    ): entry is DuelEventLogEntry | CardEventLogEntry => entry !== null
  );
}
