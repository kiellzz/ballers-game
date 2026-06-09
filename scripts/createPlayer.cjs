// Create a player JSON manually from terminal input.
// Run from the project root with: node scripts/createPlayer.cjs
// Preview without saving with: node scripts/createPlayer.cjs --dry-run

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");

const rootDir = path.join(__dirname, "..");
const playersDataPath = path.join(rootDir, "src", "data", "PlayersData.ts");
const playerTypesPath = path.join(rootDir, "src", "types", "PlayerTypes.ts");
const outputDir = path.join(__dirname, "output");
const dryRun = process.argv.includes("--dry-run");

const fieldStats = ["pace", "shooting", "passing", "dribbling", "defending", "physical"];
const goalkeeperStats = ["diving", "handling", "kicking", "reflexes", "speed", "positioning"];

function createPrompt() {
  if (process.stdin.isTTY) {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  const answers = fs.readFileSync(0, "utf8").split(/\r?\n/);
  let currentAnswer = 0;

  return {
    async question(questionText) {
      process.stdout.write(questionText);

      if (currentAnswer >= answers.length) {
        throw new Error(`Missing answer for prompt: ${questionText}`);
      }

      const answer = answers[currentAnswer];
      currentAnswer += 1;
      process.stdout.write(`${answer}\n`);

      return answer;
    },
    close() {},
  };
}

function getPositions() {
  const playerTypes = fs.readFileSync(playerTypesPath, "utf8");
  const positionType = playerTypes.match(/export type Position\s*=\s*([\s\S]*?);/);

  if (!positionType) {
    throw new Error(`Could not find Position type in ${playerTypesPath}`);
  }

  return [...positionType[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function getNextId() {
  const playersData = fs.readFileSync(playersDataPath, "utf8");
  const ids = [...playersData.matchAll(/\bid\s*:\s*(\d+)/g)].map((match) => Number(match[1]));

  if (ids.length === 0) {
    throw new Error(`Could not find player ids in ${playersDataPath}`);
  }

  return Math.max(...ids) + 1;
}

function createPlayer({
  id,
  name,
  displayFullName,
  overall,
  position,
  secondaryPositions,
  nationality,
  stats,
  height,
}) {
  const player = {
    id,
    name,
  };

  if (displayFullName) {
    player.displayFullName = true;
  }

  player.overall = overall;
  player.position = position;

  if (secondaryPositions.length > 0) {
    player.secondaryPositions = secondaryPositions;
  }

  player.nationality = nationality;
  player.stats = stats;
  player.height = height;

  return player;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function askUntilValid(rl, question, validate) {
  while (true) {
    const answer = (await rl.question(question)).trim();
    const result = validate(answer);

    if (result.ok) {
      return result.value;
    }

    console.log(result.message);
  }
}

async function askRequiredText(rl, label) {
  return askUntilValid(rl, `${label}: `, (answer) => {
    if (answer.length > 0) {
      return { ok: true, value: answer };
    }

    return { ok: false, message: `${label} cannot be empty.` };
  });
}

async function askNumber(rl, label, min, max) {
  return askUntilValid(rl, `${label} (${min}-${max}): `, (answer) => {
    const value = Number(answer);

    if (Number.isInteger(value) && value >= min && value <= max) {
      return { ok: true, value };
    }

    return { ok: false, message: `Enter an integer from ${min} to ${max}.` };
  });
}

async function askYesNo(rl, label) {
  return askUntilValid(rl, `${label} (y/n): `, (answer) => {
    const normalized = answer.toLowerCase();

    if (normalized === "y" || normalized === "yes") {
      return { ok: true, value: true };
    }

    if (normalized === "n" || normalized === "no") {
      return { ok: true, value: false };
    }

    return { ok: false, message: "Enter y or n." };
  });
}

async function askPosition(rl, positions, label) {
  return askUntilValid(rl, `${label} (${positions.join(", ")}): `, (answer) => {
    const value = answer.toUpperCase();

    if (positions.includes(value)) {
      return { ok: true, value };
    }

    return { ok: false, message: `Choose one of: ${positions.join(", ")}.` };
  });
}

async function askSecondaryPositions(rl, positions, mainPosition) {
  const hasSecondaryPositions = await askYesNo(rl, "Secondary positions?");

  if (!hasSecondaryPositions) {
    return [];
  }

  return askUntilValid(
    rl,
    `Secondary positions, comma separated (${positions.join(", ")}): `,
    (answer) => {
      const values = answer
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);

      const uniqueValues = [...new Set(values)];
      const invalidValues = uniqueValues.filter((value) => !positions.includes(value));

      if (uniqueValues.length === 0) {
        return { ok: false, message: "Enter at least one secondary position." };
      }

      if (invalidValues.length > 0) {
        return { ok: false, message: `Invalid positions: ${invalidValues.join(", ")}.` };
      }

      if (uniqueValues.includes(mainPosition)) {
        return { ok: false, message: "Secondary positions cannot include the main position." };
      }

      return { ok: true, value: uniqueValues };
    },
  );
}

async function askStats(rl, position) {
  const statNames = position === "GK" ? goalkeeperStats : fieldStats;
  const stats = {};

  console.log(position === "GK" ? "Goalkeeper stats" : "Player stats");

  for (const statName of statNames) {
    stats[statName] = await askNumber(rl, statName, 1, 99);
  }

  return stats;
}

async function main() {
  const positions = getPositions();
  const id = getNextId();
  const rl = createPrompt();

  try {
    console.log(`ID: ${id} (auto)`);

    const name = await askRequiredText(rl, "Name");
    const overall = await askNumber(rl, "Overall", 1, 99);
    const position = await askPosition(rl, positions, "Position");
    const displayFullName = await askYesNo(rl, "Display full name?");
    const secondaryPositions = await askSecondaryPositions(rl, positions, position);
    const nationality = await askRequiredText(rl, "Nationality");
    const stats = await askStats(rl, position);
    const height = await askNumber(rl, "Height in cm", 100, 250);

    const player = createPlayer({
      id,
      name,
      displayFullName,
      overall,
      position,
      secondaryPositions,
      nationality,
      stats,
      height,
    });

    const json = `${JSON.stringify(player, null, 2)}\n`;
    console.log("\nGenerated JSON:");
    console.log(json);

    if (dryRun) {
      console.log("Dry run enabled. No file was saved.");
      return;
    }

    const shouldSave = await askYesNo(rl, "Save JSON file?");

    if (!shouldSave) {
      console.log("Player JSON was not saved.");
      return;
    }

    fs.mkdirSync(outputDir, { recursive: true });

    const fileName = `player-${id}-${slugify(name) || "new-player"}.json`;
    const outputPath = path.join(outputDir, fileName);

    fs.writeFileSync(outputPath, json, "utf8");

    console.log(`Saved to ${outputPath}`);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  createPlayer,
  getNextId,
  getPositions,
};
