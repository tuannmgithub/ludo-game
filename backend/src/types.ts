// Shared types for Co Ca Ngua (Vietnamese Ludo)

export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type BotDifficulty = 'easy' | 'medium' | 'hard';

export const BOARD_SIZE = 52;
export const HOME_STRETCH_START = 52;
export const GOAL_POSITION = 57;
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
};
export const HOME_ENTRY_BEFORE: Record<PlayerColor, number> = {
  red: 51,
  blue: 12,
  yellow: 25,
  green: 38,
};
export const SAFE_ZONES: number[] = [0, 8, 13, 21, 26, 34, 39, 47];
export const COLOR_ORDER: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];
export const TURN_TIMEOUT_MS = 30000;

export interface Piece {
  id: number;
  color: PlayerColor;
  position: number; // -1 = home base, 0-51 = main track, 52-57 = home stretch, 57 = goal
}

export interface DiceResult {
  dice1: number;
  dice2: number;
  total: number;
  isDouble: boolean;
  isSpecial: boolean;
}

export interface ValidMove {
  pieceId: number;
  fromPosition: number;
  toPosition: number;
  isCapture: boolean;
  capturedColor?: PlayerColor;
  capturedPieceId?: number;
  isThuaMa: boolean; // entering home stretch
  isMandatory: boolean;
}

export interface Player {
  id: string;
  username: string;
  color: PlayerColor;
  pieces: Piece[];
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  connected: boolean;
  rank?: number;
}

export interface GameState {
  sessionId: string;
  roomCode: string;
  players: Player[];
  currentPlayerColor: PlayerColor | null;
  status: GameStatus;
  dice: DiceResult | null;
  validMoves: ValidMove[];
  rankings: PlayerColor[];
  turnCount: number;
  hasExtraTurn: boolean;
  turnStartedAt: number;
  lastAction?: LastAction;
}

export interface LastAction {
  type: 'roll' | 'move' | 'skip' | 'timeout';
  playerColor?: PlayerColor;
  pieceId?: number;
  fromPosition?: number;
  toPosition?: number;
  capture?: {
    color: PlayerColor;
    pieceId: number;
  };
}

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

// Internal room structure
export interface Room {
  code: string;
  hostPlayerId: string;
  maxPlayers: 2 | 3 | 4;
  withBots: boolean;
  gameState: GameState;
  turnTimer?: NodeJS.Timeout;
  botTimers: Map<string, NodeJS.Timeout>;
}

// JWT payload
export interface GuestTokenPayload {
  playerId: string;
  username: string;
  iat?: number;
  exp?: number;
}
