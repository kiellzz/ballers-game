import type {
  GoalkeeperMatchPlayer,
  MatchActors,
  MatchPlayer,
  MatchTeam,
  PossessionSide,
  SetPieceType,
} from "../matchTypes";

type OutfieldPlayer = Extract<MatchPlayer, { role: "outfield" }>;

interface SelectSetPiecePlayersParams {
  setPieceType: SetPieceType;
  possession: PossessionSide;
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
  unavailableUserPlayerIds?: Set<number>;
  unavailableOpponentPlayerIds?: Set<number>;
  preferredTakerId?: number | null;
  random?: () => number;
}

export function selectSetPiecePlayers(
  params: SelectSetPiecePlayersParams
): MatchActors {
  const {
    setPieceType,
    possession,
    userTeam,
    opponentTeam,
    unavailableUserPlayerIds = new Set<number>(),
    unavailableOpponentPlayerIds = new Set<number>(),
    preferredTakerId = null,
    random = Math.random,
  } = params;

  const userGoalkeeper = getGoalkeeper(userTeam);
  const opponentGoalkeeper = getGoalkeeper(opponentTeam);

  const attackingTeam = possession === "user" ? userTeam : opponentTeam;
  const defendingTeam = possession === "user" ? opponentTeam : userTeam;
  const attackingUnavailableIds =
    possession === "user" ? unavailableUserPlayerIds : unavailableOpponentPlayerIds;
  const defendingUnavailableIds =
    possession === "user" ? unavailableOpponentPlayerIds : unavailableUserPlayerIds;

  const taker = pickSetPieceTaker({
    team: attackingTeam,
    unavailablePlayerIds: attackingUnavailableIds,
    setPieceType,
    preferredTakerId,
    random,
  });

  const primaryDefender = pickPrimaryDefender({
    team: defendingTeam,
    unavailablePlayerIds: defendingUnavailableIds,
    setPieceType,
    random,
  });

  const attackingSupport = pickAttackingSupport({
    team: attackingTeam,
    unavailablePlayerIds: attackingUnavailableIds,
    setPieceType,
    takerId: taker.id,
    random,
  });

  const defendingSupport = pickDefendingSupport({
    team: defendingTeam,
    unavailablePlayerIds: defendingUnavailableIds,
    setPieceType,
    primaryDefenderId: primaryDefender.id,
    random,
  });

  if (possession === "user") {
    return {
      userPlayer: taker,
      opponentPlayer: primaryDefender,
      userGoalkeeper,
      opponentGoalkeeper,
      supportUserPlayer: attackingSupport,
      supportOpponentPlayer: defendingSupport,
    };
  }

  return {
    userPlayer: primaryDefender,
    opponentPlayer: taker,
    userGoalkeeper,
    opponentGoalkeeper,
    supportUserPlayer: defendingSupport,
    supportOpponentPlayer: attackingSupport,
  };
}

function pickSetPieceTaker(params: {
  team: MatchTeam;
  unavailablePlayerIds: Set<number>;
  setPieceType: SetPieceType;
  preferredTakerId?: number | null;
  random: () => number;
}): OutfieldPlayer {
  const {
    team,
    unavailablePlayerIds,
    setPieceType,
    preferredTakerId = null,
    random,
  } = params;

  if (preferredTakerId !== null && preferredTakerId !== undefined) {
    const preferred = getOutfieldPlayers(team, unavailablePlayerIds).find(
      (player) => player.id === preferredTakerId
    );

    if (preferred) {
      return preferred;
    }
  }

  switch (setPieceType) {
    case "corner":
      return pickBestCornerTaker(team, unavailablePlayerIds, random);
    case "freekick":
      return pickBestFreeKickTaker(team, unavailablePlayerIds, random);
    case "penalty":
      return pickBestPenaltyTaker(team, unavailablePlayerIds, random);
    default:
      throw new Error(`Invalid set piece for selection: ${setPieceType}`);
  }
}

function pickPrimaryDefender(params: {
  team: MatchTeam;
  unavailablePlayerIds: Set<number>;
  setPieceType: SetPieceType;
  random: () => number;
}): MatchPlayer {
  const { team, unavailablePlayerIds, setPieceType, random } = params;

  switch (setPieceType) {
    case "penalty":
    case "freekick":
      return getGoalkeeper(team);
    case "corner":
      return pickBestCornerDefender(team, unavailablePlayerIds, random);
    default:
      throw new Error("Invalid set piece for primary defender.");
  }
}

function pickAttackingSupport(params: {
  team: MatchTeam;
  unavailablePlayerIds: Set<number>;
  setPieceType: SetPieceType;
  takerId: number;
  random: () => number;
}): MatchPlayer | null {
  const { team, unavailablePlayerIds, setPieceType, takerId, random } = params;

  switch (setPieceType) {
    case "corner":
      return pickBestShortCornerReceiver(
        team,
        unavailablePlayerIds,
        random,
        takerId
      );
    case "freekick":
    case "penalty":
      return null;
    default:
      return null;
  }
}

function pickDefendingSupport(params: {
  team: MatchTeam;
  unavailablePlayerIds: Set<number>;
  setPieceType: SetPieceType;
  primaryDefenderId: number;
  random: () => number;
}): MatchPlayer | null {
  const {
    team,
    unavailablePlayerIds,
    setPieceType,
    primaryDefenderId,
    random,
  } = params;

  switch (setPieceType) {
    case "corner":
      return pickBestCornerDefender(
        team,
        unavailablePlayerIds,
        random,
        primaryDefenderId
      );
    case "freekick":
      return pickWallPlayer(
        team,
        unavailablePlayerIds,
        random,
        primaryDefenderId
      );
    case "penalty":
      return null;
    default:
      return null;
  }
}

function pickBestPenaltyTaker(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>,
  random: () => number
): OutfieldPlayer {
  const players = getOutfieldPlayers(team, unavailablePlayerIds);

  if (players.length === 0) {
    throw new Error(`Team "${team.teamName}" has no outfield players.`);
  }

  const ranked = players
    .map((player) => {
      const takerPenalty = getPenaltyRating(player);

      return {
        player,
        value:
          player.stats.shooting * 0.38 +
          player.overall * 0.22 +
          takerPenalty * 0.4,
      };
    })
    .sort((a, b) => b.value - a.value);

  const bestValue = ranked[0].value;
  const tied = ranked.filter((entry) => Math.abs(entry.value - bestValue) < 1);

  return tied[Math.floor(random() * tied.length)]?.player ?? ranked[0].player;
}

function pickBestFreeKickTaker(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>,
  random: () => number
): OutfieldPlayer {
  const players = getOutfieldPlayers(team, unavailablePlayerIds);

  if (players.length === 0) {
    throw new Error(`Team "${team.teamName}" has no outfield players.`);
  }

  const ranked = players
    .map((player) => ({
      player,
      value:
        player.stats.shooting * 0.58 +
        player.stats.passing * 0.34 +
        player.overall * 0.08,
    }))
    .sort((a, b) => b.value - a.value);

  const bestValue = ranked[0].value;
  const tied = ranked.filter((entry) => Math.abs(entry.value - bestValue) < 1);

  return tied[Math.floor(random() * tied.length)]?.player ?? ranked[0].player;
}

function pickBestCornerTaker(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>,
  random: () => number
): OutfieldPlayer {
  const players = getOutfieldPlayers(team, unavailablePlayerIds);

  if (players.length === 0) {
    throw new Error(`Team "${team.teamName}" has no outfield players.`);
  }

  const ranked = players
    .map((player) => ({
      player,
      value:
        player.stats.passing * 0.7 +
        player.overall * 0.2 +
        player.stats.shooting * 0.1,
    }))
    .sort((a, b) => b.value - a.value);

  const bestValue = ranked[0].value;
  const tied = ranked.filter((entry) => Math.abs(entry.value - bestValue) < 1);

  return tied[Math.floor(random() * tied.length)]?.player ?? ranked[0].player;
}

function pickBestCornerDefender(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>,
  random: () => number,
  excludePlayerId?: number
): OutfieldPlayer {
  const players = getOutfieldPlayers(team, unavailablePlayerIds).filter(
    (player) => player.id !== excludePlayerId
  );

  if (players.length === 0) {
    throw new Error(`No corner defender available on team "${team.teamName}".`);
  }

  const ranked = players
    .map((player) => ({
      player,
      value:
        player.stats.defending * 1 +
        player.stats.physical * 0.7 +
        (player.height / 2) * 0.8,
    }))
    .sort((a, b) => b.value - a.value);

  const bestValue = ranked[0].value;
  const tied = ranked.filter((entry) => entry.value === bestValue);

  return tied[Math.floor(random() * tied.length)]?.player ?? ranked[0].player;
}

function pickWallPlayer(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>,
  random: () => number,
  excludePlayerId?: number
): OutfieldPlayer {
  const players = getOutfieldPlayers(team, unavailablePlayerIds).filter(
    (player) => player.id !== excludePlayerId
  );

  if (players.length === 0) {
    throw new Error(`No player available for the wall on team "${team.teamName}".`);
  }

  const ranked = players
    .map((player) => ({
      player,
      value:
        player.stats.defending * 0.9 +
        player.stats.physical * 0.6 +
        (player.height / 2) * 0.5,
    }))
    .sort((a, b) => b.value - a.value);

  const bestValue = ranked[0].value;
  const tied = ranked.filter((entry) => entry.value === bestValue);

  return tied[Math.floor(random() * tied.length)]?.player ?? ranked[0].player;
}

function getGoalkeeper(team: MatchTeam): GoalkeeperMatchPlayer {
  const goalkeeper = team.starters.find(
    (player): player is GoalkeeperMatchPlayer => player.role === "goalkeeper"
  );

  if (!goalkeeper) {
    throw new Error(`Team "${team.teamName}" has no goalkeeper defined.`);
  }

  return goalkeeper;
}

function getOutfieldPlayers(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>
): OutfieldPlayer[] {
  return team.starters.filter(
    (player): player is OutfieldPlayer =>
      player.role === "outfield" && !unavailablePlayerIds.has(player.id)
  );
}

function getPenaltyRating(player: OutfieldPlayer): number {
  const statsWithPenalty = player.stats as typeof player.stats & {
    penalty?: number;
  };

  return statsWithPenalty.penalty ?? player.stats.shooting;
}

export function pickBestShortCornerReceiver(
  team: MatchTeam,
  unavailablePlayerIds: Set<number>,
  random: () => number = Math.random,
  excludePlayerId?: number
): OutfieldPlayer {
  const players = getOutfieldPlayers(team, unavailablePlayerIds).filter(
    (player) => player.id !== excludePlayerId
  );

  if (players.length === 0) {
    throw new Error(
      `No short-corner receiver available on team "${team.teamName}".`
    );
  }

  const ranked = players
    .map((player) => ({
      player,
      value: player.stats.dribbling,
      overall: player.overall,
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return b.overall - a.overall;
    });

  const bestValue = ranked[0].value;
  const tied = ranked.filter((entry) => entry.value === bestValue);

  return tied[Math.floor(random() * tied.length)]?.player ?? ranked[0].player;
}
