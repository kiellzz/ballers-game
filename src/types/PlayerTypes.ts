export type Position =
  | "GK"
  | "LB"
  | "CB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "ST"
  | "RW";

export interface PlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface GKStats {
  diving: number;
  handling: number;
  kicking: number;
  reflexes: number;
  speed: number;
  positioning: number;
}

export interface Player {
  id: number;
  name: string;
  displayFullName?: boolean;
  overall: number;
  position: Position;
  secondaryPositions?: Position[];
  nationality: string;
  stats: PlayerStats | GKStats;
  isLegend?: boolean;
  height: number;
  isCustom?: boolean;        
  customImage?: string;  
}

// Helper para checar no componente
export const isGKStats = (stats: PlayerStats | GKStats): stats is GKStats => {
  return "diving" in stats;
};