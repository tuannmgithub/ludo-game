'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/store/gameStore';
import { storage } from '@/lib/api';
import type { GameState, PlayerColor } from '@/types/game';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface RoomJoinedData {
  gameState: GameState;
  playerColor: PlayerColor;
  playerId: string;
}

interface GameStartedData {
  gameState: GameState;
}

interface DiceRolledData {
  gameState: GameState;
  rolledBy: PlayerColor;
}

interface PieceMovedData {
  gameState: GameState;
  movedBy: PlayerColor;
  pieceId: number;
  fromPosition: number;
  toPosition: number;
  captured?: { color: PlayerColor; pieceId: number };
}

interface GameOverData {
  gameState: GameState;
  rankings: PlayerColor[];
}

interface PlayerJoinedData {
  username: string;
  color: PlayerColor;
  playerCount: number;
  gameState: GameState;
}

interface PlayerLeftData {
  color: PlayerColor;
  username: string;
  gameState: GameState;
}

interface ErrorData {
  message: string;
  code?: string;
}

export function useSocket(roomCode: string) {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnected,
    setConnectionError,
    setGameState,
    setMyColor,
    setLastCapturedPieceId,
    setNotification,
    setCaptureEvent,
    setExitEvent,
    guestToken,
    playerId,
    username,
  } = useGameStore();

  const emitJoinRoom = useCallback(
    (socket: Socket) => {
      const creds = storage.getCredentials();
      const token = guestToken || creds.guestToken;
      const pid = playerId || creds.playerId;
      const uname = username || creds.username || 'Khách';

      socket.emit('join_room', {
        roomCode,
        username: uname,
        guestToken: token,
        playerId: pid,
      });
    },
    [roomCode, guestToken, playerId, username]
  );

  useEffect(() => {
    if (!roomCode) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
      emitJoinRoom(socket);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      setConnectionError(`Không thể kết nối: ${err.message}`);
      setConnected(false);
    });

    socket.on('room_joined', (data: RoomJoinedData) => {
      setGameState(data.gameState);
      setMyColor(data.playerColor);

      // Store playerId if returned
      if (data.playerId) {
        const creds = storage.getCredentials();
        storage.setCredentials(
          creds.guestToken || '',
          data.playerId,
          creds.username || ''
        );
      }
    });

    socket.on('game_started', (data: GameStartedData) => {
      setGameState(data.gameState);
      setNotification('Trò chơi bắt đầu!');
    });

    socket.on('dice_rolled', (data: DiceRolledData) => {
      setGameState(data.gameState);
    });

    socket.on('piece_moved', (data: PieceMovedData) => {
      const stamp = Date.now();

      // Piece exited stable → show sparkle burst at the gate square
      if (data.fromPosition === -1) {
        setExitEvent({ position: data.toPosition, color: data.movedBy, key: stamp });
        setTimeout(() => setExitEvent(null), 1100);
      }

      // A piece was captured → show explosion at the capture square
      if (data.captured) {
        setLastCapturedPieceId(data.captured.pieceId);
        setCaptureEvent({ position: data.toPosition, color: data.captured.color, key: stamp });
        setTimeout(() => {
          setLastCapturedPieceId(null);
          setCaptureEvent(null);
        }, 900);
      }

      setGameState(data.gameState);
    });

    socket.on('game_over', (data: GameOverData) => {
      setGameState(data.gameState);
    });

    socket.on('player_joined', (data: PlayerJoinedData) => {
      setGameState(data.gameState);
      setNotification(`${data.username} đã vào phòng`);
    });

    socket.on('player_left', (data: PlayerLeftData) => {
      setGameState(data.gameState);
      setNotification(`${data.username} đã rời phòng`);
    });

    socket.on('error', (data: ErrorData) => {
      setNotification(`Lỗi: ${data.message}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const rollDice = useCallback(() => {
    socketRef.current?.emit('roll_dice', { roomCode });
  }, [roomCode]);

  const movePiece = useCallback(
    (pieceId: number) => {
      socketRef.current?.emit('move_piece', { roomCode, pieceId });
    },
    [roomCode]
  );

  const startGame = useCallback(() => {
    socketRef.current?.emit('start_game', { roomCode });
  }, [roomCode]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave_room', { roomCode });
  }, [roomCode]);

  return {
    socket: socketRef.current,
    rollDice,
    movePiece,
    startGame,
    leaveRoom,
  };
}
