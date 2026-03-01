import { v4 as uuidv4 } from 'uuid';
import {
  PlayerColor,
  BotDifficulty,
  GameState,
  Room,
  RoomInfo,
  COLOR_ORDER,
} from './types';
import { GameEngine } from './game-engine';

// -------------------------------------------------------------------------
// In-memory stores
// -------------------------------------------------------------------------

/** Main room registry: roomCode → Room */
export const rooms = new Map<string, Room>();

/** Quick lookup: playerId → roomCode */
export const playerRooms = new Map<string, string>();

/** Socket tracking: socketId → { playerId, roomCode } */
export const socketPlayers = new Map<
  string,
  { playerId: string; roomCode: string }
>();

// -------------------------------------------------------------------------
// Utility helpers
// -------------------------------------------------------------------------

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function uniqueRoomCode(): string {
  let code = generateRoomCode();
  let attempts = 0;
  while (rooms.has(code) && attempts < 100) {
    code = generateRoomCode();
    attempts++;
  }
  return code;
}

export function generateUsername(): string {
  return 'Ngựa' + String(Math.floor(1000 + Math.random() * 9000));
}

function botUsername(color: PlayerColor): string {
  return `Bot_${color.charAt(0).toUpperCase() + color.slice(1)}`;
}

// -------------------------------------------------------------------------
// Room creation
// -------------------------------------------------------------------------

export interface CreateRoomOptions {
  hostPlayerId: string;
  hostUsername: string;
  maxPlayers: 2 | 3 | 4;
  withBots: boolean;
  botDifficulty?: BotDifficulty;
}

interface RoomPlayerEntry {
  id: string;
  username: string;
  color: PlayerColor;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  connected: boolean;
}

export function createRoom(options: CreateRoomOptions): Room {
  const {
    hostPlayerId,
    hostUsername,
    maxPlayers,
    withBots,
    botDifficulty = 'medium',
  } = options;

  const code = uniqueRoomCode();
  const hostColor: PlayerColor = 'red'; // Host always gets red

  // Build initial waiting-state players list
  const players: RoomPlayerEntry[] = [
    {
      id: hostPlayerId,
      username: hostUsername,
      color: hostColor,
      isBot: false,
      connected: true,
    },
  ];

  // Pre-fill bot slots if requested
  if (withBots) {
    const botColors = COLOR_ORDER.filter((c) => c !== hostColor).slice(
      0,
      maxPlayers - 1
    );
    for (const color of botColors) {
      players.push({
        id: uuidv4(),
        username: botUsername(color),
        color,
        isBot: true,
        botDifficulty,
        connected: true,
      });
    }
  }

  // Create a waiting game state (not started yet)
  const gameState: GameState = {
    sessionId: uuidv4(),
    roomCode: code,
    players: players.map((p) => ({
      id: p.id,
      username: p.username,
      color: p.color,
      pieces: [0, 1, 2, 3].map((i) => ({ id: i, color: p.color, position: -1 })),
      isBot: p.isBot,
      botDifficulty: p.botDifficulty,
      connected: true,
    })),
    currentPlayerColor: null,
    status: 'waiting',
    dice: null,
    validMoves: [],
    rankings: [],
    turnCount: 0,
    hasExtraTurn: false,
    turnStartedAt: 0,
  };

  const room: Room = {
    code,
    hostPlayerId,
    maxPlayers,
    withBots,
    gameState,
    botTimers: new Map(),
  };

  rooms.set(code, room);
  playerRooms.set(hostPlayerId, code);

  return room;
}

// -------------------------------------------------------------------------
// Join room
// -------------------------------------------------------------------------

export interface JoinRoomResult {
  success: true;
  room: Room;
  assignedColor: PlayerColor;
  playerId: string;
}

export interface JoinRoomError {
  success: false;
  error: string;
}

export function joinRoom(
  roomCode: string,
  playerId: string,
  username: string
): JoinRoomResult | JoinRoomError {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.gameState.status !== 'waiting') {
    return { success: false, error: 'Game already in progress' };
  }

  // Check if player is re-joining (already in room)
  const existing = room.gameState.players.find((p) => p.id === playerId);
  if (existing) {
    existing.connected = true;
    playerRooms.set(playerId, roomCode);
    return { success: true, room, assignedColor: existing.color, playerId };
  }

  // Count non-bot human slots
  const humanPlayers = room.gameState.players.filter((p) => !p.isBot);
  if (humanPlayers.length >= room.maxPlayers) {
    return { success: false, error: 'Room is full' };
  }

  // Find next available color (not taken by humans yet; replace a bot if withBots)
  const takenColors = new Set(
    room.gameState.players.filter((p) => !p.isBot).map((p) => p.color)
  );
  const availableColor = COLOR_ORDER.find((c) => !takenColors.has(c));
  if (!availableColor) return { success: false, error: 'No available color' };

  if (room.withBots) {
    // Replace the bot slot for this color
    const botIdx = room.gameState.players.findIndex(
      (p) => p.isBot && p.color === availableColor
    );
    if (botIdx !== -1) {
      room.gameState.players[botIdx] = {
        id: playerId,
        username,
        color: availableColor,
        pieces: [0, 1, 2, 3].map((i) => ({
          id: i,
          color: availableColor,
          position: -1,
        })),
        isBot: false,
        connected: true,
      };
    } else {
      addPlayerToRoom(room, playerId, username, availableColor);
    }
  } else {
    addPlayerToRoom(room, playerId, username, availableColor);
  }

  playerRooms.set(playerId, roomCode);
  return { success: true, room, assignedColor: availableColor, playerId };
}

function addPlayerToRoom(
  room: Room,
  playerId: string,
  username: string,
  color: PlayerColor
): void {
  room.gameState.players.push({
    id: playerId,
    username,
    color,
    pieces: [0, 1, 2, 3].map((i) => ({ id: i, color, position: -1 })),
    isBot: false,
    connected: true,
  });
}

// -------------------------------------------------------------------------
// Start game
// -------------------------------------------------------------------------

export function startGame(roomCode: string, requestingPlayerId: string): { success: false; error: string } | { success: true; room: Room } {
  const room = rooms.get(roomCode);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.hostPlayerId !== requestingPlayerId) {
    return { success: false, error: 'Only host can start the game' };
  }
  if (room.gameState.status !== 'waiting') {
    return { success: false, error: 'Game already started' };
  }
  if (room.gameState.players.length < 2) {
    return { success: false, error: 'Need at least 2 players to start' };
  }

  // Build new game state from current player list
  const playerList = room.gameState.players.map((p) => ({
    id: p.id,
    username: p.username,
    color: p.color,
    isBot: p.isBot,
    botDifficulty: p.botDifficulty,
  }));

  room.gameState = GameEngine.createInitialState(
    uuidv4(),
    roomCode,
    playerList
  );

  return { success: true, room };
}

// -------------------------------------------------------------------------
// Leave / disconnect handling
// -------------------------------------------------------------------------

export function handlePlayerLeave(
  roomCode: string,
  playerId: string
): { room: Room | null; leftColor: string | null } {
  const room = rooms.get(roomCode);
  if (!room) return { room: null, leftColor: null };

  const player = room.gameState.players.find((p) => p.id === playerId);
  if (!player) return { room, leftColor: null };

  const leftColor = player.color;
  player.connected = false;

  playerRooms.delete(playerId);

  // If game is waiting and player was the host — reassign host
  if (room.gameState.status === 'waiting') {
    const remainingHumans = room.gameState.players.filter(
      (p) => !p.isBot && p.connected && p.id !== playerId
    );
    if (remainingHumans.length === 0) {
      // Remove the room entirely
      cleanupRoom(roomCode);
      return { room: null, leftColor };
    }
    if (room.hostPlayerId === playerId) {
      room.hostPlayerId = remainingHumans[0].id;
    }
    // Remove the player from waiting room
    room.gameState.players = room.gameState.players.filter(
      (p) => p.id !== playerId
    );
  }
  // During a game: keep player as disconnected, may be replaced by bot later

  // Check if ALL human players are gone — clean up
  const connectedHumans = room.gameState.players.filter(
    (p) => !p.isBot && p.connected
  );
  if (connectedHumans.length === 0 && room.gameState.status === 'playing') {
    cleanupRoom(roomCode);
    return { room: null, leftColor };
  }

  return { room, leftColor };
}

// Replace a disconnected human player with a bot
export function replaceWithBot(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const player = room.gameState.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.isBot = true;
  player.botDifficulty = 'easy';
  player.username = `${player.username} (Bot)`;
  player.connected = true;

  return room;
}

// -------------------------------------------------------------------------
// Cleanup
// -------------------------------------------------------------------------

export function cleanupRoom(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear all timers
  if (room.turnTimer) clearTimeout(room.turnTimer);
  for (const timer of room.botTimers.values()) clearTimeout(timer);
  room.botTimers.clear();

  // Remove player→room mappings
  for (const p of room.gameState.players) {
    playerRooms.delete(p.id);
  }

  rooms.delete(roomCode);
}

// -------------------------------------------------------------------------
// Queries
// -------------------------------------------------------------------------

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function getRoomByPlayer(playerId: string): Room | undefined {
  const code = playerRooms.get(playerId);
  return code ? rooms.get(code) : undefined;
}

export function listPublicRooms(): RoomInfo[] {
  const result: RoomInfo[] = [];
  for (const room of rooms.values()) {
    if (room.gameState.status !== 'waiting') continue;
    result.push(roomToInfo(room));
  }
  return result;
}

export function roomToInfo(room: Room): RoomInfo {
  const host = room.gameState.players.find(
    (p) => p.id === room.hostPlayerId
  );
  return {
    roomCode: room.code,
    hostUsername: host?.username ?? 'Unknown',
    playerCount: room.gameState.players.filter((p) => !p.isBot).length,
    maxPlayers: room.maxPlayers,
    status: room.gameState.status,
    players: room.gameState.players.map((p) => ({
      username: p.username,
      color: p.color,
      isBot: p.isBot,
      connected: p.connected,
    })),
    withBots: room.withBots,
  };
}
