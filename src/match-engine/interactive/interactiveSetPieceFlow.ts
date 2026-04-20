import type { FreeKickDistance } from "../balancing/resolveFk";
import type { ResolvePenOutput } from "../balancing/resolvePen";
import type { ResolveFkOutput } from "../balancing/resolveFk";
import type { ResolveCornerOutput } from "../balancing/resolveCorner";

import type {
  DuelContext,
  MatchActors,
  PossessionSide,
  SetPieceType,
  Zone,
} from "../matchTypes";

import { resolveUserSetPieceFlow } from "./setPieceFlow";

import {
  resolveSetPiece,
  type SetPieceResolution,
} from "../setpiece/setPieceEngine";

export type PreInteractiveType =
  | "penalty"
  | "freekick"
  | "quick_freekick"
  | "corner";

export type InteractiveModalType =
  | "penalty"
  | "freekick"
  | "corner"
  | null;

export type InteractiveSide = "user" | "opponent";

export type InteractiveSetPieceStage =
  | "idle"
  | "pre"
  | "modal"
  | "resolved";

export type InteractivePenaltyResolution = {
  setPieceType: "penalty";
  resolution: ResolvePenOutput;
};

export type InteractiveFreekickResolution = {
  setPieceType: "freekick";
  resolution: ResolveFkOutput;
};

export type InteractiveCornerResolution = {
  setPieceType: "corner";
  resolution: ResolveCornerOutput;
};

export type InteractiveSetPieceResolutionInput =
  | InteractivePenaltyResolution
  | InteractiveFreekickResolution
  | InteractiveCornerResolution;

export interface InteractiveSetPieceState {
  stage: InteractiveSetPieceStage;
  side: InteractiveSide | null;

  preType: PreInteractiveType | null;
  modalType: InteractiveModalType;

  context: DuelContext | null;
  actors: MatchActors | null;

  setPieceType: SetPieceType | null;
  freeKickDistance: FreeKickDistance | null;

  /**
   * When true, the play does not open a real interactive modal
   * after the pre-modal; it resolves directly as a quick free kick.
   */
  isQuickFlow: boolean;

  /**
   * Filled only after the flow has already been resolved.
   */
  finalResolution: SetPieceResolution | null;
}

export interface StartInteractiveSetPieceFlowParams {
  context: DuelContext;
  actors: MatchActors;
}

export interface ContinuePreInteractiveResult {
  nextState: InteractiveSetPieceState;
  shouldOpenModal: boolean;
  shouldResolveQuickFlow: boolean;
}

export interface ResolveInteractiveSetPieceResult {
  nextState: InteractiveSetPieceState;
  finalResolution: SetPieceResolution;
}

export function createIdleInteractiveSetPieceState(): InteractiveSetPieceState {
  return {
    stage: "idle",
    side: null,
    preType: null,
    modalType: null,
    context: null,
    actors: null,
    setPieceType: null,
    freeKickDistance: null,
    isQuickFlow: false,
    finalResolution: null,
  };
}

export function startInteractiveSetPieceFlow(
  params: StartInteractiveSetPieceFlowParams
): InteractiveSetPieceState {
  const { context, actors } = params;

  if (!context.setPieceType) {
    return createIdleInteractiveSetPieceState();
  }

  const side = getInteractiveSideFromContext(context);

  if (side === "user") {
    return startUserInteractiveSetPieceFlow(context, actors);
  }

  return startOpponentInteractiveSetPieceFlow(context, actors);
}

function startUserInteractiveSetPieceFlow(
  context: DuelContext,
  actors: MatchActors
): InteractiveSetPieceState {
  const flow = resolveUserSetPieceFlow({
    setPieceType: context.setPieceType ?? null,
    zone: context.zone,
    awardedTo: context.possession,
  });

  if (!flow) {
    return createIdleInteractiveSetPieceState();
  }

  if (flow.type === "quick_freekick") {
    return {
      stage: "pre",
      side: "user",
      preType: "quick_freekick",
      modalType: null,
      context,
      actors,
      setPieceType: "freekick",
      freeKickDistance: null,
      isQuickFlow: true,
      finalResolution: null,
    };
  }

  if (flow.type === "penalty") {
    return {
      stage: "pre",
      side: "user",
      preType: "penalty",
      modalType: "penalty",
      context,
      actors,
      setPieceType: "penalty",
      freeKickDistance: null,
      isQuickFlow: false,
      finalResolution: null,
    };
  }

  if (flow.type === "freekick") {
    return {
      stage: "pre",
      side: "user",
      preType: "freekick",
      modalType: "freekick",
      context,
      actors,
      setPieceType: "freekick",
      freeKickDistance: flow.distance,
      isQuickFlow: false,
      finalResolution: null,
    };
  }

  return {
    stage: "pre",
    side: "user",
    preType: "corner",
    modalType: "corner",
    context,
    actors,
    setPieceType: "corner",
    freeKickDistance: null,
    isQuickFlow: false,
    finalResolution: null,
  };
}

function startOpponentInteractiveSetPieceFlow(
  context: DuelContext,
  actors: MatchActors
): InteractiveSetPieceState {
  const setPieceType = context.setPieceType;

  if (!setPieceType) {
    return createIdleInteractiveSetPieceState();
  }

  if (setPieceType === "penalty") {
    return {
      stage: "pre",
      side: "opponent",
      preType: "penalty",
      modalType: "penalty",
      context,
      actors,
      setPieceType: "penalty",
      freeKickDistance: null,
      isQuickFlow: false,
      finalResolution: null,
    };
  }

  if (setPieceType === "freekick") {
    const shouldBeQuickFlow = context.zone.startsWith("atk_");

    if (shouldBeQuickFlow) {
      return {
        stage: "pre",
        side: "opponent",
        preType: "quick_freekick",
        modalType: null,
        context,
        actors,
        setPieceType: "freekick",
        freeKickDistance: null,
        isQuickFlow: true,
        finalResolution: null,
      };
    }

    return {
      stage: "pre",
      side: "opponent",
      preType: "freekick",
      modalType: "freekick",
      context,
      actors,
      setPieceType: "freekick",
      freeKickDistance: getOpponentFreeKickDistanceFromZone(context.zone),
      isQuickFlow: false,
      finalResolution: null,
    };
  }

  return {
    stage: "pre",
    side: "opponent",
    preType: "corner",
    modalType: "corner",
    context,
    actors,
    setPieceType: "corner",
    freeKickDistance: null,
    isQuickFlow: false,
    finalResolution: null,
  };
}

export function continueFromPreInteractive(
  state: InteractiveSetPieceState
): ContinuePreInteractiveResult {
  if (state.stage !== "pre") {
    return {
      nextState: state,
      shouldOpenModal: false,
      shouldResolveQuickFlow: false,
    };
  }

  if (state.isQuickFlow) {
    return {
      nextState: {
        ...state,
        stage: "resolved",
      },
      shouldOpenModal: false,
      shouldResolveQuickFlow: true,
    };
  }

  return {
    nextState: {
      ...state,
      stage: "modal",
    },
    shouldOpenModal: true,
    shouldResolveQuickFlow: false,
  };
}

export function resolveInteractiveSetPiece(
  state: InteractiveSetPieceState,
  interaction: InteractiveSetPieceResolutionInput
): ResolveInteractiveSetPieceResult {
  if (!state.context) {
    throw new Error("Cannot resolve set piece without context.");
  }

  if (!state.actors) {
    throw new Error("Cannot resolve set piece without actors.");
  }

  if (state.stage !== "modal") {
    throw new Error(
      `resolveInteractiveSetPiece called in an invalid stage: ${state.stage}`
    );
  }

  if (state.setPieceType !== interaction.setPieceType) {
    throw new Error(
      `Mismatch between state.setPieceType (${state.setPieceType}) and interaction.setPieceType (${interaction.setPieceType}).`
    );
  }

  const finalResolution = resolveSetPiece({
    context: state.context,
    interaction,
  });

  return {
    nextState: {
      ...state,
      stage: "resolved",
      finalResolution,
    },
    finalResolution,
  };
}

/**
 * Resolves a quick free kick without opening a real interactive modal.
 * This can start simple and become more sophisticated later.
 */
export function resolveQuickFreeKick(
  state: InteractiveSetPieceState
): ResolveInteractiveSetPieceResult {
  if (!state.context) {
    throw new Error("Cannot resolve quick free kick without context.");
  }

  if (state.stage !== "resolved" || !state.isQuickFlow) {
    throw new Error(
      `resolveQuickFreeKick called in an invalid state: stage=${state.stage}, isQuickFlow=${state.isQuickFlow}`
    );
  }

  const attackingSide = state.context.possession;

  const finalResolution: SetPieceResolution = {
    setPieceType: "freekick",
    shotResult: {
      happened: false,
      outcome: null,
      scoredBy: null,
      reboundKeptBy: null,
      setPieceAwarded: null,
    },
    nextZone: advanceOneZone(state.context.zone, attackingSide),
    nextLane: "center",
    nextPossession: attackingSide,
    nextSituationType: "open_play",
    createdBigChance: false,
    description: "Quick free kick. Play continues immediately.",
  };

  return {
    nextState: {
      ...state,
      finalResolution,
    },
    finalResolution,
  };
}

export function resetInteractiveSetPieceFlow(): InteractiveSetPieceState {
  return createIdleInteractiveSetPieceState();
}

function getInteractiveSideFromContext(context: DuelContext): InteractiveSide {
  /**
   * Since possession in the context represents who will take the set piece,
   * it also defines which side gets the interaction.
   *
   * - possession=user      -> user attacks / takes it
   * - possession=opponent  -> opponent attacks / takes it
   */
  return context.possession === "user" ? "user" : "opponent";
}

function getOpponentFreeKickDistanceFromZone(zone: Zone): FreeKickDistance {
  switch (zone) {
    case "def_third":
      return "short";
    case "def_nearbox":
      return "mid";
    case "def_mid":
      return "long";
    default:
      return "mid";
  }
}

function advanceOneZone(currentZone: Zone, side: PossessionSide): Zone {
  const forwardOrder: Zone[] = [
    "def_goalkeeper",
    "def_box",
    "def_nearbox",
    "def_third",
    "def_mid",
    "atk_mid",
    "atk_third",
    "atk_nearbox",
    "atk_box",
    "atk_bigchance",
  ];

  const index = forwardOrder.indexOf(currentZone);

  if (index === -1) {
    return currentZone;
  }

  if (side === "user") {
    return forwardOrder[Math.min(index + 1, forwardOrder.length - 1)];
  }

  return forwardOrder[Math.max(index - 1, 0)];
}
