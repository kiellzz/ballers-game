const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const configPath = path.join(__dirname, "themes", "config.cjs");
const activeThemePath = path.join(rootDir, "src", "styles", "active-theme.css");
const activeThemeClassPath = path.join(rootDir, "src", "styles", "activeTheme.ts");

const themes = {
  worldCup: {
    className: "theme-world-cup",
    source: path.join(__dirname, "themes", "world-cup.css"),
  },
};

function getActiveThemes(config) {
  return Object.entries(themes)
    .filter(([key]) => config[key] === true)
    .map(([key, theme]) => ({ key, ...theme }));
}

function ensureOutputDir() {
  fs.mkdirSync(path.dirname(activeThemePath), { recursive: true });
}

function applyTheme() {
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  const activeThemes = getActiveThemes(config);

  if (activeThemes.length > 1) {
    const names = activeThemes.map((theme) => theme.key).join(", ");
    throw new Error(`Only one theme can be active at a time. Active themes: ${names}`);
  }

  ensureOutputDir();

  if (activeThemes.length === 0) {
    fs.writeFileSync(
      activeThemePath,
      "/* No active theme. Keep this file imported so scripts can swap themes safely. */\n",
      "utf8",
    );
    fs.writeFileSync(
      activeThemeClassPath,
      'export const activeThemeClass = "";\n',
      "utf8",
    );
    console.log("No active theme. Default UI is active.");
    return;
  }

  const theme = activeThemes[0];
  const css = fs.readFileSync(theme.source, "utf8");
  fs.writeFileSync(activeThemePath, css, "utf8");
  fs.writeFileSync(
    activeThemeClassPath,
    `export const activeThemeClass = "${theme.className}";\n`,
    "utf8",
  );

  console.log(`Applied ${theme.key} theme.`);
  console.log(`Add body class: ${theme.className}`);
}

try {
  applyTheme();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
