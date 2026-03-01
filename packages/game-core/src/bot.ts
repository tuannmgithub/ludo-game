// ============================================================
// BOT AI — Cờ Cá Ngựa game-core
// Difficulty-scaled move selection for computer-controlled players.
// All functions are pure (no side effects).
// ============================================================

import {
  GameState,
  ValidMove,
  PlayerColor,
  BotDifficulty,
  GOAL_POSITION,
  HOME_STRETCH_START,
} from '@co-ca-ngua/shared-types';

import { getRelativePosition } from './board';

// ─── Scoring helpers ───────────────────────────────────────

/**
 * Returns how far a piece's destination is from its color's start gate
 * (used as a progress metric; higher = further along the track).
 *
 * Home-stretch positions (52-57) are mapped above any main-track value
 * so they always rank higher than board positions.
 */
function progressScore(toPosition: number, color: PlayerColor): number {
  if (toPosition >= HOME_STRETCH_START) {
    // Map 52–57 to 52–57 (already higher than any main-track relPos 0–51)
    return toPosition;
  }
  // Main track: use relative position (0 = just left start gate, 51 = one step before home)
  return getRelativePosition(toPosition, color);
}

/**
 * Score a ValidMove for a given difficulty level.
 * Higher score = better move.
 */
function scoreMoveHard(move: ValidMove, color: PlayerColor, state: GameState): number {
  let score = 0;

  // 1. Reaching goal (Thầu Mạ) is always the best single outcome
  if (move.toPosition === GOAL_POSITION) {
    score += 10_000;
  }

  // 2. Advancing in home stretch is very good
  if (move.toPosition >= HOME_STRETCH_START && move.toPosition < GOAL_POSITION) {
    score += 5_000 + move.toPosition; // prefer going further
  }

  // 3. Captures are tactically strong
  if (move.isCapture) {
    score += 3_000;
    // Extra bonus for capturing a piece that is far along the board
    if (move.capturedColor !== undefined) {
      const capturedPlayer = state.players.find((p) => p.color === move.capturedColor);
      const capturedPiece = capturedPlayer?.pieces.find((p) => p.id === move.capturedPieceId);
      if (capturedPiece !== undefined) {
        score += getRelativePosition(capturedPiece.position, move.capturedColor);
      }
    }
  }

  // 4. Deploy (brings a new piece into play — good for future options)
  if (move.fromPosition === -1) {
    score += 1_500;
  }

  // 5. General progress score (prefer the piece that is furthest along)
  score += progressScore(move.toPosition, color);

  return score;
}

function scoreMoveMedium(move: ValidMove, _color: PlayerColor): number {
  // Priority: capture > deploy > home advance > board advance
  if (move.isCapture) return 4_000;
  if (move.fromPosition === -1) return 3_000; // deploy
  if (move.toPosition >= HOME_STRETCH_START) return 2_000 + move.toPosition;
  return move.toPosition; // rough board-position proxy
}

// ─── BotAI ────────────────────────────────────────────────

export class BotAI {
  /**
   * Pick the best move for `botColor` from `state.validMoves`.
   *
   * Returns `null` when there are no valid moves (caller should skip turn).
   *
   * Difficulty levels:
   *   easy   — random move
   *   medium — simple priority heuristic
   *   hard   — scored heuristic (captures weighted by opponent progress,
   *             home-stretch completion prioritised, blocking awareness)
   */
  static pickMove(
    state: GameState,
    botColor: PlayerColor,
    difficulty: BotDifficulty,
  ): ValidMove | null {
    const moves = state.validMoves;
    if (moves.length === 0) return null;

    switch (difficulty) {
      case 'easy':
        return BotAI._pickEasy(moves);
      case 'medium':
        return BotAI._pickMedium(moves, botColor);
      case 'hard':
        return BotAI._pickHard(moves, botColor, state);
      default: {
        // Exhaustive check — TypeScript would catch this, but just in case
        const _exhaustive: never = difficulty;
        void _exhaustive;
        return BotAI._pickEasy(moves);
      }
    }
  }

  // ── Easy: pick a random move ──────────────────────────────

  private static _pickEasy(moves: ValidMove[]): ValidMove {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ── Medium: simple priority heuristic ────────────────────

  private static _pickMedium(moves: ValidMove[], color: PlayerColor): ValidMove {
    let best = moves[0];
    let bestScore = scoreMoveMedium(moves[0], color);

    for (let i = 1; i < moves.length; i++) {
      const s = scoreMoveMedium(moves[i], color);
      if (s > bestScore) {
        bestScore = s;
        best = moves[i];
      }
    }

    return best;
  }

  // ── Hard: scored heuristic ────────────────────────────────

  private static _pickHard(
    moves: ValidMove[],
    color: PlayerColor,
    state: GameState,
  ): ValidMove {
    let best = moves[0];
    let bestScore = scoreMoveHard(moves[0], color, state);

    for (let i = 1; i < moves.length; i++) {
      const s = scoreMoveHard(moves[i], color, state);
      if (s > bestScore) {
        bestScore = s;
        best = moves[i];
      }
    }

    return best;
  }
}
