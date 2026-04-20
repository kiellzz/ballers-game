import type { Position } from '../types/PlayerTypes';

// 1. Exporting type to avoid importing errors on Vite
export type FormationKey =
  | '4-3-3'
  | '4-3-3 (2)'
  | '4-3-3 (3)'
  | '4-3-3 (4)'
  | '4-4-2'
  | '4-4-2 (2)'
  | '4-4-2 (3)'
  | '4-2-4'
  | '4-1-2-1-2'
  | '5-3-2'
  | '5-3-2 (2)'
  | '5-3-2 (3)'
  | '5-2-3'
  | '3-4-3'
  | '3-5-2'
  | '3-5-2 (2)'
  | '3-5-2 (3)';

export interface SlotLayout {
  bottom: string;
  left: string;
}

export interface FormationConfig {
  label: FormationKey;
  positions: Position[];
  layout: SlotLayout[];
}

export const FORMATIONS: Record<FormationKey, FormationConfig> = {
  // ─────────────────────────────────────────────
  // 4-3-3: GK | LB CB CB RB | CDM CM CM | LW ST RW
  // ─────────────────────────────────────────────
  '4-3-3': {
    label: '4-3-3',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' }, // GK
      { bottom: '11%', left: '22%' }, // LB
      { bottom: '9%', left: '40%' },  // CB
      { bottom: '9%', left: '60%' },  // CB
      { bottom: '11%', left: '78%' }, // RB
      { bottom: '33%', left: '50%' }, // CM
      { bottom: '33%', left: '30%' }, // CM
      { bottom: '33%', left: '70%' }, // CM
      { bottom: '54%', left: '25%' }, // LW
      { bottom: '57%', left: '50%' }, // ST
      { bottom: '54%', left: '75%' }, // RW
    ],
  },

  '4-3-3 (2)': {
    label: '4-3-3 (2)',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' }, // GK
      { bottom: '11%', left: '22%' }, // LB
      { bottom: '9%', left: '40%' },  // CB
      { bottom: '9%', left: '60%' },  // CB
      { bottom: '11%', left: '78%' }, // RB
      { bottom: '27%', left: '50%' }, // CDM
      { bottom: '33%', left: '30%' }, // CM
      { bottom: '33%', left: '70%' }, // CM
      { bottom: '54%', left: '25%' }, // LW
      { bottom: '57%', left: '50%' }, // ST
      { bottom: '54%', left: '75%' }, // RW
    ],
  },

  '4-3-3 (3)': {
    label: '4-3-3 (3)',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '30%', left: '32%' }, // CM
      { bottom: '30%', left: '68%' }, // CM
      { bottom: '39%', left: '50%' }, // CAM
      { bottom: '54%', left: '25%' },
      { bottom: '57%', left: '50%' },
      { bottom: '54%', left: '75%' },
    ],
  },

  '4-3-3 (4)': {
    label: '4-3-3 (4)',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CDM', 'LW', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '38%', left: '50%' }, // CM
      { bottom: '26%', left: '32%' }, // CDM
      { bottom: '26%', left: '68%' }, // CDM
      { bottom: '54%', left: '25%' },
      { bottom: '57%', left: '50%' },
      { bottom: '54%', left: '75%' },
    ],
  },

  '4-4-2': {
    label: '4-4-2',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '35%', left: '18%' }, // LM
      { bottom: '33%', left: '40%' }, // CM
      { bottom: '33%', left: '60%' }, // CM
      { bottom: '35%', left: '82%' }, // RM
      { bottom: '57%', left: '38%' }, // ST
      { bottom: '57%', left: '62%' }, // ST
    ],
  },

  '4-4-2 (2)': {
    label: '4-4-2 (2)',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'CAM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '25%', left: '38%' }, // CDM
      { bottom: '25%', left: '62%' }, // CDM
      { bottom: '42%', left: '25%' }, // CAM
      { bottom: '42%', left: '75%' }, // CAM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '4-4-2 (3)': {
    label: '4-4-2 (3)',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LM', 'RM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '25%', left: '40%' }, // CDM
      { bottom: '25%', left: '60%' }, // CDM
      { bottom: '42%', left: '18%' }, // LM
      { bottom: '42%', left: '82%' }, // RM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '4-2-4': {
    label: '4-2-4',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LW', 'ST', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '33%', left: '38%' }, // CM
      { bottom: '33%', left: '62%' }, // CM
      { bottom: '54%', left: '18%' }, // LW
      { bottom: '57%', left: '38%' }, // ST
      { bottom: '57%', left: '62%' }, // ST
      { bottom: '54%', left: '82%' }, // RW
    ],
  },

  '4-1-2-1-2': {
    label: '4-1-2-1-2',
    positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '22%' },
      { bottom: '9%', left: '40%' },
      { bottom: '9%', left: '60%' },
      { bottom: '11%', left: '78%' },
      { bottom: '24%', left: '50%' }, // CDM
      { bottom: '36%', left: '33%' }, // CM
      { bottom: '36%', left: '67%' }, // CM
      { bottom: '41%', left: '50%' }, // CAM
      { bottom: '57%', left: '36%' },
      { bottom: '57%', left: '64%' },
    ],
  },

  '5-3-2': {
    label: '5-3-2',
    positions: ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '14%' }, // LB
      { bottom: '9%', left: '32%' },  // CB
      { bottom: '9%', left: '50%' },  // CB
      { bottom: '9%', left: '68%' },  // CB
      { bottom: '11%', left: '86%' }, // RB
      { bottom: '36%', left: '30%' }, // CM
      { bottom: '38%', left: '50%' }, // CM central
      { bottom: '36%', left: '70%' }, // CM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '5-3-2 (2)': {
    label: '5-3-2 (2)',
    positions: ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '14%' },
      { bottom: '9%', left: '32%' },
      { bottom: '9%', left: '50%' },
      { bottom: '9%', left: '68%' },
      { bottom: '11%', left: '86%' },
      { bottom: '33%', left: '35%' }, // CM
      { bottom: '33%', left: '65%' }, // CM
      { bottom: '46%', left: '50%' }, // CAM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '5-3-2 (3)': {
    label: '5-3-2 (3)',
    positions: ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '14%' },
      { bottom: '9%', left: '32%' },
      { bottom: '9%', left: '50%' },
      { bottom: '9%', left: '68%' },
      { bottom: '11%', left: '86%' },
      { bottom: '26%', left: '50%' }, // CDM
      { bottom: '38%', left: '35%' }, // CM
      { bottom: '38%', left: '65%' }, // CM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '5-2-3': {
    label: '5-2-3',
    positions: ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LW', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '11%', left: '14%' },
      { bottom: '9%', left: '32%' },
      { bottom: '9%', left: '50%' },
      { bottom: '9%', left: '68%' },
      { bottom: '11%', left: '86%' },
      { bottom: '33%', left: '38%' }, // CM
      { bottom: '33%', left: '62%' }, // CM
      { bottom: '54%', left: '22%' }, // LW
      { bottom: '57%', left: '50%' }, // ST
      { bottom: '54%', left: '78%' }, // RW
    ],
  },

  '3-4-3': {
    label: '3-4-3',
    positions: ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'LW', 'ST', 'RW'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '9%', left: '28%' }, // CB
      { bottom: '9%', left: '50%' }, // CB
      { bottom: '9%', left: '72%' }, // CB
      { bottom: '35%', left: '16%' }, // LM
      { bottom: '33%', left: '40%' }, // CM
      { bottom: '33%', left: '60%' }, // CM
      { bottom: '35%', left: '84%' }, // RM
      { bottom: '54%', left: '22%' }, // LW
      { bottom: '57%', left: '50%' }, // ST
      { bottom: '54%', left: '78%' }, // RW
    ],
  },

  '3-5-2': {
    label: '3-5-2',
    positions: ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '9%', left: '28%' },
      { bottom: '9%', left: '50%' },
      { bottom: '9%', left: '72%' },
      { bottom: '35%', left: '16%' }, // LM
      { bottom: '33%', left: '35%' }, // CM
      { bottom: '38%', left: '50%' }, // CM central
      { bottom: '33%', left: '65%' }, // CM
      { bottom: '35%', left: '84%' }, // RM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '3-5-2 (2)': {
    label: '3-5-2 (2)',
    positions: ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CAM', 'RM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '9%', left: '28%' },
      { bottom: '9%', left: '50%' },
      { bottom: '9%', left: '72%' },
      { bottom: '38%', left: '16%' }, // LM
      { bottom: '33%', left: '38%' }, // CM
      { bottom: '33%', left: '62%' }, // CM
      { bottom: '46%', left: '50%' }, // CAM
      { bottom: '38%', left: '84%' }, // RM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },

  '3-5-2 (3)': {
    label: '3-5-2 (3)',
    positions: ['GK', 'CB', 'CB', 'CB', 'LM', 'CDM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    layout: [
      { bottom: '-5%', left: '50%' },
      { bottom: '9%', left: '28%' },
      { bottom: '9%', left: '50%' },
      { bottom: '9%', left: '72%' },
      { bottom: '38%', left: '16%' }, // LM
      { bottom: '26%', left: '50%' }, // CDM
      { bottom: '38%', left: '35%' }, // CM
      { bottom: '38%', left: '65%' }, // CM
      { bottom: '38%', left: '84%' }, // RM
      { bottom: '57%', left: '38%' },
      { bottom: '57%', left: '62%' },
    ],
  },
};

export const DEFAULT_FORMATION: FormationKey = '4-3-3';
export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[];
