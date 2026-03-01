// ============================================================
// SHARED TYPES — Cờ Cá Ngựa Online
// Contract between frontend, backend, and game-core
// ============================================================

// ─── Base Types ───────────────────────────────────────────

export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type BotDifficulty = 'easy' | 'medium' | 'hard';

// ─── Board Constants ──────────────────────────────────────

/** Total squares on the main track */
export const BOARD_SIZE = 52;

/** Squares in the home stretch lane */
export const HOME_STRETCH_SIZE = 6;

/**
 * Position encoding:
 * -1         = piece is in stable (chuồng xuất phát)
 * 0–51       = piece on main board track (absolute index, counter-clockwise)
 * 52–57      = piece in home stretch (52 = entry/pos1, 57 = goal/pos6)
 */
export const HOME_STRETCH_START = 52;
export const GOAL_POSITION = 57; // position 6 in home stretch (52 + 5)

/**
 * Absolute position on main track where each player's piece starts
 * when first deployed from stable.
 */
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
};

/**
 * The last main-track square (absolute index) BEFORE a piece enters
 * the home stretch for each color.
 * red:    51  (one step before position 0, wraps into home)
 * blue:   12  (one step before position 13)
 * yellow: 25  (one step before position 26)
 * green:  38  (one step before position 39)
 */
export const HOME_ENTRY_BEFORE: Record<PlayerColor, number> = {
  red: 51,
  blue: 12,
  yellow: 25,
  green: 38,
};

/**
 * Safe zone squares on the main track — pieces on these squares
 * CANNOT be captured by opponents.
 * Includes all 4 start gates + 1 square per leg midway.
 */
export const SAFE_ZONES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

/** Player turn order (counter-clockwise) */
export const COLOR_ORDER: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

// ─── Game Entities ─────────────────────────────────────────

export interface Piece {
  /** Piece index for a player: 0, 1, 2, or 3 */
  id: number;
  /** Which player owns this piece */
  color: PlayerColor;
  /**
   * Current position:
   * -1  → in stable
   * 0–51 → on main track
   * 52–57 → in home stretch
   */
  position: number;
}

export interface DiceResult {
  dice1: number; // 1–6
  dice2: number; // 1–6
  total: number; // dice1 + dice2
  isDouble: boolean; // dice1 === dice2
  /** True when double OR (1+6). Grants extra turn + allows deploy. */
  isSpecial: boolean;
}

export interface ValidMove {
  pieceId: number;
  fromPosition: number; // current position of piece
  toPosition: number;   // where piece will end up
  isCapture: boolean;   // lands on opponent piece
  capturedColor?: PlayerColor;
  capturedPieceId?: number;
  /** Piece enters home stretch AND reaches position 57 (goal) in one move */
  isThuaMa: boolean;
  /** Mandatory: if any capture moves exist, ONLY capture moves are returned */
  isMandatory: boolean;
}

export interface Player {
  /** Socket ID or generated player ID */
  id: string;
  username: string;
  color: PlayerColor;
  pieces: Piece[];
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  connected: boolean;
  /** Final rank after game ends (1 = winner) */
  rank?: number;
}

export interface GameState {
  sessionId: string;
  roomCode: string;
  players: Player[];
  /** Whose turn it is. null when game hasn't started */
  currentPlayerColor: PlayerColor | null;
  status: GameStatus;
  /** Result of most recent dice roll. null before first roll */
  dice: DiceResult | null;
  /** Valid moves for current player after dice roll */
  validMoves: ValidMove[];
  /** Colors in order of finish (1st place first) */
  rankings: PlayerColor[];
  turnCount: number;
  /** Player gets another roll this turn (from special dice result) */
  hasExtraTurn: boolean;
  /** Unix timestamp (ms) when current turn started (for timeout) */
  turnStartedAt: number;
  lastAction?: {
    type: 'roll' | 'move' | 'deploy' | 'capture' | 'timeout' | 'thua_ma';
    playerColor: PlayerColor;
    pieceId?: number;
    fromPosition?: number;
    toPosition?: number;
    capturedColor?: PlayerColor;
    capturedPieceId?: number;
    dice?: DiceResult;
  };
}

// ─── Room ──────────────────────────────────────────────────

export interface RoomInfo {
  roomCode: string;
  hostUsername: string;
  playerCount: number;
  maxPlayers: 2 | 3 | 4;
  status: GameStatus;
  players: Array<{
    username: string;
    color: PlayerColor;
    isBot: boolean;
    connected: boolean;
  }>;
  withBots: boolean;
}

// ─── REST API Payloads ─────────────────────────────────────

export interface GuestAuthResponse {
  guestToken: string;
  playerId: string;
  username: string;
}

export interface CreateRoomRequest {
  username: string;
  maxPlayers: 2 | 3 | 4;
  withBots: boolean;
  guestToken?: string;
}

export interface CreateRoomResponse {
  roomCode: string;
  guestToken: string;
  playerId: string;
  playerColor: PlayerColor;
}

export interface JoinRoomRequest {
  username: string;
  guestToken?: string;
}

export interface JoinRoomResponse {
  roomCode: string;
  guestToken: string;
  playerId: string;
  playerColor: PlayerColor;
}

// ─── WebSocket Event Payloads ──────────────────────────────

/** Client → Server */
export interface WsJoinRoomPayload {
  roomCode: string;
  username: string;
  guestToken: string;
  playerId: string;
}

export interface WsMovePiecePayload {
  pieceId: number;
}

/** Server → Client */
export interface WsRoomJoinedPayload {
  gameState: GameState;
  playerColor: PlayerColor;
  playerId: string;
}

export interface WsGameStatePayload {
  gameState: GameState;
}

export interface WsDiceRolledPayload {
  gameState: GameState; // includes dice + validMoves
}

export interface WsPieceMovedPayload {
  gameState: GameState;
}

export interface WsGameOverPayload {
  gameState: GameState; // status='finished', rankings filled
}

export interface WsErrorPayload {
  message: string;
  code?: string;
}

// ─── Utility Types ─────────────────────────────────────────

export function isPieceInStable(piece: Piece): boolean {
  return piece.position === -1;
}

export function isPieceOnBoard(piece: Piece): boolean {
  return piece.position >= 0 && piece.position <= 51;
}

export function isPieceInHome(piece: Piece): boolean {
  return piece.position >= HOME_STRETCH_START && piece.position <= GOAL_POSITION;
}

export function isPieceAtGoal(piece: Piece): boolean {
  return piece.position === GOAL_POSITION;
}

export function isSafeZone(position: number): boolean {
  return (SAFE_ZONES as number[]).includes(position);
}
