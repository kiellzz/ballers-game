import { getActionsForContext } from "./events";
import { selectPlayersForSituation } from "../playerSelector";
import { selectSetPiecePlayers } from "../setpiece/setPieceSelector";
import { BIG_CHANCE_ZONES } from "../zoneGroups";

import type {
  ActionType,
  Lane,
  MatchSituation,
  MatchTeam,
  PossessionSide,
  SetPieceType,
  SituationType,
  Zone,
} from "../matchTypes";

interface CreateSituationParams {
  zone: Zone;
  lane: Lane;
  possession: PossessionSide;
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
  unavailableUserPlayerIds?: Set<number>;
  unavailableOpponentPlayerIds?: Set<number>;
  situationType?: SituationType;
  setPieceType?: SetPieceType | null;
  preferredTakerId?: number | null;
  forcedUserPlayerId?: number | null;
  forcedOpponentPlayerId?: number | null;
  excludedUserPlayerId?: number | null;
  excludedOpponentPlayerId?: number | null;
  random?: () => number;
}

interface WeightedAction {
  type: ActionType;
  weight: number;
}

const CARRY_ACTIONS: ActionType[] = ["dribble", "sprint"];
const FOUR_ACTION_ZONES: Zone[] = ["atk_nearbox", "atk_third", "atk_box"];

export function createSituation(
  params: CreateSituationParams
): MatchSituation {
  const {
    zone,
    lane,
    possession,
    userTeam,
    opponentTeam,
    unavailableUserPlayerIds = new Set<number>(),
    unavailableOpponentPlayerIds = new Set<number>(),
    situationType = "open_play",
    setPieceType = null,
    preferredTakerId = null,
    forcedUserPlayerId = null,
    forcedOpponentPlayerId = null,
    excludedUserPlayerId = null,
    excludedOpponentPlayerId = null,
    random = Math.random,
  } = params;

  const actors =
    situationType === "set_piece" && setPieceType
      ? selectSetPiecePlayers({
          setPieceType,
          possession,
          userTeam,
          opponentTeam,
          unavailableUserPlayerIds,
          unavailableOpponentPlayerIds,
          preferredTakerId,
          random,
        })
      : selectPlayersForSituation({
          zone,
          lane,
          possession,
          userTeam,
          opponentTeam,
          unavailableUserPlayerIds,
          unavailableOpponentPlayerIds,
          forcedUserPlayerId,
          forcedOpponentPlayerId,
          excludedUserPlayerId,
          excludedOpponentPlayerId,
          random,
        });

  if (situationType === "set_piece") {
    return {
      type: situationType,
      setPieceType,
      zone,
      lane,
      possession,
      availableActions: [],
      actors,
      isBigChance: BIG_CHANCE_ZONES.includes(zone),
    };
  }

  const availableActions = getAvailableActions({
    zone,
    lane,
    possession,
    random,
  });

  return {
    type: situationType,
    setPieceType,
    zone,
    lane,
    possession,
    availableActions,
    actors,
    isBigChance: BIG_CHANCE_ZONES.includes(zone),
  };
}

function getAvailableActions(params: {
  zone: Zone;
  lane: Lane;
  possession: PossessionSide;
  random: () => number;
}): ActionType[] {
  const { zone, lane, possession, random } = params;

  const possibleActions = getActionsForContext({
    zone,
    lane,
    possession,
  }).filter((action) => {
    if (action.type !== "counterattack") {
      return true;
    }

    return zone === "def_box" || zone === "def_nearbox";
  });

  if (possibleActions.length === 0) {
    return [];
  }

  const weightedActions: WeightedAction[] = possibleActions.map((action) => ({
    type: action.type,
    weight: getActionWeight({
      action: action.type,
      zone,
      lane,
      possession,
    }),
  }));

  const desiredCount = Math.min(
    weightedActions.length,
    getActionCountForContext({
      zone,
      possession,
    })
  );

  const guaranteedActions = new Set<ActionType>();
  const selectedActions: ActionType[] = [];

  const carryAction = pickGuaranteedCarryAction(weightedActions, random);
  if (carryAction) {
    guaranteedActions.add(carryAction);
    selectedActions.push(carryAction);
  }

  for (const action of getGuaranteedContextActions(zone)) {
    if (selectedActions.length >= desiredCount) {
      break;
    }

    if (
      guaranteedActions.has(action) ||
      !weightedActions.some((weightedAction) => weightedAction.type === action)
    ) {
      continue;
    }

    guaranteedActions.add(action);
    selectedActions.push(action);
  }

  const remainingCount = desiredCount - selectedActions.length;
  if (remainingCount <= 0) {
    return selectedActions;
  }

  const remainingActions = weightedActions.filter(
    (action) => !guaranteedActions.has(action.type)
  );

  return [
    ...selectedActions,
    ...pickWeightedActions(remainingActions, remainingCount, random),
  ];
}

function getActionCountForContext(params: {
  zone: Zone;
  possession: PossessionSide;
}): number {
  const { zone, possession } = params;

  if (zone === "def_bigchance") {
    return 2;
  }

  if (zone === "def_box" && possession === "opponent") {
    return 2;
  }

  if (zone === "atk_goalkeeper" || zone === "def_goalkeeper") {
    return 1;
  }

  if (FOUR_ACTION_ZONES.includes(zone)) {
    return 4;
  }

  return 3;
}

function getGuaranteedContextActions(zone: Zone): ActionType[] {
  if (zone === "atk_box") {
    return ["finish"];
  }

  if (zone === "atk_nearbox" || zone === "atk_third") {
    return ["long_shot"];
  }

  return [];
}

function pickGuaranteedCarryAction(
  weightedActions: WeightedAction[],
  random: () => number
): ActionType | null {
  const carryActions = weightedActions.filter((action) =>
    CARRY_ACTIONS.includes(action.type)
  );

  const [selectedAction] = pickWeightedActions(carryActions, 1, random);
  return selectedAction ?? null;
}

function getActionWeight(params: {
  action: ActionType;
  zone: Zone;
  lane: Lane;
  possession: PossessionSide;
}): number {
  const { action, zone, lane, possession } = params;

  let weight = 1;

  if (action === "gk_clearance") {
    return 999;
  }

  if (possession === "user") {
    switch (action) {
      case "side_pass":
        weight = 1.2;
        if (zone === "def_box" || zone === "def_third") weight += 0.5;
        if (zone === "atk_box" || zone === "atk_bigchance") weight -= 0.4;
        break;

      case "forward_pass":
        weight = 1.25;
        if (zone === "def_mid" || zone === "atk_mid") weight += 0.4;
        if (zone === "atk_third") weight += 0.2;
        break;

      case "long_pass":
        weight = 0.8;
        if (zone === "def_box" || zone === "def_third") weight += 0.5;
        if (zone === "def_mid") weight += 0.2;
        if (zone === "atk_box" || zone === "atk_bigchance") weight -= 0.5;
        break;

      case "dribble":
        weight = 1.1;
        if (zone === "atk_mid" || zone === "atk_third") weight += 0.45;
        if (zone === "atk_nearbox") weight += 0.35;
        if (lane !== "center") weight += 0.2;
        break;

      case "sprint":
        weight = 0.95;
        if (zone === "def_mid" || zone === "atk_mid") weight += 0.45;
        if (zone === "atk_third" || zone === "atk_nearbox") weight += 0.35;
        if (lane !== "center") weight += 0.2;
        if (zone === "atk_bigchance") weight += 0.6;
        break;

      case "shield":
        weight = 0.75;
        if (zone === "def_box" || zone === "def_third") weight += 0.2;
        if (zone === "atk_box") weight += 0.15;
        if (zone === "atk_bigchance") weight -= 0.35;
        break;

      case "cross":
        weight = 0.7;
        if (lane !== "center") weight += 0.7;
        if (zone === "atk_third" || zone === "atk_nearbox") weight += 0.5;
        if (zone === "def_third" || zone === "def_mid") weight -= 0.5;
        if (zone === "atk_bigchance") weight = 0.05;
        break;

      case "long_shot":
        weight = 0.45;
        if (zone === "atk_mid") weight += 0.35;
        if (zone === "atk_third") weight += 0.55;
        if (zone === "atk_box" || zone === "atk_bigchance") weight -= 0.35;
        break;

      case "finish":
        weight = 0.2;
        if (zone === "atk_box") weight += 0.95;
        if (zone === "atk_bigchance") weight += 1.2;
        break;

      case "header":
        weight = 0.2;
        if (zone === "atk_box") weight += 0.75;
        if (lane !== "center") weight += 0.15;
        if (zone === "atk_bigchance") weight -= 0.2;
        break;

      case "clearance":
        weight = 0.4;
        if (zone === "def_bigchance") weight += 1.8;
        if (zone === "def_box") weight += 1.5;
        if (zone === "def_nearbox") weight += 1.0;
        if (zone === "atk_mid" || zone === "atk_third") weight -= 0.4;
        break;

      default:
        weight = 1;
        break;
    }
  }

  if (possession === "opponent") {
    switch (action) {
      case "intercept":
        weight = 1.15;
        if (zone === "def_mid" || zone === "atk_mid") weight += 0.35;
        if (lane === "center") weight += 0.15;
        break;

      case "tackle":
        weight = 0.95;
        if (zone === "def_third" || zone === "def_nearbox") weight += 0.3;
        if (zone === "atk_third" || zone === "atk_nearbox") weight += 0.2;
        if (zone === "def_bigchance") weight += 0.4;
        break;

      case "slide_tackle":
        weight = 0.45;
        if (zone === "def_box" || zone === "def_bigchance") weight += 0.55;
        if (zone === "atk_box") weight += 0.3;
        break;

      case "block":
        weight = 0.25;
        if (zone === "def_box" || zone === "def_bigchance") weight += 0.6;
        if (zone === "atk_box") weight += 0.4;
        if (lane === "center") weight += 0.15;
        break;

      case "shoulder_charge":
        weight = 0.65;
        if (lane !== "center") weight += 0.3;
        if (zone === "def_third" || zone === "atk_third") weight += 0.2;
        break;

      case "emergency_clearance":
        weight = 0.8;
        if (zone === "def_bigchance") weight += 2.5;
        if (zone === "def_box") weight += 0.4;       
        if (zone === "def_nearbox") weight += 0.6;  
        break;

      case "counterattack":
        weight = 0.35;
        if (zone === "def_mid" || zone === "atk_mid") weight += 0.45;
        if (zone === "def_third") weight += 0.25;
        if (lane !== "center") weight += 0.15;
        break;

      default:
        weight = 1;
        break;
    }
  }

  return Math.max(weight, 0.05);
}

function pickWeightedActions(
  actions: WeightedAction[],
  count: number,
  random: () => number
): ActionType[] {
  const pool = [...actions];
  const selected: ActionType[] = [];
  const amount = Math.min(count, pool.length);

  for (let i = 0; i < amount; i++) {
    const index = pickWeightedIndex(pool, random);
    const chosen = pool[index];

    if (!chosen) {
      break;
    }

    selected.push(chosen.type);
    pool.splice(index, 1);
  }

  return selected;
}

function pickWeightedIndex(
  actions: WeightedAction[],
  random: () => number
): number {
  const totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  let roll = random() * totalWeight;

  for (let i = 0; i < actions.length; i++) {
    roll -= actions[i].weight;

    if (roll <= 0) {
      return i;
    }
  }

  return actions.length - 1;
}
