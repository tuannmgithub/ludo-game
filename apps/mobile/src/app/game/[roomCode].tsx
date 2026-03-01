import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  BackHandler,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../store/gameStore';
import { GameBoard } from '../../components/GameBoard';
import { DiceRoller } from '../../components/DiceRoller';
import { PlayerPanel } from '../../components/PlayerPanel';
import { GameOverModal } from '../../components/GameOverModal';
import { PlayerColor, COLOR_HEX } from '../../types/game';

const COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Đỏ',
  blue: 'Xanh',
  yellow: 'Vàng',
  green: 'Lục',
};

export default function GameScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const {
    gameState,
    myColor,
    selectedPieceId,
    setSelectedPieceId,
    isRolling,
    isConnected,
    isConnecting,
    connectionError,
    turnTimeLeft,
    setTurnTimeLeft,
  } = useGameStore();

  const { rollDice, movePiece, startGame, leaveRoom } = useSocket(roomCode ?? null);
  const [showGameOver, setShowGameOver] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerAnim = useRef(new Animated.Value(1)).current;

  // Handle game over
  useEffect(() => {
    if (gameState?.status === 'finished') {
      setShowGameOver(true);
    }
  }, [gameState?.status]);

  // Turn timer
  const timeLeftRef = useRef(30);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (gameState?.status === 'playing' && gameState.turnStartedAt) {
      const TURN_DURATION = 30;
      const elapsed = Math.floor((Date.now() - gameState.turnStartedAt) / 1000);
      const remaining = Math.max(0, TURN_DURATION - elapsed);
      timeLeftRef.current = remaining;
      setTurnTimeLeft(remaining);

      timerRef.current = setInterval(() => {
        timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
        setTurnTimeLeft(timeLeftRef.current);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.turnStartedAt, gameState?.currentPlayerColor]);

  // Animate timer bar
  useEffect(() => {
    Animated.timing(timerAnim, {
      toValue: turnTimeLeft / 30,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [turnTimeLeft]);

  // Android back button handler
  useEffect(() => {
    const onBackPress = () => {
      handleLeave();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [gameState]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Rời Phòng',
      'Bạn có chắc muốn rời khỏi trận đấu?',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Rời',
          style: 'destructive',
          onPress: () => {
            leaveRoom();
            router.replace('/');
          },
        },
      ]
    );
  }, [leaveRoom]);

  const handlePiecePress = useCallback(
    async (pieceId: number, color: PlayerColor) => {
      if (!gameState || gameState.status !== 'playing') return;

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      // If it's my piece and it's my turn and dice has been rolled
      if (color === myColor && gameState.currentPlayerColor === myColor && gameState.dice) {
        const isValidMove = gameState.validMoves.some((m) => m.pieceId === pieceId);
        if (isValidMove) {
          setSelectedPieceId(pieceId);
          movePiece(pieceId);
          setSelectedPieceId(null);
        } else {
          setSelectedPieceId(pieceId === selectedPieceId ? null : pieceId);
        }
      }
    },
    [gameState, myColor, selectedPieceId, movePiece]
  );

  const handleRoll = useCallback(() => {
    rollDice();
  }, [rollDice]);

  const handleStartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleGameOverHome = useCallback(() => {
    setShowGameOver(false);
    leaveRoom();
    router.replace('/');
  }, [leaveRoom]);

  const handleGameOverPlayAgain = useCallback(() => {
    setShowGameOver(false);
    // Stay in room and wait for host to start again
  }, []);

  if (!roomCode) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>Mã phòng không hợp lệ</Text>
      </SafeAreaView>
    );
  }

  const isMyTurn = gameState?.currentPlayerColor === myColor;
  const hasRolled = !!(gameState?.dice && isMyTurn);
  const currentPlayer = gameState?.players.find(
    (p) => p.color === gameState?.currentPlayerColor
  );

  const timerBarColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#ef4444', '#eab308', '#22c55e'],
  });

  // Group players by position (top/bottom)
  const topColors: PlayerColor[] = ['green', 'yellow'];
  const bottomColors: PlayerColor[] = ['red', 'blue'];

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: `Phòng: ${roomCode}`,
          headerRight: () => (
            <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
              <Text style={styles.leaveBtnText}>Thoát</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Connecting overlay */}
      {isConnecting && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator color="#e94560" size="large" />
          <Text style={styles.connectingText}>Đang kết nối...</Text>
        </View>
      )}

      {/* Connection error */}
      {connectionError && !isConnecting && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Lỗi kết nối: {connectionError}</Text>
        </View>
      )}

      {/* Top player panels */}
      <View style={styles.playerPanelsRow}>
        {topColors.map((color) => {
          const player = gameState?.players.find((p) => p.color === color);
          return (
            <PlayerPanel
              key={color}
              player={player}
              color={color}
              isCurrentTurn={gameState?.currentPlayerColor === color}
              isMyPlayer={myColor === color}
            />
          );
        })}
      </View>

      {/* Game board */}
      <View style={styles.boardContainer}>
        {gameState && gameState.status !== 'waiting' ? (
          <GameBoard
            gameState={gameState}
            myColor={myColor}
            onPiecePress={handlePiecePress}
            selectedPieceId={selectedPieceId}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>Phòng: {roomCode}</Text>
            <Text style={styles.waitingSubtitle}>
              {gameState?.players.length ?? 0} người đã vào phòng
            </Text>
            {gameState?.players.map((p) => (
              <Text key={p.id} style={[styles.waitingPlayer, { color: COLOR_HEX[p.color] }]}>
                {p.username} ({COLOR_LABELS[p.color]})
                {p.isBot ? ' 🤖' : ''}
              </Text>
            ))}
            {isConnected && gameState && gameState.players.length >= 2 && (
              <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
                <Text style={styles.startButtonText}>Bắt Đầu Trận</Text>
              </TouchableOpacity>
            )}
            {!isConnected && (
              <ActivityIndicator color="#e94560" style={{ marginTop: 16 }} />
            )}
          </View>
        )}
      </View>

      {/* Bottom player panels */}
      <View style={styles.playerPanelsRow}>
        {bottomColors.map((color) => {
          const player = gameState?.players.find((p) => p.color === color);
          return (
            <PlayerPanel
              key={color}
              player={player}
              color={color}
              isCurrentTurn={gameState?.currentPlayerColor === color}
              isMyPlayer={myColor === color}
            />
          );
        })}
      </View>

      {/* Dice and turn controls */}
      {gameState?.status === 'playing' && (
        <View style={styles.controlsContainer}>
          {/* Turn info */}
          <View style={styles.turnInfo}>
            <Text style={styles.turnLabel}>Lượt của:</Text>
            <Text
              style={[
                styles.turnPlayerName,
                currentPlayer && { color: COLOR_HEX[currentPlayer.color] },
              ]}
            >
              {isMyTurn ? 'Bạn' : currentPlayer?.username ?? '...'}
            </Text>
            {gameState.hasExtraTurn && (
              <View style={styles.extraTurnBadge}>
                <Text style={styles.extraTurnText}>Lượt thêm!</Text>
              </View>
            )}
          </View>

          {/* Timer bar */}
          <View style={styles.timerBarContainer}>
            <Animated.View
              style={[
                styles.timerBar,
                { width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any },
                { backgroundColor: timerBarColor as any },
              ]}
            />
            <Text style={styles.timerText}>{turnTimeLeft}s</Text>
          </View>

          {/* Dice roller */}
          <DiceRoller
            dice={gameState.dice}
            isMyTurn={isMyTurn}
            isRolling={isRolling}
            hasRolled={!!gameState.dice && isMyTurn}
            onRoll={handleRoll}
          />

          {/* Valid moves hint */}
          {isMyTurn && gameState.dice && gameState.validMoves.length > 0 && (
            <Text style={styles.hintText}>
              Nhấn vào quân cờ để di chuyển ({gameState.validMoves.length} nước đi)
            </Text>
          )}
          {isMyTurn && gameState.dice && gameState.validMoves.length === 0 && (
            <Text style={[styles.hintText, { color: '#ef4444' }]}>
              Không có nước đi hợp lệ
            </Text>
          )}
        </View>
      )}

      {/* Game over modal */}
      <GameOverModal
        visible={showGameOver}
        gameState={gameState}
        myColor={myColor}
        onHome={handleGameOverHome}
        onPlayAgain={handleGameOverPlayAgain}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  connectingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 10,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  leaveBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  leaveBtnText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  playerPanelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 4,
    marginVertical: 4,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  waitingContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#16213e',
    borderRadius: 16,
    width: '100%',
  },
  waitingTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  waitingSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
  },
  waitingPlayer: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  startButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
    elevation: 4,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    backgroundColor: '#16213e',
    padding: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  turnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  turnLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  turnPlayerName: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: 'bold',
  },
  extraTurnBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  extraTurnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timerBarContainer: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBar: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  timerText: {
    position: 'absolute',
    right: 4,
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hintText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
