import { useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../types/game';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001';

export function useSocket(roomCode: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const {
    setGameState,
    setMyColor,
    setIsConnected,
    setIsConnecting,
    setConnectionError,
    setIsRolling,
    showToast,
    myPlayerId,
    guestToken,
    username,
  } = useGameStore();

  useEffect(() => {
    if (!roomCode) return;

    setIsConnecting(true);
    setConnectionError(null);

    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      socket.emit('join_room', {
        roomCode,
        username,
        guestToken,
        playerId: myPlayerId,
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      showToast('Mất kết nối với server', 'error');
    });

    socket.on('connect_error', (err: Error) => {
      setIsConnecting(false);
      setConnectionError(err.message);
      showToast('Không thể kết nối server', 'error');
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      showToast('Đã kết nối lại', 'success');
      socket.emit('join_room', {
        roomCode,
        username,
        guestToken,
        playerId: myPlayerId,
      });
    });

    socket.on('room_joined', (data: { gameState: GameState; playerColor: string }) => {
      setGameState(data.gameState);
      setMyColor(data.playerColor as any);
      showToast(`Đã vào phòng ${roomCode}`, 'success');
    });

    socket.on('game_state_updated', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    });

    socket.on('game_started', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
      showToast('Trò chơi bắt đầu!', 'success');
    });

    socket.on('dice_rolled', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
      setIsRolling(false);
    });

    socket.on('piece_moved', (data: { gameState: GameState; message?: string }) => {
      setGameState(data.gameState);
      if (data.message) {
        showToast(data.message, 'info');
      }
    });

    socket.on('player_captured', (data: { capturedColor: string; byColor: string }) => {
      showToast(`Quân ${data.capturedColor} bị bắt bởi ${data.byColor}!`, 'warning');
    });

    socket.on('player_finished', (data: { color: string; rank: number }) => {
      const rankText = data.rank === 1 ? 'Nhất' : data.rank === 2 ? 'Nhì' : data.rank === 3 ? 'Ba' : 'Tư';
      showToast(`${data.color} về ${rankText}!`, 'success');
    });

    socket.on('game_over', (data: { gameState: GameState }) => {
      setGameState(data.gameState);
      showToast('Trò chơi kết thúc!', 'info');
    });

    socket.on('player_joined', (data: { username: string }) => {
      showToast(`${data.username} đã vào phòng`, 'info');
    });

    socket.on('player_left', (data: { username: string }) => {
      showToast(`${data.username} đã rời phòng`, 'warning');
    });

    socket.on('error', (data: { message: string }) => {
      showToast(data.message || 'Có lỗi xảy ra', 'error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [roomCode]);

  const rollDice = useCallback(() => {
    if (socketRef.current?.connected) {
      setIsRolling(true);
      socketRef.current.emit('roll_dice');
    }
  }, []);

  const movePiece = useCallback((pieceId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('move_piece', { pieceId });
    }
  }, []);

  const startGame = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('start_game');
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_room');
    }
  }, []);

  return { rollDice, movePiece, startGame, leaveRoom };
}
