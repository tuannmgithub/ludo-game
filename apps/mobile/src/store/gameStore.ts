import { create } from 'zustand';
import { GameState, PlayerColor } from '../types/game';

interface GameStore {
  // Auth / identity
  myPlayerId: string | null;
  guestToken: string | null;
  username: string;

  // Room state
  roomCode: string | null;
  myColor: PlayerColor | null;

  // Game state from server
  gameState: GameState | null;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // UI state
  selectedPieceId: number | null;
  isRolling: boolean;
  turnTimeLeft: number;

  // Toast / notification
  toastMessage: string | null;
  toastType: 'info' | 'success' | 'error' | 'warning';

  // Actions
  setMyPlayerId: (id: string) => void;
  setGuestToken: (token: string) => void;
  setUsername: (name: string) => void;
  setRoomCode: (code: string | null) => void;
  setMyColor: (color: PlayerColor | null) => void;
  setGameState: (state: GameState) => void;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setSelectedPieceId: (id: number | null) => void;
  setIsRolling: (rolling: boolean) => void;
  setTurnTimeLeft: (seconds: number) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  clearToast: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  myPlayerId: null,
  guestToken: null,
  username: 'Người chơi',
  roomCode: null,
  myColor: null,
  gameState: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  selectedPieceId: null,
  isRolling: false,
  turnTimeLeft: 30,
  toastMessage: null,
  toastType: 'info',

  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setGuestToken: (token) => set({ guestToken: token }),
  setUsername: (name) => set({ username: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  setMyColor: (color) => set({ myColor: color }),
  setGameState: (state) => set({ gameState: state }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnectionError: (error) => set({ connectionError: error }),
  setSelectedPieceId: (id) => set({ selectedPieceId: id }),
  setIsRolling: (rolling) => set({ isRolling: rolling }),
  setTurnTimeLeft: (seconds) => set({ turnTimeLeft: seconds }),

  showToast: (message, type = 'info') =>
    set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),

  resetGame: () =>
    set({
      roomCode: null,
      myColor: null,
      gameState: null,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      selectedPieceId: null,
      isRolling: false,
      turnTimeLeft: 30,
      toastMessage: null,
    }),
}));
