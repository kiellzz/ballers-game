import type { Position, PlayerStats, GKStats } from "../types/PlayerTypes";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type OutfieldWeights = Record<keyof PlayerStats, number>;

// ── Pesos por posição ─────────────────────────────────────────────────────────
//
//  Critérios usados para calibrar cada posição:
//
//  ST  → Finalização é dominante; velocidade e físico como suporte.
//  LW/RW → Velocidade + drible pesados; finalização moderada.
//  CAM → Drible + passe empatados no topo; finalização relevante.
//  LM/RM → Velocidade alta, drible e passe equilibrados.
//  CM  → Passe lidera; drible, físico e defesa equilibrados.
//  CDM → Defesa é o maior peso; físico e passe como suporte.
//  LB/RB → Velocidade e defesa dominam; passe e drible secundários.
//  CB  → Defesa fortíssima; físico como reforço; resto mínimo.
//
//  Todos os pesos de cada posição somam exatamente 1.00.

export const POSITION_WEIGHTS: Record<Position, OutfieldWeights> = {
  ST: {
    pace:       0.20,
    shooting:   0.45,
    passing:    0.07,
    dribbling:  0.18,
    defending:  0.00,
    physical:   0.10,
  },
  LW: {
    pace:       0.30,
    shooting:   0.18,
    passing:    0.13,
    dribbling:  0.38,
    defending:  0.00,
    physical:   0.03,
  },
  RW: {
    pace:       0.30,
    shooting:   0.18,
    passing:    0.13,
    dribbling:  0.38,
    defending:  0.00,
    physical:   0.03,
  },
  CAM: {
    pace:       0.10,
    shooting:   0.24,
    passing:    0.33,
    dribbling:  0.30,
    defending:  0.02,
    physical:   0.05,
  },
  LM: {
    pace:       0.24,
    shooting:   0.16,
    passing:    0.22,
    dribbling:  0.26,
    defending:  0.04,
    physical:   0.08,
  },
  RM: {
    pace:       0.24,
    shooting:   0.16,
    passing:    0.22,
    dribbling:  0.26,
    defending:  0.04,
    physical:   0.08,
  },
  CM: {
    pace:       0.08,
    shooting:   0.12,
    passing:    0.38,
    dribbling:  0.22,
    defending:  0.14,
    physical:   0.10,
  },
  CDM: {
    pace:       0.07,
    shooting:   0.04,
    passing:    0.22,
    dribbling:  0.12,
    defending:  0.36,
    physical:   0.19,
  },
  LB: {
    pace:       0.27,
    shooting:   0.03,
    passing:    0.17,
    dribbling:  0.14,
    defending:  0.29,
    physical:   0.10,
  },
  RB: {
    pace:       0.27,
    shooting:   0.03,
    passing:    0.17,
    dribbling:  0.14,
    defending:  0.29,
    physical:   0.10,
  },
  CB: {
    pace:       0.08,
    shooting:   0.01,
    passing:    0.08,
    dribbling:  0.02,
    defending:  0.54,
    physical:   0.27,
  },
  // GK não usa OutfieldWeights — incluído só para satisfazer o tipo Record<Position, ...>
  GK: {
    pace:       0.00,
    shooting:   0.00,
    passing:    0.00,
    dribbling:  0.00,
    defending:  0.00,
    physical:   0.00,
  },
};

// ── Pesos do goleiro ──────────────────────────────────────────────────────────
//
//  Reflexos e posicionamento são os atributos mais determinantes para um GK.
//  Diving e handling vêm logo atrás. Speed e kicking têm peso menor.

export const GK_WEIGHTS: Record<keyof GKStats, number> = {
  diving:      0.24,
  handling:    0.26,
  kicking:     0.05,
  reflexes:    0.27,
  speed:       0.02,
  positioning: 0.20,
};

// ── Funções de cálculo ────────────────────────────────────────────────────────

export function calcOutfieldOverall(stats: PlayerStats, position: Position): number {
  const w = POSITION_WEIGHTS[position];
  const raw =
    stats.pace       * w.pace      +
    stats.shooting   * w.shooting  +
    stats.passing    * w.passing   +
    stats.dribbling  * w.dribbling +
    stats.defending  * w.defending +
    stats.physical   * w.physical;

  return Math.min(99, Math.round(raw));
}

export function calcGKOverall(stats: GKStats): number {
  const raw =
    stats.diving      * GK_WEIGHTS.diving      +
    stats.handling    * GK_WEIGHTS.handling    +
    stats.kicking     * GK_WEIGHTS.kicking     +
    stats.reflexes    * GK_WEIGHTS.reflexes    +
    stats.speed       * GK_WEIGHTS.speed       +
    stats.positioning * GK_WEIGHTS.positioning;

  return Math.min(99, Math.round(raw));
}

export function calcOverall(
  stats: PlayerStats | GKStats,
  isGK: boolean,
  position: Position,
): number {
  if (isGK) return calcGKOverall(stats as GKStats);
  return calcOutfieldOverall(stats as PlayerStats, position);
}

// ── Sugestão de posição ───────────────────────────────────────────────────────
//
//  Pontua cada posição com base nos atributos e retorna a melhor.
//  GK é excluído — só pode ser escolhido manualmente.

export function suggestPosition(stats: PlayerStats): Exclude<Position, "GK"> {
  const { pace, shooting, passing, dribbling, defending, physical } = stats;

  const scores: Record<Exclude<Position, "GK">, number> = {
    CB:  defending * 0.50 + physical * 0.28 + pace * 0.12 + passing * 0.10,
    LB:  defending * 0.28 + pace * 0.32 + dribbling * 0.18 + passing * 0.16 + physical * 0.06,
    RB:  defending * 0.28 + pace * 0.32 + dribbling * 0.17 + passing * 0.16 + physical * 0.07,
    CDM: defending * 0.42 + passing * 0.24 + physical * 0.20 + dribbling * 0.14,
    CM:  passing * 0.32 + dribbling * 0.22 + defending * 0.18 + shooting * 0.14 + physical * 0.14,
    CAM: dribbling * 0.30 + passing * 0.26 + shooting * 0.26 + pace * 0.18,
    LM:  pace * 0.28 + dribbling * 0.28 + passing * 0.22 + shooting * 0.22,
    RM:  pace * 0.28 + dribbling * 0.29 + passing * 0.21 + shooting * 0.22,
    LW:  pace * 0.30 + dribbling * 0.36 + shooting * 0.19 + passing * 0.15,
    RW:  pace * 0.30 + dribbling * 0.36 + shooting * 0.20 + passing * 0.14,
    ST:  shooting * 0.42 + pace * 0.24 + physical * 0.18 + dribbling * 0.16,
  };

  const sorted = (Object.entries(scores) as [Exclude<Position, "GK">, number][])
    .sort(([, a], [, b]) => b - a);

  return sorted[0][0];
}