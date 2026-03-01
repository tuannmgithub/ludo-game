// ============================================================
// CONSTANTS — Cờ Cá Ngựa game-core
// Re-exports shared-types constants + adds game-core-specific ones.
// ============================================================

import { PlayerColor } from '@co-ca-ngua/shared-types';

export {
  BOARD_SIZE,
  HOME_STRETCH_SIZE,
  HOME_STRETCH_START,
  GOAL_POSITION,
  START_POSITIONS,
  HOME_ENTRY_BEFORE,
  SAFE_ZONES,
  COLOR_ORDER,
} from '@co-ca-ngua/shared-types';

/** Milliseconds before a turn is auto-resolved due to inactivity */
export const TURN_TIMEOUT_MS = 30_000;

/** All player colors in turn order */
export const COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

/** Number of pieces each player controls */
export const PIECES_PER_PLAYER = 4;

/** Minimum and maximum die face value */
export const DIE_MIN = 1;
export const DIE_MAX = 6;
