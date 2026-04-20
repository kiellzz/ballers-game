import type {
  DuelContext,
  ShotResult,
  SituationType,
  Zone,
  Lane,
  PossessionSide,
  SetPieceType,
} from "../matchTypes";

import type { ResolvePenOutput } from "../balancing/resolvePen";
import type { ResolveFkOutput } from "../balancing/resolveFk";
import type { ResolveCornerOutput } from "../balancing/resolveCorner";

type SetPieceInteractionResolution =
  | {
      setPieceType: "penalty";
      resolution: ResolvePenOutput;
    }
  | {
      setPieceType: "freekick";
      resolution: ResolveFkOutput;
    }
  | {
      setPieceType: "corner";
      resolution: ResolveCornerOutput;
    };

interface ResolveSetPieceParams {
  context: DuelContext;
  interaction: SetPieceInteractionResolution;
  random?: () => number;
}

export interface SetPieceResolution {
  setPieceType: SetPieceType;
  shotResult: ShotResult;
  nextZone: Zone;
  nextLane: Lane;
  nextPossession: PossessionSide;
  nextSituationType: SituationType;
  createdBigChance: boolean;
  description?: string;
  forcedUserPlayerId?: number | null;
  forcedOpponentPlayerId?: number | null;
  excludedUserPlayerId?: number | null;
  excludedOpponentPlayerId?: number | null;
}

export function resolveSetPiece(
  params: ResolveSetPieceParams
): SetPieceResolution {
  const { context, interaction, random = Math.random } = params;

  if (!context.setPieceType) {
    throw new Error('Attempted to resolve a set piece without "setPieceType".');
  }

  if (context.setPieceType !== interaction.setPieceType) {
    throw new Error(
      `Mismatch between context.setPieceType (${context.setPieceType}) and interaction.setPieceType (${interaction.setPieceType}).`
    );
  }

  switch (interaction.setPieceType) {
    case "penalty":
      return resolvePenaltyFromInteraction(context, interaction.resolution, random);

    case "freekick":
      return resolveFreekickFromInteraction(context, interaction.resolution, random);

    case "corner":
      return resolveCornerFromInteraction(context, interaction.resolution, random);

    default:
      throw new Error(`Invalid set piece: ${interaction satisfies never}`);
  }
}

function resolvePenaltyFromInteraction(
  context: DuelContext,
  resolution: ResolvePenOutput,
  random: () => number
): SetPieceResolution {
  const attackingSide = context.possession;
  const opponentSide = oppositePossession(attackingSide);

  const nextBoxZone = getBoxZoneForSide(attackingSide);
  const opponentMidZone = getMidZoneForSide(opponentSide);
  const cornerZone = getCornerZoneForSide(attackingSide);
  const cornerLane: Lane = random() < 0.5 ? "left" : "right";

  if (resolution.result === "goal") {
    return {
      setPieceType: "penalty",
      shotResult: {
        happened: true,
        outcome: "goal",
        scoredBy: attackingSide,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      nextZone: opponentMidZone,
      nextLane: "center",
      nextPossession: opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "Penalty scored.",
    };
  }

  if (resolution.result === "save_clean") {
    return {
      setPieceType: "penalty",
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      nextZone: opponentMidZone,
      nextLane: "center",
      nextPossession: opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "Penalty saved by the goalkeeper.",
    };
  }

  const saveTouchRoll = random();

  if (saveTouchRoll < 0.5) {
    return {
      setPieceType: "penalty",
      shotResult: {
        happened: true,
        outcome: "rebound",
        scoredBy: null,
        reboundKeptBy: attackingSide,
        setPieceAwarded: null,
      },
      nextZone: nextBoxZone,
      nextLane: "center",
      nextPossession: attackingSide,
      nextSituationType: "open_play",
      createdBigChance: true,
      description: "The goalkeeper gets a touch, but a live rebound spills out.",
    };
  }

  if (saveTouchRoll < 0.75) {
    return {
      setPieceType: "penalty",
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      nextZone: opponentMidZone,
      nextLane: "center",
      nextPossession: opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "The goalkeeper gets a touch and then holds on firmly.",
    };
  }

  return {
    setPieceType: "penalty",
    shotResult: {
      happened: true,
      outcome: "save",
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: "corner",
    },
    nextZone: cornerZone,
    nextLane: cornerLane,
    nextPossession: attackingSide,
    nextSituationType: "set_piece",
    createdBigChance: false,
    description: "The goalkeeper pushes it away for a corner.",
  };
}

function resolveFreekickFromInteraction(
  context: DuelContext,
  resolution: ResolveFkOutput,
  random: () => number
): SetPieceResolution {
  return resolveFreekickShotFromInteraction(context, resolution, random);
}

function resolveFreekickShotFromInteraction(
  context: DuelContext,
  resolution: ResolveFkOutput,
  random: () => number
): SetPieceResolution {
  const attackingSide = context.possession;
  const opponentSide = oppositePossession(attackingSide);

  const takerId =
    attackingSide === "user"
      ? context.actors.userPlayer.id
      : context.actors.opponentPlayer.id;

  const nextBoxZone = getBoxZoneForSide(attackingSide);
  const nextBigChanceZone = getBigChanceZoneForSide(attackingSide);
  const nextThirdZone = getThirdZoneForSide(attackingSide);
  const nextGoalkeeperZone = getGoalkeeperZoneForSide(opponentSide);
  const opponentMidZone = getMidZoneForSide(opponentSide);
  const cornerZone = getCornerZoneForSide(attackingSide);
  const cornerLane: Lane = random() < 0.5 ? "left" : "right";

  if (resolution.result === "goal") {
    return {
      setPieceType: "freekick",
      shotResult: {
        happened: true,
        outcome: "goal",
        scoredBy: attackingSide,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      nextZone: opponentMidZone,
      nextLane: "center",
      nextPossession: opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "Perfect free kick. Goal.",
    };
  }

  if (resolution.result === "save_clean") {
    return {
      setPieceType: "freekick",
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      nextZone: nextGoalkeeperZone,
      nextLane: "center",
      nextPossession: opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "The goalkeeper catches the free kick.",
    };
  }

  if (resolution.result === "save_touch") {
    const saveTouchRoll = random();

    if (saveTouchRoll < 0.5) {
      const reboundIsBigChance = random() < 0.5;

      return {
        setPieceType: "freekick",
        shotResult: {
          happened: true,
          outcome: "rebound",
          scoredBy: null,
          reboundKeptBy: attackingSide,
          setPieceAwarded: null,
        },
        nextZone: reboundIsBigChance ? nextBigChanceZone : nextBoxZone,
        nextLane: "center",
        nextPossession: attackingSide,
        nextSituationType: "open_play",
        createdBigChance: reboundIsBigChance,
        excludedUserPlayerId: attackingSide === "user" ? takerId : null,
        excludedOpponentPlayerId: attackingSide === "opponent" ? takerId : null,
        description: reboundIsBigChance
          ? "The goalkeeper parries it and the loose ball becomes a huge chance."
          : "The ball ricochets and stays alive in the box.",
      };
    }

    if (saveTouchRoll < 0.75) {
      return {
        setPieceType: "freekick",
        shotResult: {
          happened: true,
          outcome: "save",
          scoredBy: null,
          reboundKeptBy: null,
          setPieceAwarded: null,
        },
        nextZone: nextGoalkeeperZone,
        nextLane: "center",
        nextPossession: opponentSide,
        nextSituationType: "open_play",
        createdBigChance: false,
        description: "The goalkeeper gets a touch and then claims it cleanly.",
      };
    }

    return {
      setPieceType: "freekick",
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: "corner",
      },
      nextZone: cornerZone,
      nextLane: cornerLane,
      nextPossession: attackingSide,
      nextSituationType: "set_piece",
      createdBigChance: false,
      description: "The goalkeeper pushes it behind for a corner.",
    };
  }

  if (resolution.result === "blocked_wall") {
    const attackingKeepsBall = random() < 0.65;

    return {
      setPieceType: "freekick",
      shotResult: {
        happened: true,
        outcome: "blocked",
        scoredBy: null,
        reboundKeptBy: attackingKeepsBall ? attackingSide : null,
        setPieceAwarded: null,
      },
      nextZone: attackingKeepsBall ? nextThirdZone : opponentMidZone,
      nextLane: attackingKeepsBall ? context.lane : "center",
      nextPossession: attackingKeepsBall ? attackingSide : opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      excludedUserPlayerId:
        attackingKeepsBall && attackingSide === "user" ? takerId : null,
      excludedOpponentPlayerId:
        attackingKeepsBall && attackingSide === "opponent" ? takerId : null,
      description: attackingKeepsBall
        ? "The ball smashes into the wall and falls back to the attack."
        : "The wall blocks it and the defense recovers.",
    };
  }

  return {
    setPieceType: "freekick",
    shotResult: {
      happened: true,
      outcome: "miss",
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: null,
    },
    nextZone: nextGoalkeeperZone,
    nextLane: "center",
    nextPossession: opponentSide,
    nextSituationType: "open_play",
    createdBigChance: false,
    description: "The kick goes wide. Goal kick.",
  };
}

function resolveCornerFromInteraction(
  context: DuelContext,
  resolution: ResolveCornerOutput,
  random: () => number
): SetPieceResolution {
  const attackingSide = context.possession;
  const opponentSide = oppositePossession(attackingSide);

  const nextThirdZone = getThirdZoneForSide(attackingSide);
  const nextBoxZone = getBoxZoneForSide(attackingSide);
  const nextBigChanceZone = getBigChanceZoneForSide(attackingSide);
  const nextNearboxZone = getNearboxZoneForSide(attackingSide);
  const opponentMidZone = getMidZoneForSide(opponentSide);

  const emptyShot = createEmptyShotResult();

  if (resolution.result === "short_kept") {
    return {
      setPieceType: "corner",
      shotResult: emptyShot,
      nextZone: nextNearboxZone,
      nextLane: context.lane,
      nextPossession: attackingSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      forcedUserPlayerId:
        attackingSide === "user"
          ? context.actors.supportUserPlayer?.id ?? null
          : null,
      forcedOpponentPlayerId:
        attackingSide === "opponent"
          ? context.actors.supportOpponentPlayer?.id ?? null
          : null,
      description: "Well-worked short corner. The attack keeps possession.",
    };
  }

  if (resolution.result === "cross_bigchance") {
    return {
      setPieceType: "corner",
      shotResult: emptyShot,
      nextZone: nextBigChanceZone,
      nextLane: "center",
      nextPossession: attackingSide,
      nextSituationType: "open_play",
      createdBigChance: true,
      description: "Perfect corner. A huge chance is created.",
    };
  }

  if (resolution.result === "cross_box") {
    return {
      setPieceType: "corner",
      shotResult: emptyShot,
      nextZone: nextBoxZone,
      nextLane: "center",
      nextPossession: attackingSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "The cross finds someone in the box.",
    };
  }

  if (resolution.result === "cross_cleared") {
    const secondBall = random() < 0.45;

    return {
      setPieceType: "corner",
      shotResult: emptyShot,
      nextZone: secondBall ? nextThirdZone : opponentMidZone,
      nextLane: secondBall ? context.lane : "center",
      nextPossession: secondBall ? attackingSide : opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: secondBall
        ? "The defense only half clears it, and the pressure stays on."
        : "The defense clears the corner.",
    };
  }

  if (resolution.result === "cross_claimed") {
    return {
      setPieceType: "corner",
      shotResult: {
        happened: true,
        outcome: "save",
        scoredBy: null,
        reboundKeptBy: null,
        setPieceAwarded: null,
      },
      nextZone: opponentMidZone,
      nextLane: "center",
      nextPossession: opponentSide,
      nextSituationType: "open_play",
      createdBigChance: false,
      description: "The goalkeeper comes out well and claims the ball.",
    };
  }

  return {
    setPieceType: "corner",
    shotResult: {
      happened: true,
      outcome: resolution.result === "goal" ? "goal" : "miss",
      scoredBy: resolution.result === "goal" ? attackingSide : null,
      reboundKeptBy: null,
      setPieceAwarded: null,
    },
    nextZone: opponentMidZone,
    nextLane: "center",
    nextPossession: opponentSide,
    nextSituationType: "open_play",
    createdBigChance: false,
    description:
      resolution.result === "goal"
        ? "Olympic goal."
        : "The Olympic attempt drifts off target. The defense restarts.",
  };
}

function createEmptyShotResult(): ShotResult {
  return {
    happened: false,
    outcome: null,
    scoredBy: null,
    reboundKeptBy: null,
    setPieceAwarded: null,
  };
}

function oppositePossession(side: PossessionSide): PossessionSide {
  return side === "user" ? "opponent" : "user";
}

function getMidZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "def_mid" : "atk_mid";
}

function getThirdZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "atk_third" : "def_third";
}

function getBoxZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "atk_box" : "def_box";
}

function getNearboxZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "atk_nearbox" : "def_nearbox";
}

function getCornerZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "atk_corner" : "def_corner";
}

function getGoalkeeperZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "def_goalkeeper" : "atk_goalkeeper";
}

function getBigChanceZoneForSide(side: PossessionSide): Zone {
  return side === "user" ? "atk_bigchance" : "def_bigchance";
}
