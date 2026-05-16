// src/match-engine/events.ts

import type { ActionDefinition, ActionType, Lane, Zone } from "../matchTypes";

const ALL_LANES: Lane[] = ["left", "center", "right"];
const SIDE_LANES: Lane[] = ["left", "right"];
const CENTER_LANE: Lane[] = ["center"];

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  side_pass: {
    type: "side_pass",
    label: "Side pass",
    category: "build_up",
    requiresPossession: true,
    allowedZones: [
      "def_box",
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
      "atk_nearbox",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.15,
    risk: 0.15,
    offensiveWeights: [
      { stat: "overall", weight: 0.4 },
      { stat: "passing", weight: 1.0 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.45 },
      { stat: "defending", weight: 0.75 },
      { stat: "pace", weight: 0.35 },
    ],
    successAdvanceRange: { min: 0, max: 1 },
    failRecoilRange: { min: 1, max: 2 },
  },

  forward_pass: {
    type: "forward_pass",
    label: "Through pass",
    category: "progression",
    canDrawFoul: true,
    requiresPossession: true,
    allowedZones: [
      "def_box",
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.38,
    risk: 0.38,
    canCreateBigChance: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.45 },
      { stat: "passing", weight: 1.1 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.45 },
      { stat: "defending", weight: 0.75 },
      { stat: "pace", weight: 0.44 },
    ],
    successAdvanceRange: { min: 1, max: 2 },
    failRecoilRange: { min: 1, max: 3 },
  },

  long_pass: {
    type: "long_pass",
    label: "Long pass",
    category: "progression",
    requiresPossession: true,
    allowedZones: [
      "def_box",
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third"
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.65,
    risk: 0.65,
    canCreateBigChance: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.38 },
      { stat: "passing", weight: 1.16 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.5 },
      { stat: "defending", weight: 0.6 },
      { stat: "pace", weight: 0.6 },
    ],
    successAdvanceRange: { min: 2, max: 3 },
    failRecoilRange: { min: 1, max: 3 },
  },

dribble: {
  type: "dribble",
  label: "Dribble",
  category: "duel",
  canDrawFoul: true,
  requiresPossession: true,
  allowedZones: [
    "def_nearbox",
    "def_third",
    "def_mid",
    "atk_mid",
    "atk_third",
    "atk_nearbox",
    "atk_box",
  ],
  allowedLanes: ALL_LANES,
  volatility: 0.52,
  risk: 0.48,
  canCreateBigChance: true,
  canLeadToShot: true,
  offensiveWeights: [
    { stat: "overall", weight: 0.4 },
    { stat: "dribbling", weight: 1.1 },
  ],
  defensiveWeights: [
    { stat: "overall", weight: 0.5 },
    { stat: "defending", weight: 1.4 },
  ],
  successAdvanceRange: { min: 1, max: 2 },
  failRecoilRange: { min: 1, max: 2 },
},

  sprint: {
    type: "sprint",
    label: "Sprint",
    category: "progression",
    canDrawFoul: true,
    requiresPossession: true,
    allowedZones: [
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
      "atk_nearbox",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.4,
    risk: 0.3,
    canCreateBigChance: true,
    canLeadToShot: true,
    offensiveWeights: [
      { stat: "pace", weight: 1.2 },
      { stat: "dribbling", weight: 0.6 },
      { stat: "overall", weight: 0.2 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.2 },
      { stat: "pace", weight: 0.78 },
      { stat: "physical", weight: 0.7 },
    ],
    successAdvanceRange: { min: 1, max: 2 },
    failRecoilRange: { min: 1, max: 2 },
  },

  shield: {
    type: "shield",
    label: "Shield ball",
    category: "duel",
    canDrawFoul: true,
    requiresPossession: true,
    allowedZones: [
      "def_box",
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
      "atk_nearbox",
      "atk_box",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.2,
    risk: 0.2,
    offensiveWeights: [
      { stat: "overall", weight: 0.35 },
      { stat: "physical", weight: 0.95 },
      { stat: "dribbling", weight: 0.35 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.4 },
      { stat: "physical", weight: 0.8 },
      { stat: "defending", weight: 0.55 },
    ],
    successAdvanceRange: { min: 0, max: 1 },
    failRecoilRange: { min: 1, max: 2 },
  },

    long_shot: {
    type: "long_shot",
    label: "Long shot",
    category: "shot",
    requiresPossession: true,
    allowedZones: ["atk_mid", "atk_third", "atk_nearbox"],
    allowedLanes: ALL_LANES,
    volatility: 0.55,
    risk: 0.78,
    canLeadToShot: true,
    isShot: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.25 },
      { stat: "shooting", weight: 0.85 },
      { stat: "physical", weight: 0.1 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.35 },
      { stat: "diving", weight: 1.0 },
      { stat: "reflexes", weight: 1.1 },
      { stat: "positioning", weight: 0.95 },
    ],
    successAdvanceRange: { min: 0, max: 0 },
    failRecoilRange: { min: 2, max: 2 },
  },

  finish: {
    type: "finish",
    label: "Finish",
    category: "shot",
    requiresPossession: true,
    allowedZones: ["atk_box", "atk_bigchance"],
    allowedLanes: ["center"],
    volatility: 0.35,
    risk: 0.38,
    canLeadToShot: true,
    isShot: true,
    offensiveWeights: [
    { stat: "overall",   weight: 0.80 },  
    { stat: "shooting",  weight: 1.27 },  
    { stat: "dribbling", weight: 0.20 },  
    ],
    defensiveWeights: [
      { stat: "overall",    weight: 0.80 },  
      { stat: "reflexes",   weight: 0.55 },  
      { stat: "positioning", weight: 0.45 }, 
    ],
    successAdvanceRange: { min: 0, max: 0 },
    failRecoilRange: { min: 1, max: 2 },
  },

  header: {
    type: "header",
    label: "Header",
    category: "shot",
    requiresPossession: true,
    allowedZones: ["atk_box"],
    allowedLanes: ["center"],
    volatility: 0.8,
    risk: 0.5,
    canLeadToShot: true,
    isShot: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.3 },
      { stat: "height", weight: 0.85 },
      { stat: "physical", weight: 0.65 },
      { stat: "shooting", weight: 0.45 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.25 },
      { stat: "height", weight: 0.45 },
      { stat: "reflexes", weight: 0.6 },
      { stat: "positioning", weight: 0.45 },
    ],
    successAdvanceRange: { min: 0, max: 0 },
    failRecoilRange: { min: 1, max: 1 },
  },

  clearance: {
    type: "clearance",
    label: "Clearance",
    category: "clearance",
    requiresPossession: true,
    allowedZones: ["def_box", "def_nearbox", "def_third"],
    allowedLanes: ALL_LANES,
    volatility: 0.2,
    risk: 0.2,
    offensiveWeights: [
      { stat: "overall", weight: 0.25 },
      { stat: "physical", weight: 0.45 },
      { stat: "defending", weight: 0.6 },
      { stat: "passing", weight: 0.15 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.2 },
      { stat: "physical", weight: 0.35 },
      { stat: "defending", weight: 0.25 },
    ],
    successAdvanceRange: { min: 2, max: 4 },
    failRecoilRange: { min: 1, max: 3 },
  },

  intercept: {
    type: "intercept",
    label: "Intercept",
    category: "defensive",
    requiresPossession: false,
    allowedZones: [
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
      "atk_nearbox",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.27,
    risk: 0.28,
    offensiveWeights: [
      { stat: "overall", weight: 0.38 },
      { stat: "pace", weight: 0.55 },
      { stat: "defending", weight: 0.7 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.55 },
      { stat: "passing", weight: 1.65 },
    ],
    defensiveRecoverRange: { min: 1, max: 2 },
    failRecoilRange: { min: 1, max: 3 },
  },
  gk_clearance: {
  type: "gk_clearance",
  label: "Goalkeeper distribution",
  category: "clearance",
  requiresPossession: true,
  allowedZones: ["atk_goalkeeper", "def_goalkeeper"],
  allowedLanes: ["center"],
  volatility: 0,
  risk: 0,
  offensiveWeights: [],
  defensiveWeights: [],
  successAdvanceRange: { min: 3, max: 4 },
  failRecoilRange: { min: 0, max: 0 },
},
  tackle: {
  type: "tackle",
  label: "Tackle",
  category: "defensive",
  requiresPossession: false,
  allowedZones: [
    "def_box",
    "def_nearbox",
    "def_third",
    "def_mid",
    "atk_mid",
    "atk_third",
    "atk_nearbox",
    "atk_box",
  ],
  allowedLanes: ALL_LANES,
  volatility: 0.3,
  risk: 0.32,
  canCauseFoul: true,
  offensiveWeights: [
    { stat: "overall", weight: 0.5 },
    { stat: "defending", weight: 1 },
    { stat: "physical", weight: 0.25 },
  ],
  defensiveWeights: [
    { stat: "overall", weight: 0.45 },
    { stat: "dribbling", weight: 1 },
    { stat: "pace", weight: 0.25 },
  ],
  defensiveRecoverRange: { min: 1, max: 1 },
  failRecoilRange: { min: 1, max: 3 },
},

  slide_tackle: {
    type: "slide_tackle",
    label: "Slide tackle",
    category: "defensive",
    requiresPossession: false,
    allowedZones: [
      "def_box",
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
      "atk_nearbox",
      "atk_box",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.75,
    risk: 0.8,
    canCauseFoul: true,
    canCauseCard: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.45 },
      { stat: "pace", weight: 0.55 },
      { stat: "physical", weight: 0.9 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.45 },
      { stat: "physical", weight: 0.55 },
      { stat: "dribbling", weight: 0.9 },
    ],
    defensiveRecoverRange: { min: 1, max: 2 },
    failRecoilRange: { min: 2, max: 2 },
  },

  block: {
    type: "block",
    label: "Block",
    category: "defensive",
    requiresPossession: false,
    allowedZones: ["def_box", "atk_box", "atk_bigchance"],
    allowedLanes: CENTER_LANE,
    volatility: 0.36,
    risk: 0.30,
    offensiveWeights: [
      { stat: "overall", weight: 0.37 },
      { stat: "defending", weight: 0.87 },
      { stat: "physical", weight: 0.48 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.35 },
      { stat: "shooting", weight: 0.95 },
    ],
    defensiveRecoverRange: { min: 1, max: 3 },
    failRecoilRange: { min: 1, max: 2 },
  },

  shoulder_charge: {
    type: "shoulder_charge",
    label: "Shoulder charge",
    category: "defensive",
    requiresPossession: false,
    allowedZones: [
      "def_nearbox",
      "def_third",
      "def_mid",
      "atk_mid",
      "atk_third",
      "atk_nearbox",
    ],
    allowedLanes: ALL_LANES,
    volatility: 0.6,
    risk: 0.45,
    canCauseFoul: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.35 },
      { stat: "physical", weight: 1.0 },
      { stat: "pace", weight: 0.3 },
    ],
    defensiveWeights: [
      { stat: "overall", weight: 0.35 },
      { stat: "physical", weight: 0.8 },
      { stat: "dribbling", weight: 0.5 },
    ],
    defensiveRecoverRange: { min: 1, max: 1 },
    failRecoilRange: { min: 1, max: 2 },
  },

  emergency_clearance: {
  type: "emergency_clearance",
  label: "Try to clear the ball",
  category: "defensive",
  requiresPossession: false,
  allowedZones: ["def_box", "def_nearbox"],
  allowedLanes: ALL_LANES,
  volatility: 0.73,
  risk: 0.74,
  offensiveWeights: [
    { stat: "overall", weight: 0.25 },
    { stat: "defending", weight: 0.5 },
    { stat: "physical", weight: 0.69 },
  ],
  defensiveWeights: [
    { stat: "overall", weight: 0.36 },
    { stat: "dribbling", weight: 0.79 },
    { stat: "physical", weight: 0.75 },
  ],
  defensiveRecoverRange: { min: 1, max: 3 },
  failRecoilRange: { min: 1, max: 3 },
},

  counterattack: {
    type: "counterattack",
    label: "Launch counterattack",
    category: "progression",
    requiresPossession: false,
    allowedZones: ["def_box", "def_nearbox", "def_third"],
    allowedLanes: ALL_LANES,
    volatility: 0.8,
    risk: 0.75,
    canCreateBigChance: true,
    canLeadToShot: true,
    offensiveWeights: [
      { stat: "overall", weight: 0.45 },
      { stat: "defending", weight: 0.5 },
      { stat: "pace", weight: 0.75 },
    ],
    defensiveWeights: [
      { stat: "pace", weight: 0.95 },
      { stat: "passing", weight: 0.8 },
      { stat: "dribbling", weight: 0.55 },
      { stat: "overall", weight: 0.3 },
    ],
    defensiveRecoverRange: { min: 2, max: 2 },
    failRecoilRange: { min: 2, max: 3 },
  },
  cross: {
  type: "cross",
  label: "Cross",
  category: "progression",
  requiresPossession: true,
  allowedZones: ["atk_third", "atk_nearbox"],
  allowedLanes: SIDE_LANES,
  volatility: 0.62,
  risk: 0.6,
  canCreateBigChance: true,
  canLeadToShot: true,
  offensiveWeights: [
    { stat: "overall", weight: 0.36 },
    { stat: "passing", weight: 0.8 },
    { stat: "dribbling", weight: 0.35 },
  ],
  defensiveWeights: [
    { stat: "overall", weight: 0.32 },
    { stat: "defending", weight: 0.8 },
    { stat: "physical", weight: 0.5 },
    { stat: "height", weight: 0.5 },
  ],
  successAdvanceRange: { min: 1, max: 3 },
  failRecoilRange: { min: 1, max: 3 },
},
  rush_save: {
  type: "rush_save",
  label: "Rush out",
  category: "defensive",
  requiresPossession: false,
  allowedZones: ["def_bigchance"],
  allowedLanes: ["center"],
  volatility: 0.75,
  risk: 0.85, // higher real-world risk
  canCauseFoul: true,
  canCauseCard: true,

 offensiveWeights: [
  { stat: "overall",     weight: 0.30 },  // era 0.55
  { stat: "speed",       weight: 0.75 },  // era 0.90
  { stat: "reflexes",    weight: 0.70 },  // era 0.85
  { stat: "positioning", weight: 0.45 },  // era 0.60
  { stat: "diving",      weight: 0.25 },  // era 0.30
],

  defensiveWeights: [
  { stat: "overall",   weight: 0.80 },  // era 0.40
  { stat: "shooting",  weight: 0.85 },  // era 1.25
  { stat: "dribbling", weight: 0.70 },  // era 1.10
  { stat: "pace",      weight: 0.50 },  // era 0.70
],

  defensiveRecoverRange: { min: 0, max: 1 },
  failRecoilRange: { min: 1, max: 2 }, 
},

  wait: {
  type: "wait",
  label: "Wait for the attacker",
  category: "defensive",
  requiresPossession: false,
  allowedZones: ["def_bigchance"],
  allowedLanes: ["center"],
  volatility: 0.55,
  risk: 0.2,

  offensiveWeights: [
  { stat: "overall",     weight: 0.55 },  // era 0.80
  { stat: "positioning", weight: 0.70 },  // era 0.55
  { stat: "reflexes",    weight: 0.65 },  // era 0.50
  { stat: "diving",      weight: 0.50 },  // era 0.45
  { stat: "handling",    weight: 0.35 },  // era 0.30
],

  // wait — defensiveWeights (atacante)
  defensiveWeights: [
    { stat: "overall",  weight: 0.80 },  // era 0.35 — âncora mais forte
    { stat: "shooting", weight: 0.65 },  // era 1.00 — menos dominante
    { stat: "dribbling", weight: 0.30 }, // era 0.45 — mantém baixo
  ],

  defensiveRecoverRange: { min: 0, max: 1 },
  failRecoilRange: { min: 0, max: 1 },
},
};

export function getActionDefinition(action: ActionType): ActionDefinition {
  return ACTION_DEFINITIONS[action];
}

export function getActionsForContext(params: {
  zone: Zone;
  lane: Lane;
  possession: "user" | "opponent";
}) {
  const { zone, lane, possession } = params;

  if (zone === "atk_goalkeeper" || zone === "def_goalkeeper") {
    return (Object.values(ACTION_DEFINITIONS) as ActionDefinition[]).filter(
      (action) =>
        action.type === "gk_clearance" &&
        action.allowedZones.includes(zone) &&
        (!action.allowedLanes || action.allowedLanes.includes(lane))
    );
  }

  return (Object.values(ACTION_DEFINITIONS) as ActionDefinition[]).filter(
    (action) => {
      const laneOk = !action.allowedLanes || action.allowedLanes.includes(lane);
      const zoneOk = action.allowedZones.includes(zone);

      const possessionOk = action.requiresPossession
        ? possession === "user"
        : possession === "opponent";

      return laneOk && zoneOk && possessionOk;
    }
  );
}
