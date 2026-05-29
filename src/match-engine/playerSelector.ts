import type {
  GoalkeeperMatchPlayer,
  Lane,
  MatchActors,
  MatchPlayer,
  MatchTeam,
  PossessionSide,
  Zone,
} from "./matchTypes";

type OutfieldPlayer = Extract<MatchPlayer, { role: "outfield" }>;

interface SelectPlayersForSituationParams {
  zone: Zone;
  lane: Lane;
  possession: PossessionSide;
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
  unavailableUserPlayerIds?: Set<number>;
  unavailableOpponentPlayerIds?: Set<number>;
  forcedUserPlayerId?: number | null;
  forcedOpponentPlayerId?: number | null;
  excludedUserPlayerId?: number | null;
  excludedOpponentPlayerId?: number | null;
  random?: () => number;
}

type PositionGroup =
  | "cb"
  | "fb"
  | "dm"
  | "cm"
  | "am"
  | "wing"
  | "st"
  | "any";

interface TeamPools {
  inPossession: PositionGroup[];
  outOfPossession: PositionGroup[];
  preferGoalkeeperDefender?: boolean;
}

interface WeightedPlayer {
  player: OutfieldPlayer;
  weight: number;
}

export function selectPlayersForSituation(
  params: SelectPlayersForSituationParams
): MatchActors {
  const {
    zone,
    lane,
    possession,
    userTeam,
    opponentTeam,
    unavailableUserPlayerIds = new Set<number>(),
    unavailableOpponentPlayerIds = new Set<number>(),
    forcedUserPlayerId = null,
    forcedOpponentPlayerId = null,
    excludedUserPlayerId = null,
    excludedOpponentPlayerId = null,
    random = Math.random,
  } = params;

  const userGoalkeeper = getGoalkeeper(userTeam);
  const opponentGoalkeeper = getGoalkeeper(opponentTeam);

  if (zone === "atk_goalkeeper") {
    const attacker = pickOutfieldByGroups(
      userTeam,
      ["st", "am", "wing"],
      "center",
      zone,
      "user",
      random,
      excludedUserPlayerId,
      unavailableUserPlayerIds
    );

    return {
      userPlayer: attacker,
      opponentPlayer: opponentGoalkeeper,
      userGoalkeeper,
      opponentGoalkeeper,
      supportUserPlayer: null,
      supportOpponentPlayer: null,
    };
  }

  if (zone === "def_goalkeeper") {
    const attacker = pickOutfieldByGroups(
      opponentTeam,
      ["st", "am", "wing"],
      "center",
      zone,
      "opponent",
      random,
      excludedOpponentPlayerId,
      unavailableOpponentPlayerIds
    );

    return {
      userPlayer: userGoalkeeper,
      opponentPlayer: attacker,
      userGoalkeeper,
      opponentGoalkeeper,
      supportUserPlayer: null,
      supportOpponentPlayer: null,
    };
  }

  if (zone === "atk_bigchance") {
    const attacker = pickOutfieldByGroups(
      userTeam,
      ["st", "am", "wing"],
      "center",
      zone,
      "user",
      random,
      excludedUserPlayerId,
      unavailableUserPlayerIds
    );

    return {
      userPlayer: attacker,
      opponentPlayer: opponentGoalkeeper,
      userGoalkeeper,
      opponentGoalkeeper,
      supportUserPlayer: null,
      supportOpponentPlayer: null,
    };
  }

  if (zone === "def_bigchance") {
    const attacker = pickOutfieldByGroups(
      opponentTeam,
      ["st", "am", "wing"],
      "center",
      zone,
      "opponent",
      random,
      excludedOpponentPlayerId,
      unavailableOpponentPlayerIds
    );

    return {
      userPlayer: userGoalkeeper,
      opponentPlayer: attacker,
      userGoalkeeper,
      opponentGoalkeeper,
      supportUserPlayer: null,
      supportOpponentPlayer: null,
    };
  }

  const forcedUserPlayer =
    forcedUserPlayerId !== null && !unavailableUserPlayerIds.has(forcedUserPlayerId)
      ? getPlayerById(userTeam, forcedUserPlayerId)
      : null;
  const forcedOpponentPlayer =
    forcedOpponentPlayerId !== null &&
    !unavailableOpponentPlayerIds.has(forcedOpponentPlayerId)
      ? getPlayerById(opponentTeam, forcedOpponentPlayerId)
      : null;
  const userLane = getTeamLane(lane, "user");
  const opponentLane = getTeamLane(lane, "opponent");
  const userPools = getPoolsForContext(zone, userLane);
  const opponentPools = getPoolsForContext(zone, opponentLane);

  const userPlayer =
    forcedUserPlayer ??
    (possession === "user"
      ? pickOutfieldByGroups(
          userTeam,
          userPools.inPossession,
          userLane,
          zone,
          "user",
          random,
          excludedUserPlayerId,
          unavailableUserPlayerIds
        )
      : userPools.preferGoalkeeperDefender
        ? userGoalkeeper
        : pickOutfieldByGroups(
            userTeam,
            userPools.outOfPossession,
            userLane,
            zone,
            "user",
            random,
            excludedUserPlayerId,
            unavailableUserPlayerIds
          ));

  const opponentPlayer =
    forcedOpponentPlayer ??
    (possession === "opponent"
      ? pickOutfieldByGroups(
          opponentTeam,
          opponentPools.inPossession,
          opponentLane,
          zone,
          "opponent",
          random,
          excludedOpponentPlayerId,
          unavailableOpponentPlayerIds
        )
      : opponentPools.preferGoalkeeperDefender
        ? opponentGoalkeeper
        : pickOutfieldByGroups(
            opponentTeam,
            opponentPools.outOfPossession,
            opponentLane,
            zone,
            "opponent",
            random,
            excludedOpponentPlayerId,
            unavailableOpponentPlayerIds
          ));

  const hasSupportPlayers = shouldUseSupportPlayers(zone);

  return {
    userPlayer,
    opponentPlayer,
    userGoalkeeper,
    opponentGoalkeeper,
    supportUserPlayer: hasSupportPlayers
      ? pickSupportPlayer({
          team: userTeam,
          mainPlayerId: userPlayer.id,
          lane: userLane,
          zone,
          teamPerspective: "user",
          unavailablePlayerIds: unavailableUserPlayerIds,
          random,
        })
      : null,
    supportOpponentPlayer: hasSupportPlayers
      ? pickSupportPlayer({
          team: opponentTeam,
          mainPlayerId: opponentPlayer.id,
          lane: opponentLane,
          zone,
          teamPerspective: "opponent",
          unavailablePlayerIds: unavailableOpponentPlayerIds,
          random,
        })
      : null,
  };
}

function normalizeZoneForTeam(zone: Zone, teamPerspective: PossessionSide): Zone {
  if (teamPerspective === "user") return zone;

  if (zone.startsWith("def_")) {
    return zone.replace("def_", "atk_") as Zone;
  }

  if (zone.startsWith("atk_")) {
    return zone.replace("atk_", "def_") as Zone;
  }

  return zone;
}

function getTeamLane(fieldLane: Lane, team: PossessionSide): Lane {
  if (fieldLane === "center") return "center";
  return team === "user" ? fieldLane : mirrorLane(fieldLane);
}

function getPoolsForContext(zone: Zone, lane: Lane): TeamPools {
  switch (zone) {
    case "def_box":
      return {
        inPossession: lane === "center" ? ["st", "am", "cm"] : ["st", "am", "wing"],
        outOfPossession: lane === "center" ? ["cb", "dm"] : ["fb", "cb", "dm"],
        preferGoalkeeperDefender: false,
      };

    case "def_nearbox":
      return {
        inPossession:
          lane === "left" || lane === "right"
            ? ["fb", "wing", "cm"]
            : ["cb", "dm"],
        outOfPossession:
          lane === "center" ? ["cb", "dm"] : ["fb", "cb", "dm"],
      };

    case "def_third":
      return {
        inPossession:
          lane === "center" ? ["dm", "cm", "cb"] : ["fb", "wing", "cm"],
        outOfPossession:
          lane === "center" ? ["cb", "dm", "cm"] : ["fb", "dm", "cb"],
      };

    case "def_mid":
      return {
        inPossession:
          lane === "center" ? ["dm", "cm", "am"] : ["cm", "wing", "fb"],
        outOfPossession:
          lane === "center" ? ["dm", "cm", "cb"] : ["fb", "cm", "dm"],
      };

    case "atk_mid":
      return {
        inPossession:
          lane === "center" ? ["cm", "am", "st"] : ["wing", "cm", "fb"],
        outOfPossession:
          lane === "center" ? ["dm", "cm", "cb"] : ["fb", "dm", "cm"],
      };

    case "atk_third":
      return {
        inPossession:
          lane === "center" ? ["am", "st", "cm"] : ["wing", "am", "st"],
        outOfPossession:
          lane === "center" ? ["cb", "dm", "cm"] : ["fb", "cb", "dm"],
      };

    case "atk_nearbox":
      return {
        inPossession: lane === "center" ? ["st", "am"] : ["wing", "st", "am"],
        outOfPossession:
          lane === "center" ? ["cb", "dm"] : ["fb", "cb", "dm"],
      };

    case "atk_box":
      return {
        inPossession: ["st", "am", "wing"],
        outOfPossession: ["cb", "dm", "fb"],
      };

    case "atk_bigchance":
      return {
        inPossession: ["st", "am", "wing"],
        outOfPossession: ["cb", "dm"],
        preferGoalkeeperDefender: true,
      };

    case "def_bigchance":
      return {
        inPossession: ["st", "am", "wing"],
        outOfPossession: ["st", "am", "wing"],
        preferGoalkeeperDefender: true,
      };

    default:
      return {
        inPossession: ["any"],
        outOfPossession: ["any"],
      };
  }
}

function shouldUseSupportPlayers(zone: Zone): boolean {
  return (
    zone !== "atk_bigchance" &&
    zone !== "def_bigchance" &&
    zone !== "atk_goalkeeper" &&
    zone !== "def_goalkeeper"
  );
}

function pickSupportPlayer(params: {
  team: MatchTeam;
  mainPlayerId: number;
  lane: Lane;
  zone: Zone;
  teamPerspective: PossessionSide;
  unavailablePlayerIds: Set<number>;
  random: () => number;
}): MatchPlayer | null {
  const {
    team,
    mainPlayerId,
    lane,
    zone,
    teamPerspective,
    unavailablePlayerIds,
    random,
  } = params;

  const candidates = getOutfieldPlayers(team).filter(
    (player) =>
      player.id !== mainPlayerId && !unavailablePlayerIds.has(player.id)
  );

  if (candidates.length === 0) return null;

  const supportGroups = getSupportGroups(zone);
  const weighted = buildWeightedCandidates(
    candidates,
    supportGroups,
    lane,
    zone,
    teamPerspective,
    random
  );

  return pickWeightedOutfield(weighted, random);
}

function getSupportGroups(zone: Zone): PositionGroup[] {
  if (
    zone === "def_box" ||
    zone === "def_nearbox" ||
    zone === "def_third" ||
    zone === "def_bigchance"
  ) {
    return ["cb", "fb", "dm"];
  }

  if (zone === "def_mid" || zone === "atk_mid") {
    return ["dm", "cm", "am"];
  }

  return ["wing", "am", "st"];
}

export function pickOutfieldByGroups(
  team: MatchTeam,
  groups: PositionGroup[],
  lane: Lane,
  zone: Zone,
  teamPerspective: PossessionSide,
  random: () => number,
  excludedPlayerId: number | null = null,
  unavailablePlayerIds: Set<number> = new Set<number>()
): OutfieldPlayer {
  const players = getOutfieldPlayers(team).filter(
    (player) =>
      player.id !== excludedPlayerId && !unavailablePlayerIds.has(player.id)
  );

  if (players.length === 0) {
    const allAvailable = getOutfieldPlayers(team).filter(
      (player) => !unavailablePlayerIds.has(player.id)
    );
    const weighted = buildWeightedCandidates(
      allAvailable,
      groups,
      lane,
      zone,
      teamPerspective,
      random
    );
    return pickWeightedOutfield(weighted, random);
  }

  const weighted = buildWeightedCandidates(
    players,
    groups,
    lane,
    zone,
    teamPerspective,
    random
  );
  return pickWeightedOutfield(weighted, random);
}

function buildWeightedCandidates(
  players: OutfieldPlayer[],
  groups: PositionGroup[],
  lane: Lane,
  zone: Zone,
  teamPerspective: PossessionSide,
  random: () => number
): WeightedPlayer[] {
  const bestGroupPriority = new Map<number, number>();

  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];

    for (const player of players) {
      if (!belongsToGroup(player, group)) {
        continue;
      }

      const existing = bestGroupPriority.get(player.id);

      if (existing === undefined || i < existing) {
        bestGroupPriority.set(player.id, i);
      }
    }
  }

  const result: WeightedPlayer[] = [];
  const seen = new Set<number>();

  for (const player of players) {
    const priority = bestGroupPriority.get(player.id);

    if (priority === undefined) {
      continue;
    }

    seen.add(player.id);
    result.push({
      player,
      weight: getPlayerSelectionWeight(
        player,
        priority,
        lane,
        zone,
        teamPerspective,
        random
      ),
    });
  }

  if (result.length === 0) {
    for (const player of players) {
      if (seen.has(player.id)) continue;

      result.push({
        player,
        weight: getPlayerSelectionWeight(
          player,
          groups.length,
          lane,
          zone,
          teamPerspective,
          random
        ),
      });
    }
  }

  return result;
}

function getPlayerSelectionWeight(
  player: OutfieldPlayer,
  groupPriority: number,
  lane: Lane,
  zone: Zone,
  teamPerspective: PossessionSide,
  random: () => number
): number {
  const normalizedZone = normalizeZoneForTeam(zone, teamPerspective);
  let weight = 1;

  if (groupPriority === 0) weight += 3;
  else if (groupPriority === 1) weight += 2;
  else if (groupPriority === 2) weight += 1;

  const overall = player.overall ?? 75;
  if (overall >= 90) weight += 1.4;
  else if (overall >= 85) weight += 1.0;
  else if (overall >= 80) weight += 0.6;
  else weight += 0.2;

  const positions = getNormalizedPositions(player);

  if (lane === "left") {
    if (hasAnyPosition(positions, ["LW", "LM", "LB", "LWB"])) {
      weight += 1.2;
    }

    if (hasAnyPosition(positions, ["RW", "RM", "RB", "RWB"])) {
      weight *= 0.15;
    }
  } else if (lane === "right") {
    if (hasAnyPosition(positions, ["RW", "RM", "RB", "RWB"])) {
      weight += 1.2;
    }

    if (hasAnyPosition(positions, ["LW", "LM", "LB", "LWB"])) {
      weight *= 0.15;
    }
  } else if (hasAnyPosition(positions, ["CM", "CDM", "CAM", "ST", "CB"])) {
    weight += 0.8;
  }

  if (normalizedZone === "def_box" || normalizedZone === "def_nearbox") {
    if (hasAnyPosition(positions, ["CB", "LB", "RB", "CDM"])) weight += 1.0;
  } else if (normalizedZone === "def_third") {
    if (hasAnyPosition(positions, ["CB", "LB", "RB", "CDM"])) weight += 0.8;
  } else if (normalizedZone === "def_mid") {
    if (hasAnyPosition(positions, ["CDM", "CM", "CB"])) weight += 0.6;
  } else if (normalizedZone === "atk_mid") {
    if (hasAnyPosition(positions, ["CM", "CAM", "RW", "LW"])) weight += 0.6;
  } else if (normalizedZone === "atk_third") {
    if (hasAnyPosition(positions, ["CAM", "ST", "LW", "RW"])) weight += 0.8;
  } else if (normalizedZone === "atk_nearbox" || normalizedZone === "atk_box") {
    if (hasAnyPosition(positions, ["ST", "CAM", "LW", "RW"])) weight += 1.0;
  }

  weight *= 0.85 + random() * 0.3;

  return Math.max(weight, 0.01);
}

function pickWeightedOutfield(
  weighted: WeightedPlayer[],
  random: () => number
): OutfieldPlayer {
  if (weighted.length === 0) {
    throw new Error("pickWeightedOutfield: empty candidate list.");
  }

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);

  if (total <= 0) {
    return weighted[0].player;
  }

  let roll = random() * total;

  for (const { player, weight } of weighted) {
    roll -= weight;
    if (roll <= 0) return player;
  }

  return weighted[weighted.length - 1].player;
}

function belongsToGroup(player: OutfieldPlayer, group: PositionGroup): boolean {
  const positions = getNormalizedPositions(player);

  switch (group) {
    case "cb":
      return hasAnyPosition(positions, ["CB"]);
    case "fb":
      return hasAnyPosition(positions, ["LB", "RB", "LM", "RM"]);
    case "dm":
      return hasAnyPosition(positions, ["CDM", "CM"]);
    case "cm":
      return hasAnyPosition(positions, ["CM", "LM", "RM", "CAM"]);
    case "am":
      return hasAnyPosition(positions, ["CAM", "RM", "LM", "LW", "RW"]);
    case "wing":
      return hasAnyPosition(positions, ["LW", "RW", "LM", "RM"]);
    case "st":
      return hasAnyPosition(positions, ["ST"]);
    case "any":
      return true;
    default:
      return false;
  }
}

function getPlayerById(team: MatchTeam, playerId: number): MatchPlayer | null {
  return team.starters.find((player) => player.id === playerId) ?? null;
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

function getOutfieldPlayers(team: MatchTeam): OutfieldPlayer[] {
  return team.starters.filter(
    (player): player is OutfieldPlayer => player.role === "outfield"
  );
}

function getNormalizedPositions(player: OutfieldPlayer): string[] {
  const position = player.lineupPosition ?? player.position;
  return [position.trim().toUpperCase()];
}

function hasAnyPosition(positions: string[], expected: string[]): boolean {
  return expected.some((pos) => positions.includes(pos));
}

function mirrorLane(lane: Lane): Lane {
  if (lane === "left") return "right";
  if (lane === "right") return "left";
  return "center";
}
