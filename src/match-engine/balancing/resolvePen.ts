export type PenaltyChoice =
  | "top_left"
  | "bottom_left"
  | "center"
  | "top_right"
  | "bottom_right";

export type PenaltyResult = "goal" | "save_clean" | "save_touch";

export interface PenaltyTaker {
  finishing: number;
  overall: number;
  penalty?: number;
}

export interface PenaltyGoalkeeper {
  reflexes: number;
  diving: number;
}

export interface ResolvePenInput {
  shooterChoice: PenaltyChoice;
  keeperChoice?: PenaltyChoice;
  taker: PenaltyTaker;
  goalkeeper: PenaltyGoalkeeper;
  random?: () => number;
}

export interface ResolvePenOutput {
  shooterChoice: PenaltyChoice;
  keeperChoice: PenaltyChoice;
  result: PenaltyResult;
  scoreChance: number;
  saveChance: number;
}

const PENALTY_CHOICES: PenaltyChoice[] = [
  "top_left",
  "bottom_left",
  "center",
  "top_right",
  "bottom_right",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickRandomChoice(
  choices: readonly PenaltyChoice[],
  random: () => number
): PenaltyChoice {
  const index = Math.floor(random() * choices.length);
  return choices[index] ?? choices[0];
}

function getChoiceModifier(choice: PenaltyChoice): number {
  switch (choice) {
    case "top_left":
    case "top_right":
      return 3;
    case "bottom_left":
    case "bottom_right":
      return 1;
    case "center":
      return -8;
    default:
      return 0;
  }
}

function isSameSide(
  shooterChoice: PenaltyChoice,
  keeperChoice: PenaltyChoice
): boolean {
  const leftSide =
    (shooterChoice === "top_left" || shooterChoice === "bottom_left") &&
    (keeperChoice === "top_left" || keeperChoice === "bottom_left");

  const rightSide =
    (shooterChoice === "top_right" || shooterChoice === "bottom_right") &&
    (keeperChoice === "top_right" || keeperChoice === "bottom_right");

  return leftSide || rightSide;
}

function getSameSideAlternatives(choice: PenaltyChoice): PenaltyChoice[] {
  switch (choice) {
    case "top_left":
      return ["bottom_left"];
    case "bottom_left":
      return ["top_left"];
    case "top_right":
      return ["bottom_right"];
    case "bottom_right":
      return ["top_right"];
    case "center":
      return [];
    default:
      return [];
  }
}

function getDifferentChoices(choice: PenaltyChoice): PenaltyChoice[] {
  return PENALTY_CHOICES.filter((item) => item !== choice);
}

function pickKeeperChoice(params: {
  shooterChoice: PenaltyChoice;
  goalkeeper: PenaltyGoalkeeper;
  random: () => number;
}): PenaltyChoice {
  const { shooterChoice, goalkeeper, random } = params;

  const keeperReadPower =
    goalkeeper.reflexes * 0.55 + goalkeeper.diving * 0.45;

  const exactReadChance = clamp(
    0.1 + (keeperReadPower - 60) * 0.004,
    0.1,
    0.26
  );

  const sameSideReadChance = clamp(
    0.15 + (keeperReadPower - 60) * 0.004,
    0.15,
    0.28
  );

  const roll = random();

  if (roll < exactReadChance) {
    return shooterChoice;
  }

  if (roll < exactReadChance + sameSideReadChance) {
    const sameSideChoices = getSameSideAlternatives(shooterChoice);

    if (sameSideChoices.length > 0) {
      return pickRandomChoice(sameSideChoices, random);
    }
  }

  const differentChoices = getDifferentChoices(shooterChoice);
  return pickRandomChoice(differentChoices, random);
}

export function resolvePen(input: ResolvePenInput): ResolvePenOutput {
  const { shooterChoice, taker, goalkeeper, random = Math.random } = input;

  const keeperChoice =
    input.keeperChoice ??
    pickKeeperChoice({
      shooterChoice,
      goalkeeper,
      random,
    });

  const takerPenalty = taker.penalty ?? taker.finishing;

  const takerPower =
    taker.finishing * 0.38 +
    taker.overall * 0.22 +
    takerPenalty * 0.4;

  const goalkeeperPower =
    goalkeeper.reflexes * 0.52 +
    goalkeeper.diving * 0.48;

  const baseChance = 61 + (takerPower - goalkeeperPower) * 0.24;
  const choiceModifier = getChoiceModifier(shooterChoice);

  const exactMatch = shooterChoice === keeperChoice;
  const sameSide = isSameSide(shooterChoice, keeperChoice);

  let scoreChance = baseChance + choiceModifier;
  let saveChance = 0;
  let result: PenaltyResult = "goal";

  if (exactMatch) {
    scoreChance = 0;
    saveChance = 100;
    result = "save_clean";
  } else if (sameSide) {
    scoreChance -= 8;
    scoreChance = clamp(scoreChance, 45, 96);

    saveChance = clamp(
      38 + (goalkeeperPower - takerPower) * 0.32,
      28,
      62
    );

    const roll = random() * 100;
    result = roll < saveChance ? "save_touch" : "goal";
  } else {
    scoreChance = 100;
    saveChance = 0;
    result = "goal";
  }

  return {
    shooterChoice,
    keeperChoice,
    result,
    scoreChance,
    saveChance:
      result === "save_clean" || result === "save_touch" ? saveChance : 0,
  };
}