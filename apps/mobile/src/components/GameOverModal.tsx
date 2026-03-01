import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { GameState, PlayerColor, COLOR_HEX } from '../types/game';

interface Props {
  visible: boolean;
  gameState: GameState | null;
  myColor: PlayerColor | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

const COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Đỏ',
  blue: 'Xanh',
  yellow: 'Vàng',
  green: 'Lục',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];
const RANK_LABELS = ['Nhất', 'Nhì', 'Ba', 'Tư'];

export function GameOverModal({ visible, gameState, myColor, onPlayAgain, onHome }: Props) {
  if (!gameState) return null;

  const rankings = gameState.rankings;
  const myRank = myColor ? rankings.indexOf(myColor) + 1 : null;
  const didWin = myRank === 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Title */}
          <Text style={styles.title}>
            {didWin ? 'Chúc Mừng!' : 'Trò Chơi Kết Thúc'}
          </Text>

          {myRank && (
            <Text style={styles.myResult}>
              Bạn xếp hạng:{' '}
              <Text style={[styles.myRankText, didWin && { color: '#fbbf24' }]}>
                {RANK_MEDALS[myRank - 1]} {RANK_LABELS[myRank - 1]}
              </Text>
            </Text>
          )}

          {/* Rankings list */}
          <View style={styles.rankingsContainer}>
            <Text style={styles.rankingsTitle}>Bảng Xếp Hạng</Text>
            {rankings.map((color, idx) => {
              const player = gameState.players.find((p) => p.color === color);
              const isMe = color === myColor;
              return (
                <View
                  key={color}
                  style={[
                    styles.rankRow,
                    { borderColor: COLOR_HEX[color] },
                    isMe && styles.myRankRow,
                  ]}
                >
                  <Text style={styles.rankMedal}>{RANK_MEDALS[idx]}</Text>
                  <View style={[styles.colorIndicator, { backgroundColor: COLOR_HEX[color] }]} />
                  <Text style={styles.rankUsername}>
                    {player?.username ?? COLOR_LABELS[color]}
                    {isMe ? ' (Tôi)' : ''}
                    {player?.isBot ? ' 🤖' : ''}
                  </Text>
                  <Text style={styles.rankLabel}>{RANK_LABELS[idx]}</Text>
                </View>
              );
            })}

            {/* Players still playing (not ranked yet) */}
            {gameState.players
              .filter((p) => !rankings.includes(p.color))
              .map((player) => (
                <View
                  key={player.color}
                  style={[styles.rankRow, { borderColor: COLOR_HEX[player.color] }]}
                >
                  <Text style={styles.rankMedal}>—</Text>
                  <View
                    style={[styles.colorIndicator, { backgroundColor: COLOR_HEX[player.color] }]}
                  />
                  <Text style={styles.rankUsername}>
                    {player.username}
                    {player.isBot ? ' 🤖' : ''}
                  </Text>
                  <Text style={styles.rankLabel}>—</Text>
                </View>
              ))}
          </View>

          {/* Stats */}
          <Text style={styles.statsText}>Tổng số lượt: {gameState.turnCount}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.homeButton} onPress={onHome}>
              <Text style={styles.homeButtonText}>Trang Chủ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playAgainButton} onPress={onPlayAgain}>
              <Text style={styles.playAgainButtonText}>Chơi Lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#e94560',
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  myResult: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  myRankText: {
    fontWeight: 'bold',
    color: '#e5e7eb',
    fontSize: 18,
  },
  rankingsContainer: {
    marginBottom: 16,
  },
  rankingsTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 6,
  },
  myRankRow: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
  },
  rankMedal: {
    fontSize: 20,
    marginRight: 8,
    width: 28,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rankUsername: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  rankLabel: {
    color: '#9ca3af',
    fontSize: 13,
  },
  statsText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: 15,
  },
  playAgainButton: {
    flex: 1,
    backgroundColor: '#e94560',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  playAgainButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
