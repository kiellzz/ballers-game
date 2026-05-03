// src/match-engine/matchTypes.ts
import type { InteractiveSetPieceState } from "./interactive/interactiveSetPieceFlow";

export type Lane = "left" | "center" | "right";

export type Zone =
  | "def_goalkeeper" // ball at the opponent goalkeeper
  | "def_bigchance" // center only
  | "def_box" // center only
  | "def_nearbox" // left or right only
  | "def_third"
  | "def_mid"
  | "atk_mid"
  | "atk_third"
  | "atk_nearbox" // left or right only
  | "atk_box" // center only
  | "atk_bigchance" // center only
  | "atk_goalkeeper" // ball at the user goalkeeper
  | "atk_corner"
  | "def_corner"

export type PossessionSide = "user" | "opponent";

export type SituationType =
  | "open_play"
  | "set_piece";

export type SetPieceType = "penalty" | "freekick" | "corner";

export type EventOutcome =
  | "fail_high"
  | "fail"
  | "success"
  | "success_high";

export type ShotOutcome =
  | "goal"
  | "save"
  | "rebound"
  | "post"
  | "miss"
  | "blocked";

export type CardType = "none" | "yellow" | "red";

export type ActionCategory =
  | "build_up"
  | "progression"
  | "duel"
  | "shot"
  | "defensive"
  | "clearance"

export type ActionType =
  // in possession
  | "side_pass" // switches lane
  | "forward_pass" // advances in the same lane
  | "long_pass" // riskier, but advances at least 2 zones on success
  | "dribble"
  | "sprint"
  | "shield"
  | "long_shot"
  | "finish"
  | "header"
  | "gk_clearance" // only in def_goalkeeper
  | "clearance" // only in defensive zones, used to relieve pressure, with a high risk of losing possession
  | "cross" // similar to long_pass, but only available in wide zones
  // out of possession
  | "intercept"
  | "tackle"
  | "slide_tackle"
  | "block"
  | "shoulder_charge"
  | "emergency_clearance"
  | "counterattack"
  | "rush_save" // goalkeeper action in def_bigchance -> rush straight at the attacker
  | "wait" // goalkeeper action in def_bigchance -> wait for the shooter to finish

export type OutfieldStat =
  | "overall"
  | "pace"
  | "shooting"
  | "passing"
  | "dribbling"
  | "defending"
  | "physical"
  | "height";

export type GoalkeeperStat =
  | "overall"
  | "diving"
  | "reflexes"
  | "speed"
  | "handling"
  | "kicking"
  | "positioning"
  | "height";

export type AnyStat = OutfieldStat | GoalkeeperStat;

export interface OutfieldStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface GoalkeeperStats {
  diving: number;
  reflexes: number;
  speed: number;
  handling: number;
  kicking: number;
  positioning: number;
}

export interface BaseMatchPlayer {
  id: number;
  name: string;
  overall: number;
  position: string;
  lineupPosition?: string;
  secondaryPositions?: string[];
  nationality: string;
  height: number;
}

export interface OutfieldMatchPlayer extends BaseMatchPlayer {
  role: "outfield";
  stats: OutfieldStats;
}

export interface GoalkeeperMatchPlayer extends BaseMatchPlayer {
  role: "goalkeeper";
  stats: GoalkeeperStats;
}

export type MatchPlayer = OutfieldMatchPlayer | GoalkeeperMatchPlayer;

export interface MatchTeam {
  teamId: string;
  teamName: string;
  starters: MatchPlayer[];
}

export interface WeightedStat {
  stat: AnyStat;
  weight: number;
}

export interface ActionDefinition {
  type: ActionType;
  label: string;
  category: ActionCategory;
  requiresPossession: boolean;
  allowedZones: Zone[];
  allowedLanes?: Lane[];
  volatility: number; // 0 to 1
  risk: number; // 0 to 1
  canDrawFoul?: boolean;
  canCauseFoul?: boolean;
  canCauseCard?: boolean;
  canCreateBigChance?: boolean;
  canLeadToShot?: boolean;
  isShot?: boolean;
  isSetPieceAction?: boolean;
  offensiveWeights: WeightedStat[];
  defensiveWeights: WeightedStat[];
  successAdvanceRange?: {
    min: number;
    max: number;
  };
  failRecoilRange?: {
    min: number;
    max: number;
  };
  defensiveRecoverRange?: {
    min: number;
    max: number;
  };
}

export interface MatchScore {
  user: number;
  opponent: number;
}

export interface MatchClock {
  minute: number;
  extraTime?: number;
}

export interface PlayerMatchStatLine {
  // ── Offensive ──────────────────────────────────────────────────────────────
  goals: number;
  assists: number;
  keyPasses: number;           // pass that directly sets up a shot (createdBigChance)
  bigChancesCreated: number;   // any action with createdBigChance && success
  successfulDribbles: number;  // action=dribble && outcome=success|success_high
  crosses: number;             // action=cross && outcome=success|success_high
  shotsOnTarget: number;       // shot outcome=save (on target, saved by GK)

  // ── Defensive ──────────────────────────────────────────────────────────────
  defensiveActions: number;    // intercept/tackle/slide_tackle/block/shoulder_charge/emergency_clearance success
  saves: number;               // GK only — shot outcome=save on their side
  goalsConceded: number;       // GK only — goal scored against their side

  // ── Negative ───────────────────────────────────────────────────────────────
  failedDribbles: number;      // action=dribble && outcome=fail|fail_high
  lostPossessions: number;     // offensive action failed and possession changed
}

/**
 * Creates a zeroed-out stat line. Use this wherever a new entry is initialised
 * in playerMatchStats instead of relying on partial object literals.
 */
export function emptyStatLine(): PlayerMatchStatLine {
  return {
    goals: 0,
    assists: 0,
    keyPasses: 0,
    bigChancesCreated: 0,
    successfulDribbles: 0,
    crosses: 0,
    shotsOnTarget: 0,
    defensiveActions: 0,
    saves: 0,
    goalsConceded: 0,
    failedDribbles: 0,
    lostPossessions: 0,
  };
}

/**
 * Key format: `"${side}:${playerId}"` — e.g. "user:12" or "opponent:12".
 * Using a compound key prevents players with the same id on different teams
 * from sharing stats.
 */
export type PlayerMatchStats = Record<string, PlayerMatchStatLine>;

export interface MatchContext {
  phase: "playing" | "finished";
  turn: number;
  score: MatchScore;
  clock: MatchClock;
}

export interface MatchActors {
  userPlayer: MatchPlayer;
  opponentPlayer: MatchPlayer;
  userGoalkeeper: GoalkeeperMatchPlayer;
  opponentGoalkeeper: GoalkeeperMatchPlayer;
  supportUserPlayer?: MatchPlayer | null;
  supportOpponentPlayer?: MatchPlayer | null;
}

export interface MatchSituation {
  type: SituationType;
  setPieceType?: SetPieceType | null;
  zone: Zone;
  lane: Lane;
  possession: PossessionSide;
  availableActions: ActionType[];
  actors: MatchActors;
  isBigChance: boolean;
}

export interface DuelContext {
  action: ActionType;
  zone: Zone;
  lane: Lane;
  possession: PossessionSide;
  situationType: SituationType;
  setPieceType?: SetPieceType | null;
  actors: MatchActors;
}

export interface StatBreakdownEntry {
  stat: AnyStat;
  weight: number;
  baseValue: number;
  contribution: number;
}

export interface SideScoreBreakdown {
  total: number;
  entries: StatBreakdownEntry[];
}

export interface DuelScores {
  offensive: SideScoreBreakdown;
  defensive: SideScoreBreakdown;
  rawDelta: number;
}

export interface RandomizedOutcome {
  outcome: EventOutcome;
  randomSwing: number;
  finalDelta: number;
  volatilityApplied: number;
}

export interface FoulResult {
  committed: boolean;
  by: PossessionSide | null;
  card: CardType;
  setPieceAwarded: SetPieceType | null;
  awardedTo: PossessionSide | null;
  description?: string;
}

export interface ShotResult {
  happened: boolean;
  outcome: ShotOutcome | null;
  scoredBy: PossessionSide | null;
  reboundKeptBy: PossessionSide | null;
  setPieceAwarded?: SetPieceType | null;
}

export interface EventTransition {
  fromZone: Zone;
  toZone: Zone;
  fromLane: Lane;
  toLane: Lane;
  fromPossession: PossessionSide;
  toPossession: PossessionSide;
  createdBigChance: boolean;
  nextSituationType: SituationType;
  nextSetPieceType?: SetPieceType | null;
}

export interface GoalDetails {
  scorerId: number;
  scorerSide: PossessionSide;
  assistPlayerId: number | null;
}

export interface MatchEvent {
  turn: number;
  action: ActionType;
  outcome: EventOutcome;
  shotResult: ShotResult;
  foulResult: FoulResult;
  transition: EventTransition;
  actors: MatchActors;
  goalDetails?: GoalDetails | null;
  narration?: string;
  /** Set only for goals scored from a penalty (set-piece resolution). */
  isPenaltyGoal?: boolean;
}

export interface MatchGoalRecord {
  id: string;
  scorerId: number;
  scorerSide: PossessionSide;
  assistPlayerId: number | null;
  minute: number;
  fromZone: Zone;
  fromLane: Lane;
}

export interface MatchState {
  context: MatchContext;
  userTeam: MatchTeam;
  opponentTeam: MatchTeam;
  currentSituation: MatchSituation;
  lastEvent?: MatchEvent | null;
  history: MatchEvent[];
  interactiveSetPiece: InteractiveSetPieceState | null;
  lastTouchPlayerId: number | null;
  lastTouchSide: PossessionSide | null;
  playerMatchStats: PlayerMatchStats;
  lastGoal: MatchGoalRecord | null;
}

export type PendingInteraction =
  | {
      kind: "corner";
      takerSide: "user" | "opponent";
      zone: Zone;
      lane: Lane;
    }
  | {
      kind: "freekick";
      takerSide: "user" | "opponent";
      zone: Zone;
      lane: Lane;
    }
  | {
      kind: "penalty";
      takerSide: "user" | "opponent";
      zone: Zone;
      lane: Lane;
    };

export interface DebugEntry {
  turn: number;
  action: ActionType;
  situationType: SituationType;
  setPieceType: SetPieceType | null;
  zoneBefore: Zone;
  zoneAfter: Zone;
  laneBefore: Lane;
  laneAfter: Lane;
  possessionBefore: PossessionSide;
  possessionAfter: PossessionSide;

  userPlayer: string;
  opponentPlayer: string;
  userGoalkeeper: string;
  opponentGoalkeeper: string;

  setPieceTaker: string | null;
  setPiecePrimaryDefender: string | null;
  setPieceAttackingSupport: string | null;
  setPieceDefendingSupport: string | null;

  rawDelta: number;
  finalDelta: number;
  randomSwing: number;
  outcome: EventOutcome;
  shotOutcome: ShotOutcome | null;

  foulCommitted: boolean;
  foulCard: CardType;
  setPieceAwarded: SetPieceType | null;

  scoreUser: number;
  scoreOpponent: number;
}