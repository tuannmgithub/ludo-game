import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import {
  PlayerColor,
  BotDifficulty,
  GuestTokenPayload,
  TURN_TIMEOUT_MS,
  Room,
  GameState,
} from './types';
import { GameEngine } from './game-engine';
import {
  playerRooms,
  socketPlayers,
  getRoom,
  joinRoom,
  startGame,
  handlePlayerLeave,
  replaceWithBot,
} from './room-manager';
import { JWT_SECRET } from './routes/auth';

// -------------------------------------------------------------------------
// Build piece_moved payload with move metadata
// -------------------------------------------------------------------------

function buildMovePayload(
  beforeState: GameState,
  afterState: GameState,
  color: PlayerColor,
  pieceId: number
) {
  // Position before the move
  const fromPiece = beforeState.players
    .flatMap((p) => p.pieces)
    .find((p) => p.id === pieceId);
  const fromPosition = fromPiece?.position ?? -1;

  // Position after the move
  const toPiece = afterState.players
    .flatMap((p) => p.pieces)
    .find((p) => p.id === pieceId);
  const toPosition = toPiece?.position ?? -1;

  // Detect captured piece: an opponent piece that was NOT at -1 before but IS at -1 after
  const beforePos = new Map(
    beforeState.players
      .filter((p) => p.color !== color)
      .flatMap((p) => p.pieces.map((pc) => [pc.id, { pos: pc.position, color: p.color }]))
  );
  let captured: { color: PlayerColor; pieceId: number } | undefined;
  for (const p of afterState.players) {
    if (p.color === color) continue;
    for (const pc of p.pieces) {
      const before = beforePos.get(pc.id);
      if (before && before.pos !== -1 && pc.position === -1) {
        captured = { color: before.color, pieceId: pc.id };
        break;
      }
    }
    if (captured) break;
  }

  return { movedBy: color, pieceId, fromPosition, toPosition, captured };
}

// -------------------------------------------------------------------------
// Bot turn helpers
// -------------------------------------------------------------------------

const BOT_MIN_DELAY_MS = 1000;
const BOT_MAX_DELAY_MS = 2000;
const DISCONNECT_BOT_REPLACE_MS = 30000;

function botDelay(): number {
  return (
    BOT_MIN_DELAY_MS +
    Math.floor(Math.random() * (BOT_MAX_DELAY_MS - BOT_MIN_DELAY_MS))
  );
}

// -------------------------------------------------------------------------
// Turn timer management
// -------------------------------------------------------------------------

function clearTurnTimer(room: Room): void {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = undefined;
  }
}

function startTurnTimer(io: Server, room: Room): void {
  clearTurnTimer(room);
  room.turnTimer = setTimeout(() => {
    handleTurnTimeout(io, room.code);
  }, TURN_TIMEOUT_MS);
}

function handleTurnTimeout(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room || room.gameState.status !== 'playing') return;
  if (!room.gameState.currentPlayerColor) return;

  const color = room.gameState.currentPlayerColor;
  const state = room.gameState;

  if (!state.dice) {
    // Player hasn't rolled — auto-roll and auto-move or skip
    const dice = GameEngine.rollDice();
    let newState = GameEngine.applyDiceRoll(state, dice);

    if (newState.validMoves.length > 0) {
      const move = newState.validMoves[0];
      newState = GameEngine.applyMove(newState, color, move.pieceId);
    } else {
      newState = GameEngine.skipTurn(newState);
    }
    newState.lastAction = { type: 'timeout', playerColor: color };
    room.gameState = newState;
  } else {
    // Player rolled but didn't pick a move
    if (state.validMoves.length > 0) {
      const move = state.validMoves[0];
      const newState = GameEngine.applyMove(state, color, move.pieceId);
      newState.lastAction = { type: 'timeout', playerColor: color };
      room.gameState = newState;
    } else {
      room.gameState = GameEngine.skipTurn(state);
      room.gameState.lastAction = { type: 'timeout', playerColor: color };
    }
  }

  io.to(roomCode).emit('piece_moved', { gameState: room.gameState });

  if (room.gameState.status === 'finished') {
    io.to(roomCode).emit('game_over', { gameState: room.gameState });
    return;
  }

  scheduleNextTurn(io, room);
}

// -------------------------------------------------------------------------
// Schedule next turn (handles bots + turn timer)
// -------------------------------------------------------------------------

function scheduleNextTurn(io: Server, room: Room): void {
  if (room.gameState.status !== 'playing') return;

  const currentColor = room.gameState.currentPlayerColor;
  if (!currentColor) return;

  const currentPlayer = room.gameState.players.find(
    (p) => p.color === currentColor
  );
  if (!currentPlayer) return;

  if (currentPlayer.isBot) {
    scheduleBotTurn(io, room, currentPlayer.id, currentColor, currentPlayer.botDifficulty || 'medium');
  } else {
    startTurnTimer(io, room);
  }
}

function scheduleBotTurn(
  io: Server,
  room: Room,
  botId: string,
  color: PlayerColor,
  difficulty: BotDifficulty
): void {
  clearTurnTimer(room);

  // Clear any existing bot timer for this bot
  const existingTimer = room.botTimers.get(botId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    room.botTimers.delete(botId);
    executeBotTurn(io, room.code, color, difficulty);
  }, botDelay());

  room.botTimers.set(botId, timer);
}

function executeBotTurn(
  io: Server,
  roomCode: string,
  color: PlayerColor,
  difficulty: BotDifficulty
): void {
  const room = getRoom(roomCode);
  if (!room || room.gameState.status !== 'playing') return;
  if (room.gameState.currentPlayerColor !== color) return;

  // Roll dice
  const dice = GameEngine.rollDice();
  let newState = GameEngine.applyDiceRoll(room.gameState, dice);
  room.gameState = newState;

  io.to(roomCode).emit('dice_rolled', { gameState: room.gameState });

  // Short pause before selecting the move
  setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r || r.gameState.status !== 'playing') return;
    if (r.gameState.currentPlayerColor !== color) return;

    if (r.gameState.validMoves.length === 0) {
      r.gameState = GameEngine.skipTurn(r.gameState);
      io.to(roomCode).emit('piece_moved', { gameState: r.gameState });

      if (r.gameState.status === 'finished') {
        io.to(roomCode).emit('game_over', { gameState: r.gameState });
        return;
      }

      scheduleNextTurn(io, r);
      return;
    }

    const chosenMove = GameEngine.chooseBotMove(r.gameState, difficulty);
    if (!chosenMove) {
      r.gameState = GameEngine.skipTurn(r.gameState);
      io.to(roomCode).emit('piece_moved', { gameState: r.gameState });

      if (r.gameState.status === 'finished') {
        io.to(roomCode).emit('game_over', { gameState: r.gameState });
        return;
      }

      scheduleNextTurn(io, r);
      return;
    }

    const beforeBotMove = r.gameState;
    r.gameState = GameEngine.applyMove(r.gameState, color, chosenMove.pieceId);
    io.to(roomCode).emit('piece_moved', {
      gameState: r.gameState,
      ...buildMovePayload(beforeBotMove, r.gameState, color, chosenMove.pieceId),
    });

    if (r.gameState.status === 'finished') {
      io.to(roomCode).emit('game_over', { gameState: r.gameState });
      return;
    }

    scheduleNextTurn(io, r);
  }, Math.floor(botDelay() / 2));
}

// -------------------------------------------------------------------------
// Main socket setup
// -------------------------------------------------------------------------

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ------------------------------------------------------------------
    // join_room
    // ------------------------------------------------------------------
    socket.on(
      'join_room',
      (
        payload: {
          roomCode: string;
          username?: string;
          guestToken?: string;
          playerId?: string;
        },
        callback?: (data: unknown) => void
      ) => {
        try {
          const { roomCode, username, guestToken, playerId: payloadPlayerId } = payload;

          if (!roomCode) {
            socket.emit('error', { message: 'roomCode is required', code: 'INVALID_PAYLOAD' });
            return;
          }

          const upperCode = roomCode.toUpperCase();

          // Resolve player identity
          let resolvedPlayerId: string | null = null;
          let resolvedUsername: string = username || 'Unknown';

          if (guestToken) {
            try {
              const decoded = jwt.verify(guestToken, JWT_SECRET) as GuestTokenPayload;
              resolvedPlayerId = decoded.playerId;
              resolvedUsername = username || decoded.username;
            } catch {
              // Invalid token — use payloadPlayerId if provided
            }
          }

          if (!resolvedPlayerId && payloadPlayerId) {
            resolvedPlayerId = payloadPlayerId;
          }

          if (!resolvedPlayerId) {
            socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
          }

          // Check if player is already in this room (reconnect)
          const existingRoom = getRoom(upperCode);
          if (!existingRoom) {
            socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
            return;
          }

          const existingPlayer = existingRoom.gameState.players.find(
            (p) => p.id === resolvedPlayerId
          );

          if (existingPlayer) {
            // Reconnect
            existingPlayer.connected = true;
            socketPlayers.set(socket.id, { playerId: resolvedPlayerId!, roomCode: upperCode });
            playerRooms.set(resolvedPlayerId!, upperCode);

            socket.join(upperCode);
            socket.emit('room_joined', {
              gameState: existingRoom.gameState,
              playerColor: existingPlayer.color,
              playerId: resolvedPlayerId,
            });
            socket.to(upperCode).emit('player_joined', { gameState: existingRoom.gameState });
            return;
          }

          // New player joining
          const result = joinRoom(upperCode, resolvedPlayerId!, resolvedUsername);
          if (!result.success) {
            const joinErr = result as { success: false; error: string };
            socket.emit('error', { message: joinErr.error, code: 'JOIN_FAILED' });
            return;
          }

          socketPlayers.set(socket.id, { playerId: resolvedPlayerId!, roomCode: upperCode });

          socket.join(upperCode);
          socket.emit('room_joined', {
            gameState: result.room.gameState,
            playerColor: result.assignedColor,
            playerId: resolvedPlayerId,
          });
          socket.to(upperCode).emit('player_joined', { gameState: result.room.gameState });
        } catch (err) {
          console.error('[socket] join_room error:', err);
          socket.emit('error', { message: 'Failed to join room', code: 'SERVER_ERROR' });
        }
      }
    );

    // ------------------------------------------------------------------
    // start_game
    // ------------------------------------------------------------------
    socket.on('start_game', () => {
      try {
        const info = socketPlayers.get(socket.id);
        if (!info) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { playerId, roomCode } = info;
        const result = startGame(roomCode, playerId);

        if (!result.success) {
          const startErr = result as { success: false; error: string };
          socket.emit('error', { message: startErr.error, code: 'START_FAILED' });
          return;
        }

        const room = (result as { success: true; room: Room }).room;
        io.to(roomCode).emit('game_started', { gameState: room.gameState });

        // Start first turn
        scheduleNextTurn(io, room);
      } catch (err) {
        console.error('[socket] start_game error:', err);
        socket.emit('error', { message: 'Failed to start game', code: 'SERVER_ERROR' });
      }
    });

    // ------------------------------------------------------------------
    // roll_dice
    // ------------------------------------------------------------------
    socket.on('roll_dice', () => {
      try {
        const info = socketPlayers.get(socket.id);
        if (!info) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { playerId, roomCode } = info;
        const room = getRoom(roomCode);

        if (!room || room.gameState.status !== 'playing') {
          socket.emit('error', { message: 'Game not in progress', code: 'GAME_NOT_PLAYING' });
          return;
        }

        const player = room.gameState.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit('error', { message: 'Player not found', code: 'PLAYER_NOT_FOUND' });
          return;
        }

        if (room.gameState.currentPlayerColor !== player.color) {
          socket.emit('error', { message: 'Not your turn', code: 'NOT_YOUR_TURN' });
          return;
        }

        if (room.gameState.dice !== null) {
          socket.emit('error', { message: 'Already rolled', code: 'ALREADY_ROLLED' });
          return;
        }

        // Cancel turn timer — player is active
        clearTurnTimer(room);

        const dice = GameEngine.rollDice();
        room.gameState = GameEngine.applyDiceRoll(room.gameState, dice);

        io.to(roomCode).emit('dice_rolled', { gameState: room.gameState });

        // If no valid moves — auto-skip after short delay
        if (room.gameState.validMoves.length === 0) {
          setTimeout(() => {
            const r = getRoom(roomCode);
            if (!r || r.gameState.status !== 'playing') return;
            r.gameState = GameEngine.skipTurn(r.gameState);
            io.to(roomCode).emit('piece_moved', { gameState: r.gameState });

            if (r.gameState.status === 'finished') {
              io.to(roomCode).emit('game_over', { gameState: r.gameState });
              return;
            }

            scheduleNextTurn(io, r);
          }, 1500);
        } else {
          // Start timer for move selection
          startTurnTimer(io, room);
        }
      } catch (err) {
        console.error('[socket] roll_dice error:', err);
        socket.emit('error', { message: 'Failed to roll dice', code: 'SERVER_ERROR' });
      }
    });

    // ------------------------------------------------------------------
    // move_piece
    // ------------------------------------------------------------------
    socket.on('move_piece', (payload: { pieceId: number }) => {
      try {
        const info = socketPlayers.get(socket.id);
        if (!info) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { playerId, roomCode } = info;
        const room = getRoom(roomCode);

        if (!room || room.gameState.status !== 'playing') {
          socket.emit('error', { message: 'Game not in progress', code: 'GAME_NOT_PLAYING' });
          return;
        }

        const player = room.gameState.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit('error', { message: 'Player not found', code: 'PLAYER_NOT_FOUND' });
          return;
        }

        if (room.gameState.currentPlayerColor !== player.color) {
          socket.emit('error', { message: 'Not your turn', code: 'NOT_YOUR_TURN' });
          return;
        }

        if (room.gameState.dice === null) {
          socket.emit('error', { message: 'Must roll dice first', code: 'NO_DICE_ROLLED' });
          return;
        }

        const { pieceId } = payload;
        if (pieceId === undefined || pieceId === null) {
          socket.emit('error', { message: 'pieceId is required', code: 'INVALID_PAYLOAD' });
          return;
        }

        // Validate that move is in validMoves
        const validMove = room.gameState.validMoves.find((m) => m.pieceId === pieceId);
        if (!validMove) {
          socket.emit('error', { message: 'Invalid move', code: 'INVALID_MOVE' });
          return;
        }

        // Cancel turn timer
        clearTurnTimer(room);

        const beforeMove = room.gameState;
        room.gameState = GameEngine.applyMove(
          room.gameState,
          player.color,
          pieceId
        );

        io.to(roomCode).emit('piece_moved', {
          gameState: room.gameState,
          ...buildMovePayload(beforeMove, room.gameState, player.color, pieceId),
        });

        if (room.gameState.status === 'finished') {
          io.to(roomCode).emit('game_over', { gameState: room.gameState });
          return;
        }

        scheduleNextTurn(io, room);
      } catch (err) {
        console.error('[socket] move_piece error:', err);
        socket.emit('error', { message: 'Failed to move piece', code: 'SERVER_ERROR' });
      }
    });

    // ------------------------------------------------------------------
    // leave_room
    // ------------------------------------------------------------------
    socket.on('leave_room', () => {
      handleDisconnect(socket, io, true);
    });

    // ------------------------------------------------------------------
    // disconnect
    // ------------------------------------------------------------------
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      handleDisconnect(socket, io, false);
    });
  });
}

// -------------------------------------------------------------------------
// Disconnect / leave handling
// -------------------------------------------------------------------------

function handleDisconnect(
  socket: Socket,
  io: Server,
  isExplicit: boolean
): void {
  const info = socketPlayers.get(socket.id);
  if (!info) return;

  const { playerId, roomCode } = info;
  socketPlayers.delete(socket.id);

  const room = getRoom(roomCode);
  if (!room) return;

  const player = room.gameState.players.find((p) => p.id === playerId);
  if (!player) return;

  const { room: updatedRoom, leftColor } = handlePlayerLeave(roomCode, playerId);

  if (!updatedRoom) {
    // Room was cleaned up
    return;
  }

  io.to(roomCode).emit('player_left', {
    gameState: updatedRoom.gameState,
    playerColor: leftColor,
  });

  // If game is in progress and player was human, schedule bot replacement
  if (!isExplicit && updatedRoom.gameState.status === 'playing' && !player.isBot) {
    const replacementTimer = setTimeout(() => {
      const r = getRoom(roomCode);
      if (!r) return;
      const p = r.gameState.players.find((pl) => pl.id === playerId);
      if (!p || p.connected) return; // Player reconnected

      const updatedR = replaceWithBot(roomCode, playerId);
      if (!updatedR) return;

      console.log(`[socket] Replaced disconnected player ${playerId} with bot`);
      io.to(roomCode).emit('player_joined', { gameState: updatedR.gameState });

      // If it was that player's turn, schedule bot turn
      if (updatedR.gameState.currentPlayerColor === p.color) {
        scheduleNextTurn(io, updatedR);
      }
    }, DISCONNECT_BOT_REPLACE_MS);

    // Store the timer on the room so it can be cancelled on reconnect
    room.botTimers.set(`disconnect_${playerId}`, replacementTimer);
  }

  // If it was the leaving player's turn and game is still going, advance turn
  if (
    updatedRoom.gameState.status === 'playing' &&
    updatedRoom.gameState.currentPlayerColor === player.color &&
    player.connected === false
  ) {
    clearTurnTimer(updatedRoom);

    // Move to next player
    updatedRoom.gameState = GameEngine.skipTurn(updatedRoom.gameState);
    io.to(roomCode).emit('piece_moved', { gameState: updatedRoom.gameState });

    if (updatedRoom.gameState.status === 'finished') {
      io.to(roomCode).emit('game_over', { gameState: updatedRoom.gameState });
      return;
    }

    scheduleNextTurn(io, updatedRoom);
  }
}
