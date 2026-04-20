import type { Zone } from "./matchTypes";

export const DEFENSIVE_ZONES: Zone[] = [
  "def_goalkeeper",
  "def_bigchance",
  "def_box",
  "def_nearbox",
  "def_third",
  "def_mid",
];

export const MID_ZONES: Zone[] = ["def_mid", "atk_mid"];

export const ATTACKING_ZONES: Zone[] = [
  "atk_mid",
  "atk_third",
  "atk_nearbox",
  "atk_box",
  "atk_bigchance",
  "atk_goalkeeper"
];

export const BOX_ZONES: Zone[] = ["def_box", "atk_box"];
export const BIG_CHANCE_ZONES: Zone[] = ["def_bigchance", "atk_bigchance"];
export const NEARBOX_ZONES: Zone[] = ["def_nearbox", "atk_nearbox"];
export const THIRDS: Zone[] = ["def_third", "atk_third"];