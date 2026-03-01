// ============================================================
// ENGINE — Cờ Cá Ngựa game-core
// Pure game-state machine.  No side effects, no randomness.
// ============================================================

import {
  GameState,
  Player,
  Piece,
  DiceResult,
  ValidMove,
  PlayerColor,
  BotDifficulty,
  GOAL_POSITION,
  HOME_STRETCH_START,
  START_POSITIONS,
  COLOR_ORDER,
} from '@co-ca-ngua/shared-types';

import {
  PIECES_PER_PLAYER,
} from './constants';

import {
  calculateNewPosition,
  isPathBlocked,
  getPieceAt,
  getPiecesAt,
  isSafePosition,
  wouldScoreGoal,
} from './board';

// ─── Internal helpers ──────────────────────────────────────

/** Deep-clone a GameState (JSON round-trip — safe for plain objects). */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** Collect every piece from all players into a flat array. */
function allPieces(state: GameState): Piece[] {
  return state.players.flatMap((p) => p.pieces);
}

/** Find a player by color. Throws if not found. */
function getPlayer(state: GameState, color: PlayerColor): Player {
  const player = state.players.find((p) => p.color === color);
  if (!player) {
    throw new Error(`Player with color "${color}" not found in state`);
  }
  return player;
}

/** Find a specific piece for a player. Throws if not found. */
function getPiece(player: Player, pieceId: number): Piece {
  const piece = player.pieces.find((p) => p.id === pieceId);
  if (!piece) {
    throw new Error(`Piece ${pieceId} not found for player ${player.color}`);
  }
  return piece;
}

// ─── Move generation ───────────────────────────────────────

/**
 * Compute the list of ValidMove objects for the given player/dice.
 *
 * Rules applied:
 * 1. Deploy moves (if dice.isSpecial and piece is in stable)
 * 2. Main-track moves with blocking check
 * 3. Home-stretch moves (no blocking, no captures)
 * 4. Mandatory-capture filter: if ANY move is a capture, return ONLY captures
 */
function computeValidMoves(
  player: Player,
  dice: DiceResult,
  pieces: Piece[],
): ValidMove[] {
  const color = player.color;
  const startPos = START_POSITIONS[color];
  const moves: ValidMove[] = [];

  for (const piece of player.pieces) {
    // ── Stable: can only deploy ──────────────────────────────────────
    if (piece.position === -1) {
      if (!dice.isSpecial) continue;

      // Check what's at the start gate
      const atGate = getPiecesAt(startPos, pieces, piece.id);
      const ownAtGate = atGate.filter((p) => p.color === color);

      // Own piece occupying start gate → blocked
      if (ownAtGate.length > 0) continue;

      // Opponent piece(s) at start gate → capture first one
      const opponentAtGate = atGate.find((p) => p.color !== color);

      moves.push({
        pieceId: piece.id,
        fromPosition: -1,
        toPosition: startPos,
        isCapture: opponentAtGate !== undefined,
        capturedColor: opponentAtGate?.color,
        capturedPieceId: opponentAtGate?.id,
        isThuaMa: false,
        isMandatory: false, // will be updated below
      });
      continue;
    }

    // ── Home stretch: simple advance, no captures ────────────────────
    if (piece.position >= HOME_STRETCH_START && piece.position <= GOAL_POSITION) {
      if (piece.position === GOAL_POSITION) continue; // already at goal

      const newPos = calculateNewPosition(piece.position, dice.total, color);
      if (newPos === null) continue; // overshoot

      // Only one piece per home-stretch square
      const atDest = getPieceAt(newPos, pieces, piece.id);
      if (atDest !== undefined) continue; // blocked by own piece

      moves.push({
        pieceId: piece.id,
        fromPosition: piece.position,
        toPosition: newPos,
        isCapture: false,
        isThuaMa: false,
        isMandatory: false,
      });
      continue;
    }

    // ── Main track ───────────────────────────────────────────────────
    const newPos = calculateNewPosition(piece.position, dice.total, color);
    if (newPos === null) continue; // overshoot into home

    // Determine if this move stays on the main track or enters home stretch
    const entersHome = newPos >= HOME_STRETCH_START;

    if (!entersHome) {
      // ── Staying on main track ──────────────────────────────────────
      // Blocking check: any piece on intermediate squares
      if (isPathBlocked(piece.position, newPos, pieces, piece.id)) continue;

      const atDest = getPieceAt(newPos, pieces, piece.id);

      if (atDest === undefined) {
        // Empty square
        moves.push({
          pieceId: piece.id,
          fromPosition: piece.position,
          toPosition: newPos,
          isCapture: false,
          isThuaMa: false,
          isMandatory: false,
        });
      } else if (atDest.color === color) {
        // Own piece → blocked
        continue;
      } else {
        // Opponent piece
        if (isSafePosition(newPos)) continue; // safe zone → cannot capture

        moves.push({
          pieceId: piece.id,
          fromPosition: piece.position,
          toPosition: newPos,
          isCapture: true,
          capturedColor: atDest.color,
          capturedPieceId: atDest.id,
          isThuaMa: false,
          isMandatory: false,
        });
      }
    } else {
      // ── Entering home stretch ──────────────────────────────────────
      // No blocking check for the portion of path before home entry
      // (standard Ludo/Cờ Cá Ngựa rule)
      // No captures possible in home stretch
      const atDest = getPieceAt(newPos, pieces, piece.id);
      if (atDest !== undefined) continue; // own piece at that home position

      const isThuaMa = wouldScoreGoal(piece, dice.total, color);

      moves.push({
        pieceId: piece.id,
        fromPosition: piece.position,
        toPosition: newPos,
        isCapture: false,
        isThuaMa,
        isMandatory: false,
      });
    }
  }

  // ── Mandatory-capture filter ─────────────────────────────────────────
  const captureMoves = moves.filter((m) => m.isCapture);
  if (captureMoves.length > 0) {
    return captureMoves.map((m) => ({ ...m, isMandatory: true }));
  }

  return moves;
}

// ─── GameEngine ────────────────────────────────────────────

export class GameEngine {
  // ── createGame ───────────────────────────────────────────

  /**
   * Create the initial GameState for a new game.
   * All pieces start in stable (-1).
   */
  static createGame(params: {
    sessionId: string;
    roomCode: string;
    players: Array<{
      id: string;
      username: string;
      color: PlayerColor;
      isBot: boolean;
      botDifficulty?: BotDifficulty;
    }>;
  }): GameState {
    const players: Player[] = params.players.map((p) => ({
      id: p.id,
      username: p.username,
      color: p.color,
      isBot: p.isBot,
      botDifficulty: p.botDifficulty,
      connected: true,
      pieces: Array.from({ length: PIECES_PER_PLAYER }, (_, i) => ({
        id: i,
        color: p.color,
        position: -1,
      })),
    }));

    // First player in COLOR_ORDER that is in this game goes first
    const firstColor =
      COLOR_ORDER.find((c) => players.some((p) => p.color === c)) ?? players[0].color;

    return {
      sessionId: params.sessionId,
      roomCode: params.roomCode,
      players,
      currentPlayerColor: firstColor,
      status: 'playing',
      dice: null,
      validMoves: [],
      rankings: [],
      turnCount: 0,
      hasExtraTurn: false,
      turnStartedAt: Date.now(),
    };
  }

  // ── getValidMoves ─────────────────────────────────────────

  /**
   * Compute valid moves for `state.currentPlayerColor` given `dice`.
   * Pure — does not mutate state.
   */
  static getValidMoves(state: GameState, dice: DiceResult): ValidMove[] {
    if (state.currentPlayerColor === null) return [];

    const player = state.players.find((p) => p.color === state.currentPlayerColor);
    if (!player) return [];

    const pieces = allPieces(state);
    return computeValidMoves(player, dice, pieces);
  }

  // ── applyDiceRoll ─────────────────────────────────────────

  /**
   * Apply a dice roll to the state.
   *
   * - Sets state.dice
   * - Computes state.validMoves
   * - If no valid moves exist and the roll is NOT special → auto-advance turn
   * - If the roll is special → flag hasExtraTurn (will apply after move)
   */
  static applyDiceRoll(state: GameState, dice: DiceResult): GameState {
    const next = cloneState(state);
    next.dice = dice;

    if (next.currentPlayerColor === null) return next;

    const validMoves = GameEngine.getValidMoves(next, dice);
    next.validMoves = validMoves;

    // Extra turn granted by a special roll (resolved AFTER the move)
    next.hasExtraTurn = dice.isSpecial;

    const currentColor = next.currentPlayerColor;

    next.lastAction = {
      type: 'roll',
      playerColor: currentColor,
      dice,
    };

    // If no valid moves exist, automatically advance the turn
    if (validMoves.length === 0) {
      return GameEngine.advanceTurn(next);
    }

    return next;
  }

  // ── applyMove ─────────────────────────────────────────────

  /**
   * Apply the move chosen by the current player.
   *
   * Handles:
   * - Deploy (stable → start gate, optionally captures opponent)
   * - Regular main-track move (with optional capture)
   * - Home-stretch entry / advance
   * - Thầu Mạ flagging
   * - Win detection → add to rankings
   * - hasExtraTurn → player rolls again (don't advance turn)
   * - Otherwise → advance to next player
   */
  static applyMove(state: GameState, pieceId: number): GameState {
    if (state.currentPlayerColor === null) {
      throw new Error('No current player');
    }
    if (state.dice === null) {
      throw new Error('Cannot move without a dice roll');
    }

    const move = state.validMoves.find((m) => m.pieceId === pieceId);
    if (!move) {
      throw new Error(
        `Piece ${pieceId} is not in validMoves for player ${state.currentPlayerColor}`,
      );
    }

    const next = cloneState(state);
    const color = next.currentPlayerColor!;
    const currentPlayer = getPlayer(next, color);
    const piece = getPiece(currentPlayer, pieceId);

    // ── Apply capture (send captured piece back to stable) ───────────
    if (move.isCapture && move.capturedColor !== undefined && move.capturedPieceId !== undefined) {
      const capturedPlayer = getPlayer(next, move.capturedColor);
      const capturedPiece = getPiece(capturedPlayer, move.capturedPieceId);
      capturedPiece.position = -1;
    }

    // ── Move the piece ────────────────────────────────────────────────
    const fromPosition = piece.position;
    piece.position = move.toPosition;

    // ── Determine action type for lastAction ─────────────────────────
    let actionType: NonNullable<GameState['lastAction']>['type'];
    if (fromPosition === -1) {
      actionType = move.isCapture ? 'capture' : 'deploy';
    } else if (move.isCapture) {
      actionType = 'capture';
    } else if (move.isThuaMa) {
      actionType = 'thua_ma';
    } else {
      actionType = 'move';
    }

    next.lastAction = {
      type: actionType,
      playerColor: color,
      pieceId,
      fromPosition,
      toPosition: move.toPosition,
      capturedColor: move.capturedColor,
      capturedPieceId: move.capturedPieceId,
      dice: next.dice ?? undefined,
    };

    // ── Check win condition ───────────────────────────────────────────
    if (GameEngine.hasPlayerWon(currentPlayer) && !next.rankings.includes(color)) {
      next.rankings.push(color);
      const rank = next.rankings.length;
      currentPlayer.rank = rank;
    }

    // ── Check if game is over (all active players have finished) ─────
    const activePlayers = next.players.filter((p) => !next.rankings.includes(p.color));
    if (activePlayers.length === 0) {
      next.status = 'finished';
      next.currentPlayerColor = null;
      next.dice = null;
      next.validMoves = [];
      next.hasExtraTurn = false;
      return next;
    }

    // If the current player just won, they don't get extra turns — advance
    if (next.rankings.includes(color)) {
      next.dice = null;
      next.validMoves = [];
      next.hasExtraTurn = false;
      return GameEngine.advanceTurn(next);
    }

    // ── Extra turn: player must roll again ───────────────────────────
    if (next.hasExtraTurn) {
      next.dice = null;
      next.validMoves = [];
      // hasExtraTurn stays true until a non-special roll or the turn advances
      // Reset to false here; a new special roll will re-enable it in applyDiceRoll
      next.hasExtraTurn = false;
      next.turnStartedAt = Date.now();
      // Do NOT advance turn — same player rolls again
      return next;
    }

    // ── Normal turn end: advance to next player ───────────────────────
    next.dice = null;
    next.validMoves = [];
    return GameEngine.advanceTurn(next);
  }

  // ── hasPlayerWon ──────────────────────────────────────────

  /**
   * A player wins when all 4 of their pieces have reached GOAL_POSITION (57).
   */
  static hasPlayerWon(player: Player): boolean {
    return player.pieces.every((p) => p.position === GOAL_POSITION);
  }

  // ── advanceTurn ───────────────────────────────────────────

  /**
   * Advance `state.currentPlayerColor` to the next eligible player.
   * Skips players who have already finished.
   * Resets dice and validMoves.
   * Increments turnCount.
   */
  static advanceTurn(state: GameState): GameState {
    const next = cloneState(state);
    next.dice = null;
    next.validMoves = [];
    next.hasExtraTurn = false;
    next.turnCount += 1;
    next.turnStartedAt = Date.now();

    if (next.currentPlayerColor === null) {
      return next;
    }

    // Filter out finished players
    const activePlayers = COLOR_ORDER.filter(
      (c) =>
        next.players.some((p) => p.color === c) && !next.rankings.includes(c),
    );

    if (activePlayers.length === 0) {
      next.status = 'finished';
      next.currentPlayerColor = null;
      return next;
    }

    if (activePlayers.length === 1) {
      // Last active player — game should be over but handle gracefully
      next.currentPlayerColor = activePlayers[0];
      return next;
    }

    const idx = activePlayers.indexOf(next.currentPlayerColor);
    if (idx === -1) {
      // Current player just finished — start from beginning of active list
      next.currentPlayerColor = activePlayers[0];
    } else {
      next.currentPlayerColor = activePlayers[(idx + 1) % activePlayers.length];
    }

    return next;
  }

  // ── applyTimeout ──────────────────────────────────────────

  /**
   * Called when a player's turn has exceeded TURN_TIMEOUT_MS.
   *
   * Strategy:
   * 1. If there are valid moves, pick the "best" one deterministically
   *    (captures first, then deploy, then highest destination).
   * 2. If no valid moves, just advance the turn.
   */
  static applyTimeout(state: GameState): GameState {
    const next = cloneState(state);

    if (next.currentPlayerColor === null) return next;

    const color = next.currentPlayerColor;

    next.lastAction = {
      type: 'timeout',
      playerColor: color,
    };

    if (next.validMoves.length === 0) {
      return GameEngine.advanceTurn(next);
    }

    // Pick best move: captures first, then deploy (from=-1), then best position
    const best = pickBestMoveForTimeout(next.validMoves);
    return GameEngine.applyMove(next, best.pieceId);
  }
}

// ─── Timeout move picker ───────────────────────────────────

/**
 * Deterministic move selection for timeout auto-play.
 * Priority: capture > deploy > home stretch advance > highest toPosition
 */
function pickBestMoveForTimeout(moves: ValidMove[]): ValidMove {
  // 1. Capture moves
  const captures = moves.filter((m) => m.isCapture);
  if (captures.length > 0) return captures[0];

  // 2. Deploy moves (from stable)
  const deploys = moves.filter((m) => m.fromPosition === -1);
  if (deploys.length > 0) return deploys[0];

  // 3. Home-stretch advances (toPosition >= 52)
  const homeAdvances = moves.filter((m) => m.toPosition >= HOME_STRETCH_START);
  if (homeAdvances.length > 0) {
    // Prefer the one that goes furthest
    return homeAdvances.reduce((a, b) => (a.toPosition > b.toPosition ? a : b));
  }

  // 4. Highest destination on main track (furthest from own start — we don't
  //    have color context here, but toPosition is a reasonable proxy)
  return moves.reduce((a, b) => (a.toPosition > b.toPosition ? a : b));
}

// TURN_TIMEOUT_MS is exported from constants.ts / index.ts
