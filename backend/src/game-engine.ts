import {
  PlayerColor,
  BotDifficulty,
  Piece,
  DiceResult,
  ValidMove,
  Player,
  GameState,
  START_POSITIONS,
  HOME_ENTRY_BEFORE,
  SAFE_ZONES,
  GOAL_POSITION,
  COLOR_ORDER,
} from './types';

const BOARD_SIZE = 52;
const HOME_STRETCH_START = 52;

export class GameEngine {
  // -----------------------------------------------------------------------
  // Dice
  // -----------------------------------------------------------------------

  static rollDice(): DiceResult {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    const isDouble = dice1 === dice2;
    // Special: double OR (1+6 / 6+1)
    const isSpecial =
      isDouble ||
      (dice1 === 1 && dice2 === 6) ||
      (dice1 === 6 && dice2 === 1);
    return { dice1, dice2, total, isDouble, isSpecial };
  }

  // -----------------------------------------------------------------------
  // Position calculation
  // -----------------------------------------------------------------------

  /**
   * Given a piece at `fromPos` for `color`, calculate the target position
   * after moving `steps` steps. Returns null if the move is impossible
   * (overshoots goal or goes past board boundaries).
   */
  static calculateNewPosition(
    fromPos: number,
    steps: number,
    color: PlayerColor
  ): number | null {
    // Already in home stretch (52–57)
    if (fromPos >= HOME_STRETCH_START) {
      const newPos = fromPos + steps;
      return newPos > GOAL_POSITION ? null : newPos;
    }

    const start = START_POSITIONS[color];
    const relPos = ((fromPos - start) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
    const newRelPos = relPos + steps;

    if (newRelPos <= 51) {
      // Still on main track
      return (start + newRelPos) % BOARD_SIZE;
    }

    // Entering home stretch: 52+0..52+5, goal at 57=52+5
    const homeOffset = newRelPos - 52;
    if (homeOffset > 5) return null;
    return HOME_STRETCH_START + homeOffset;
  }

  // -----------------------------------------------------------------------
  // Path blocking (main track only, 0-51)
  // -----------------------------------------------------------------------

  /**
   * Returns true if any piece occupies an intermediate cell on the main track
   * between `from` (exclusive) and `to` (exclusive).
   * Only called when both endpoints are on the main track (0-51).
   */
  private static isPathBlockedOnMainTrack(
    from: number,
    to: number,
    allPieces: Piece[]
  ): boolean {
    if (from === to) return false;

    // Collect all occupied main-track positions
    const occupied = new Set<number>();
    for (const p of allPieces) {
      if (p.position >= 0 && p.position < BOARD_SIZE) {
        occupied.add(p.position);
      }
    }

    // Walk the path from (from+1)%52 up to (but not including) to
    let current = (from + 1) % BOARD_SIZE;
    while (current !== to) {
      if (occupied.has(current)) return true;
      current = (current + 1) % BOARD_SIZE;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Valid moves computation
  // -----------------------------------------------------------------------

  static getValidMoves(state: GameState, color: PlayerColor): ValidMove[] {
    const dice = state.dice;
    if (!dice) return [];

    const player = state.players.find((p) => p.color === color);
    if (!player) return [];

    const allPieces: Piece[] = state.players.flatMap((p) => p.pieces);
    const moves: ValidMove[] = [];

    for (const piece of player.pieces) {
      const from = piece.position;

      // ---- DEPLOY: piece at home base (-1) ----
      if (from === -1) {
        if (!dice.isSpecial) continue;

        const gate = START_POSITIONS[color];

        // Own piece already at gate blocks deployment
        const ownAtGate = player.pieces.some(
          (p) => p.id !== piece.id && p.position === gate
        );
        if (ownAtGate) continue;

        // Check for opponent at gate (deploy can capture)
        let capturedColor: PlayerColor | undefined;
        let capturedPieceId: number | undefined;
        let isCapture = false;

        for (const op of state.players) {
          if (op.color === color) continue;
          const opp = op.pieces.find((p) => p.position === gate);
          if (opp) {
            isCapture = true;
            capturedColor = op.color;
            capturedPieceId = opp.id;
            break;
          }
        }

        moves.push({
          pieceId: piece.id,
          fromPosition: from,
          toPosition: gate,
          isCapture,
          capturedColor,
          capturedPieceId,
          isThuaMa: false,
          isMandatory: false,
        });
        continue;
      }

      // ---- HOME STRETCH (52-56): move toward goal ----
      if (from >= HOME_STRETCH_START) {
        const to = this.calculateNewPosition(from, dice.total, color);
        if (to === null) continue;

        // No blocking or capture in home stretch; one piece per position
        const ownAtDest = player.pieces.some(
          (p) => p.id !== piece.id && p.position === to
        );
        if (ownAtDest) continue;

        moves.push({
          pieceId: piece.id,
          fromPosition: from,
          toPosition: to,
          isCapture: false,
          isThuaMa: false,
          isMandatory: false,
        });
        continue;
      }

      // ---- MAIN TRACK (0-51) ----
      const to = this.calculateNewPosition(from, dice.total, color);
      if (to === null) continue;

      // Check path blocking on main track segment
      if (to < BOARD_SIZE) {
        // Destination is still on main track
        if (this.isPathBlockedOnMainTrack(from, to, allPieces)) continue;

        // Own piece at destination blocks
        const ownAtDest = player.pieces.some(
          (p) => p.id !== piece.id && p.position === to
        );
        if (ownAtDest) continue;

        // Check for opponent at destination
        const isSafe = SAFE_ZONES.includes(to);
        let capturedColor: PlayerColor | undefined;
        let capturedPieceId: number | undefined;
        let isCapture = false;
        let blockedBySafeOpponent = false;

        for (const op of state.players) {
          if (op.color === color) continue;
          const opp = op.pieces.find((p) => p.position === to);
          if (opp) {
            if (isSafe) {
              // Opponent on safe zone — move is blocked
              blockedBySafeOpponent = true;
            } else {
              isCapture = true;
              capturedColor = op.color;
              capturedPieceId = opp.id;
            }
            break;
          }
        }

        if (blockedBySafeOpponent) continue;

        moves.push({
          pieceId: piece.id,
          fromPosition: from,
          toPosition: to,
          isCapture,
          capturedColor,
          capturedPieceId,
          isThuaMa: false,
          isMandatory: false,
        });
      } else {
        // Destination enters home stretch
        // Check blocking on main track up to home entry point
        const entry = HOME_ENTRY_BEFORE[color];
        if (this.isPathBlockedOnMainTrack(from, entry, allPieces)) continue;

        // Own piece at destination blocks
        const ownAtDest = player.pieces.some(
          (p) => p.id !== piece.id && p.position === to
        );
        if (ownAtDest) continue;

        moves.push({
          pieceId: piece.id,
          fromPosition: from,
          toPosition: to,
          isCapture: false,
          isThuaMa: true,
          isMandatory: false,
        });
      }
    }

    // MANDATORY rule: if any captures possible, return only capture moves
    const captureMoves = moves.filter((m) => m.isCapture);
    if (captureMoves.length > 0) {
      return captureMoves.map((m) => ({ ...m, isMandatory: true }));
    }

    return moves;
  }

  // -----------------------------------------------------------------------
  // Apply a move
  // -----------------------------------------------------------------------

  static applyMove(
    state: GameState,
    color: PlayerColor,
    pieceId: number
  ): GameState {
    const newState: GameState = JSON.parse(JSON.stringify(state));

    const move = newState.validMoves.find((m) => m.pieceId === pieceId);
    if (!move) throw new Error(`Invalid move: pieceId=${pieceId}`);

    const player = newState.players.find((p) => p.color === color)!;
    const piece = player.pieces.find((p) => p.id === pieceId)!;

    // Handle capture — send captured piece back to home base
    if (
      move.isCapture &&
      move.capturedColor !== undefined &&
      move.capturedPieceId !== undefined
    ) {
      const capturedPlayer = newState.players.find(
        (p) => p.color === move.capturedColor
      )!;
      const capturedPiece = capturedPlayer.pieces.find(
        (p) => p.id === move.capturedPieceId
      )!;
      capturedPiece.position = -1;
    }

    // Move the piece
    piece.position = move.toPosition;

    // Record last action
    newState.lastAction = {
      type: 'move',
      playerColor: color,
      pieceId,
      fromPosition: move.fromPosition,
      toPosition: move.toPosition,
      capture:
        move.isCapture && move.capturedColor !== undefined
          ? { color: move.capturedColor, pieceId: move.capturedPieceId! }
          : undefined,
    };

    // Check if player has won (all 4 pieces at GOAL_POSITION)
    const hasWon = player.pieces.every((p) => p.position === GOAL_POSITION);
    if (hasWon && !newState.rankings.includes(color)) {
      newState.rankings.push(color);
      player.rank = newState.rankings.length;
    }

    // Check game over: only one (or zero) active players remain
    const activePlayers = newState.players.filter(
      (p) => !newState.rankings.includes(p.color)
    );
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        const last = activePlayers[0];
        newState.rankings.push(last.color);
        last.rank = newState.rankings.length;
      }
      newState.status = 'finished';
      newState.currentPlayerColor = null;
      newState.dice = null;
      newState.validMoves = [];
      return newState;
    }

    // Determine next turn
    const dice = newState.dice!;
    if (dice.isSpecial) {
      // Same player rolls again
      newState.hasExtraTurn = true;
    } else {
      newState.hasExtraTurn = false;
      newState.currentPlayerColor = this.nextPlayer(newState, color);
    }

    newState.dice = null;
    newState.validMoves = [];
    newState.turnCount += 1;
    newState.turnStartedAt = Date.now();

    return newState;
  }

  // -----------------------------------------------------------------------
  // Apply dice roll — compute and attach valid moves
  // -----------------------------------------------------------------------

  static applyDiceRoll(state: GameState, dice: DiceResult): GameState {
    const newState: GameState = JSON.parse(JSON.stringify(state));
    newState.dice = dice;
    const color = newState.currentPlayerColor!;
    newState.validMoves = this.getValidMoves(newState, color);
    newState.lastAction = { type: 'roll', playerColor: color };
    return newState;
  }

  // -----------------------------------------------------------------------
  // Skip turn (no valid moves after roll)
  // -----------------------------------------------------------------------

  static skipTurn(state: GameState): GameState {
    const newState: GameState = JSON.parse(JSON.stringify(state));
    const color = newState.currentPlayerColor!;
    newState.lastAction = { type: 'skip', playerColor: color };
    newState.currentPlayerColor = this.nextPlayer(newState, color);
    newState.dice = null;
    newState.validMoves = [];
    newState.hasExtraTurn = false;
    newState.turnCount += 1;
    newState.turnStartedAt = Date.now();
    return newState;
  }

  // -----------------------------------------------------------------------
  // Turn order helper
  // -----------------------------------------------------------------------

  static nextPlayer(state: GameState, currentColor: PlayerColor): PlayerColor {
    const finishedColors = new Set(state.rankings);
    const startIdx = COLOR_ORDER.indexOf(currentColor);

    for (let i = 1; i <= COLOR_ORDER.length; i++) {
      const candidate = COLOR_ORDER[(startIdx + i) % COLOR_ORDER.length];
      if (finishedColors.has(candidate)) continue;
      const p = state.players.find((pl) => pl.color === candidate);
      if (!p) continue;
      // Skip disconnected bots
      if (p.isBot && !p.connected) continue;
      return candidate;
    }

    return currentColor;
  }

  // -----------------------------------------------------------------------
  // Initial game state factory
  // -----------------------------------------------------------------------

  static createInitialState(
    sessionId: string,
    roomCode: string,
    players: Array<{
      id: string;
      username: string;
      color: PlayerColor;
      isBot: boolean;
      botDifficulty?: BotDifficulty;
    }>
  ): GameState {
    const gamePlayers: Player[] = players.map((p) => ({
      id: p.id,
      username: p.username,
      color: p.color,
      pieces: [0, 1, 2, 3].map((i) => ({
        id: i,
        color: p.color,
        position: -1,
      })),
      isBot: p.isBot,
      botDifficulty: p.botDifficulty,
      connected: true,
    }));

    // Pick first player randomly among participants
    const participantColors = players.map((p) => p.color);
    const firstColor =
      participantColors[Math.floor(Math.random() * participantColors.length)];

    return {
      sessionId,
      roomCode,
      players: gamePlayers,
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

  // -----------------------------------------------------------------------
  // Check if a player has finished
  // -----------------------------------------------------------------------

  static isPlayerFinished(player: Player): boolean {
    return player.pieces.every((p) => p.position === GOAL_POSITION);
  }

  // -----------------------------------------------------------------------
  // Bot AI: choose a move
  // -----------------------------------------------------------------------

  static chooseBotMove(
    state: GameState,
    difficulty: BotDifficulty
  ): ValidMove | null {
    const moves = state.validMoves;
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    switch (difficulty) {
      case 'easy':
        return moves[Math.floor(Math.random() * moves.length)];
      case 'medium':
        return this.chooseMediumMove(moves);
      case 'hard':
        return this.chooseHardMove(moves);
      default:
        return moves[0];
    }
  }

  private static chooseMediumMove(moves: ValidMove[]): ValidMove {
    // Priority: captures > home advance > board advance > deploy
    const captures = moves.filter((m) => m.isCapture);
    if (captures.length > 0) return this.randomFrom(captures);

    const homeAdvance = moves.filter((m) => m.toPosition >= HOME_STRETCH_START);
    if (homeAdvance.length > 0) return this.randomFrom(homeAdvance);

    const boardAdvance = moves.filter(
      (m) => m.fromPosition >= 0 && m.toPosition < HOME_STRETCH_START
    );
    if (boardAdvance.length > 0) return this.randomFrom(boardAdvance);

    return this.randomFrom(moves);
  }

  private static chooseHardMove(moves: ValidMove[]): ValidMove {
    // Priority: home completion > captures > advance farthest piece
    const goalMoves = moves.filter((m) => m.toPosition === GOAL_POSITION);
    if (goalMoves.length > 0) return this.randomFrom(goalMoves);

    const captures = moves.filter((m) => m.isCapture);
    if (captures.length > 0) return this.randomFrom(captures);

    // Advance the piece with the highest destination (closest to goal)
    const sorted = [...moves].sort((a, b) => b.toPosition - a.toPosition);
    return sorted[0];
  }

  private static randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
