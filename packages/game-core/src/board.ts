// ============================================================
// BOARD — Cờ Cá Ngựa game-core
// Pure board-geometry and blocking-rule helpers.
// ============================================================

import {
  Piece,
  PlayerColor,
  BOARD_SIZE,
  HOME_STRETCH_START,
  GOAL_POSITION,
  START_POSITIONS,
  HOME_ENTRY_BEFORE,
  SAFE_ZONES,
} from '@co-ca-ngua/shared-types';

// ─── Safe zone ────────────────────────────────────────────

/**
 * Returns true when `position` is one of the protected squares on
 * the main track.  Pieces on safe zones cannot be captured.
 */
export function isSafePosition(position: number): boolean {
  return (SAFE_ZONES as number[]).includes(position);
}

// ─── Relative position ────────────────────────────────────

/**
 * Convert an absolute main-track position (0-51) to a relative
 * position for `color` (how many steps the piece has travelled from
 * its start gate).
 *
 * A piece at START_POSITIONS[color] has relPos = 0.
 * A piece at (START_POSITIONS[color] + k) % 52 has relPos = k.
 */
export function getRelativePosition(absolutePos: number, color: PlayerColor): number {
  const start = START_POSITIONS[color];
  return (absolutePos - start + BOARD_SIZE) % BOARD_SIZE;
}

// ─── Piece lookup ─────────────────────────────────────────

/**
 * Return the first piece at `position` (excluding `excludeId`).
 * Works for any valid position value (-1, 0-51, 52-57).
 */
export function getPieceAt(
  position: number,
  allPieces: Piece[],
  excludeId?: number,
): Piece | undefined {
  return allPieces.find(
    (p) => p.position === position && p.id !== excludeId,
  );
}

/**
 * Return all pieces at `position` (excluding `excludeId`).
 */
export function getPiecesAt(
  position: number,
  allPieces: Piece[],
  excludeId?: number,
): Piece[] {
  return allPieces.filter(
    (p) => p.position === position && p.id !== excludeId,
  );
}

// ─── Path blocking ────────────────────────────────────────

/**
 * Build the ordered list of intermediate squares that a piece on the
 * MAIN TRACK must cross when moving from `from` to `toAbsolute`
 * (exclusive on both ends — the piece's current position and its
 * destination are NOT included).
 *
 * Used only for main-track moves (positions 0-51).  Home-stretch
 * entry paths are NOT checked for blocking per the game rules.
 */
function intermediateSquares(from: number, toAbsolute: number): number[] {
  const squares: number[] = [];
  let pos = (from + 1) % BOARD_SIZE;
  while (pos !== toAbsolute) {
    squares.push(pos);
    pos = (pos + 1) % BOARD_SIZE;
  }
  return squares;
}

/**
 * Returns true when ANY piece (belonging to ANY player) occupies one
 * of the intermediate squares between `from` (exclusive) and
 * `toAbsolute` (exclusive) on the MAIN TRACK.
 *
 * The moving piece itself is excluded via `movingPieceId`.
 *
 * This check does NOT apply to home-stretch movement.
 */
export function isPathBlocked(
  from: number,
  toAbsolute: number,
  allPieces: Piece[],
  movingPieceId: number,
): boolean {
  const squares = intermediateSquares(from, toAbsolute);
  for (const sq of squares) {
    const blocker = allPieces.find(
      (p) => p.position === sq && p.id !== movingPieceId,
    );
    if (blocker !== undefined) {
      return true;
    }
  }
  return false;
}

// ─── New position calculation ─────────────────────────────

/**
 * Calculate where a piece would land after moving `steps` squares
 * from `fromPos` for `color`.
 *
 * Returns the new **absolute** position, or `null` when the move is
 * geometrically impossible (overshoot past goal, still in stable
 * without deploy, etc.).
 *
 * This function does NOT apply blocking/capture logic — it only
 * handles the position arithmetic.  Call `isPathBlocked` separately
 * for the blocking check.
 *
 * Position encoding:
 *   -1       → stable (cannot be moved with this function)
 *   0–51     → main track
 *   52–57    → home stretch (57 = goal)
 */
export function calculateNewPosition(
  fromPos: number,
  steps: number,
  color: PlayerColor,
): number | null {
  if (steps <= 0) {
    return null;
  }

  // ── Piece in stable: cannot move via calculateNewPosition ──────────
  if (fromPos === -1) {
    return null;
  }

  // ── Piece already in home stretch ──────────────────────────────────
  if (fromPos >= HOME_STRETCH_START && fromPos <= GOAL_POSITION) {
    const newPos = fromPos + steps;
    if (newPos > GOAL_POSITION) {
      return null; // overshoot
    }
    return newPos;
  }

  // ── Piece on main track (0–51) ─────────────────────────────────────
  const start = START_POSITIONS[color];
  // How many steps the piece has already travelled from the start gate
  const relPos = getRelativePosition(fromPos, color);
  // How far it would be after this move (relative to start gate)
  const newRelPos = relPos + steps;

  if (newRelPos < BOARD_SIZE) {
    // Still on main track
    return (start + newRelPos) % BOARD_SIZE;
  }

  // Piece is entering (or already past) the home stretch
  // newRelPos === 52 → position 52 (first home-stretch square)
  // newRelPos === 57 → position 57 (goal)
  // newRelPos  > 57 → overshoot, invalid
  const homePos = HOME_STRETCH_START + (newRelPos - BOARD_SIZE);

  if (homePos > GOAL_POSITION) {
    return null; // overshoot past goal
  }

  return homePos;
}

// ─── Home-stretch helpers ─────────────────────────────────

/**
 * Returns true when moving `piece` by `steps` would land in the
 * home stretch (position 52–57) from the main track.
 */
export function wouldEnterHomeStretch(
  piece: Piece,
  steps: number,
  color: PlayerColor,
): boolean {
  if (piece.position < 0 || piece.position >= HOME_STRETCH_START) {
    return false;
  }
  const relPos = getRelativePosition(piece.position, color);
  const newRelPos = relPos + steps;
  return newRelPos >= BOARD_SIZE && newRelPos <= BOARD_SIZE + (GOAL_POSITION - HOME_STRETCH_START);
}

/**
 * Return true when moving `piece` by `steps` would reach exactly
 * position 57 (Thầu Mạ) from the main track in one move.
 * The piece must currently be on the main track (not in stable or
 * already in the home stretch).
 */
export function wouldScoreGoal(
  piece: Piece,
  steps: number,
  color: PlayerColor,
): boolean {
  if (piece.position < 0 || piece.position >= HOME_STRETCH_START) {
    return false;
  }
  const newPos = calculateNewPosition(piece.position, steps, color);
  return newPos === GOAL_POSITION;
}

// ─── Conversion helpers ───────────────────────────────────

/**
 * Return the HOME_ENTRY_BEFORE square for `color` — the last
 * main-track square before the home stretch entrance.
 */
export function homeEntryBefore(color: PlayerColor): number {
  return HOME_ENTRY_BEFORE[color];
}
