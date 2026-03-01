export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';
export type GameStatus = 'waiting' | 'playing' | 'finished';

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

export const SAFE_ZONES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];
export const GOAL_POSITION = 57;
export const HOME_STRETCH_START = 52;

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
};

export interface Piece {
  id: number;
  color: PlayerColor;
  position: number;
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
  isThuaMa: boolean;
  isMandatory: boolean;
}

export interface Player {
  id: string;
  username: string;
  color: PlayerColor;
  pieces: Piece[];
  isBot: boolean;
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
  lastAction?: any;
}
