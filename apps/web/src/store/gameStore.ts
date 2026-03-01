'use client';

import { create } from 'zustand';
import type { GameState, Player, PlayerColor, ValidMove } from '@/types/game';

/** Piece-exited-stable animation event */
export interface ExitEvent {
  position: number;   // gate track position (0/13/26/39)
  color: PlayerColor; // colour of the piece that just exited
  key: number;        // unique stamp — changing key forces SVG remount so animation replays
}

/** Piece-captured animation event */
export interface CaptureEvent {
  position: number;   // track square where the capture occurred
  color: PlayerColor; // colour of the piece that was captured (sent back to stable)
  key: number;
}

interface GameStore {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Auth / identity
  guestToken: string | null;
  playerId: string | null;
  username: string;

  // Game state
  gameState: GameState | null;
  myColor: PlayerColor | null;

  // UI state
  isRolling: boolean;
  lastCapturedPieceId: number | null;
  notification: string | null;

  // Animation events
  captureEvent: CaptureEvent | null;
  exitEvent: ExitEvent | null;

  // Setters
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setCredentials: (token: string, id: string, username: string) => void;
  setUsername: (username: string) => void;
  setGameState: (state: GameState) => void;
  setMyColor: (color: PlayerColor) => void;
  setIsRolling: (rolling: boolean) => void;
  setLastCapturedPieceId: (id: number | null) => void;
  setNotification: (msg: string | null) => void;
  setCaptureEvent: (event: CaptureEvent | null) => void;
  setExitEvent: (event: ExitEvent | null) => void;
  reset: () => void;

  // Computed helpers (as functions since zustand doesn't have computed directly)
  isMyTurn: () => boolean;
  myPlayer: () => Player | null;
  myValidMoves: () => ValidMove[];
  canRollDice: () => boolean;
}

const initialState = {
  isConnected: false,
  connectionError: null,
  guestToken: null,
  playerId: null,
  username: '',
  gameState: null,
  myColor: null,
  isRolling: false,
  lastCapturedPieceId: null,
  notification: null,
  captureEvent: null,
  exitEvent: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),

  setCredentials: (token, id, username) =>
    set({ guestToken: token, playerId: id, username }),

  setUsername: (username) => set({ username }),

  setGameState: (state) => set({ gameState: state }),

  setMyColor: (color) => set({ myColor: color }),

  setIsRolling: (rolling) => set({ isRolling: rolling }),

  setLastCapturedPieceId: (id) => set({ lastCapturedPieceId: id }),

  setCaptureEvent: (event) => set({ captureEvent: event }),
  setExitEvent: (event) => set({ exitEvent: event }),

  setNotification: (msg) => {
    set({ notification: msg });
    if (msg) {
      setTimeout(() => {
        const { notification } = get();
        if (notification === msg) set({ notification: null });
      }, 3000);
    }
  },

  reset: () => set(initialState),

  // Computed
  isMyTurn: () => {
    const { gameState, myColor } = get();
    if (!gameState || !myColor) return false;
    return gameState.currentPlayerColor === myColor && gameState.status === 'playing';
  },

  myPlayer: () => {
    const { gameState, myColor } = get();
    if (!gameState || !myColor) return null;
    return gameState.players.find((p) => p.color === myColor) ?? null;
  },

  myValidMoves: () => {
    const { gameState } = get();
    if (!gameState) return [];
    return gameState.validMoves;
  },

  canRollDice: () => {
    const { gameState, myColor, isRolling } = get();
    if (!gameState || !myColor || isRolling) return false;
    if (gameState.status !== 'playing') return false;
    if (gameState.currentPlayerColor !== myColor) return false;
    // Can roll if no dice yet OR if we have extra turn and already moved
    return gameState.dice === null || (gameState.hasExtraTurn && gameState.validMoves.length === 0);
  },
}));
