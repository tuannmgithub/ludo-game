// ============================================================
// INDEX — @co-ca-ngua/game-core public API
// ============================================================

// Game-core modules (constants.ts already re-exports shared-types constants)
export * from './constants';
export * from './dice';
export * from './board';
export * from './engine';
export * from './bot';

// Types and interfaces from shared-types that are not covered above
export type {
  PlayerColor,
  GameStatus,
  BotDifficulty,
  Piece,
  DiceResult,
  ValidMove,
  Player,
  GameState,
  RoomInfo,
  GuestAuthResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  WsJoinRoomPayload,
  WsMovePiecePayload,
  WsRoomJoinedPayload,
  WsGameStatePayload,
  WsDiceRolledPayload,
  WsPieceMovedPayload,
  WsGameOverPayload,
  WsErrorPayload,
} from '@co-ca-ngua/shared-types';

// Utility functions from shared-types
export {
  isPieceInStable,
  isPieceOnBoard,
  isPieceInHome,
  isPieceAtGoal,
  isSafeZone,
} from '@co-ca-ngua/shared-types';
