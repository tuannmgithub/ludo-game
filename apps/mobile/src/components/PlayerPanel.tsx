import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player, PlayerColor, COLOR_HEX, Piece, GOAL_POSITION } from '../types/game';

interface Props {
  player: Player | undefined;
  color: PlayerColor;
  isCurrentTurn: boolean;
  isMyPlayer: boolean;
  compact?: boolean;
}

function PieceIndicator({
  piece,
  color,
}: {
  piece: Piece;
  color: PlayerColor;
}) {
  const isHome = piece.position === GOAL_POSITION;
  const isStable = piece.position === -1;
  const isOnTrack = piece.position >= 0 && piece.position < 52;
  const isHomeStretch = piece.position >= 52 && piece.position < GOAL_POSITION;

  let bgColor = '#374151'; // Default stable
  let borderColor = COLOR_HEX[color];

  if (isHome) {
    bgColor = COLOR_HEX[color];
    borderColor = '#fbbf24';
  } else if (isHomeStretch) {
    bgColor = COLOR_HEX[color];
    borderColor = COLOR_HEX[color];
  } else if (isOnTrack) {
    bgColor = '#ffffff';
    borderColor = COLOR_HEX[color];
  }

  return (
    <View
      style={[
        styles.pieceIndicator,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    >
      {isHome && (
        <Text style={styles.pieceHomeText}>✓</Text>
      )}
      {!isHome && isOnTrack && (
        <Text style={[styles.piecePositionText, { color: COLOR_HEX[color] }]}>
          {piece.position}
        </Text>
      )}
    </View>
  );
}

const COLOR_LABELS: Record<PlayerColor, string> = {
  red: 'Đỏ',
  blue: 'Xanh',
  yellow: 'Vàng',
  green: 'Lục',
};

export function PlayerPanel({ player, color, isCurrentTurn, isMyPlayer, compact = false }: Props) {
  const piecesFinished = player?.pieces.filter((p) => p.position === GOAL_POSITION).length ?? 0;
  const label = COLOR_LABELS[color];

  return (
    <View
      style={[
        styles.container,
        { borderColor: COLOR_HEX[color] },
        isCurrentTurn && styles.activeTurn,
        isMyPlayer && styles.myPlayer,
      ]}
    >
      {/* Player info row */}
      <View style={styles.headerRow}>
        <View style={[styles.colorDot, { backgroundColor: COLOR_HEX[color] }]} />
        <View style={styles.nameContainer}>
          <Text style={styles.colorLabel}>{label}</Text>
          {player ? (
            <Text style={styles.username} numberOfLines={1}>
              {player.username}
              {player.isBot ? ' 🤖' : ''}
              {isMyPlayer ? ' (Tôi)' : ''}
            </Text>
          ) : (
            <Text style={styles.emptySlot}>Chờ...</Text>
          )}
        </View>
        {isCurrentTurn && (
          <View style={styles.turnIndicator}>
            <Text style={styles.turnText}>▶</Text>
          </View>
        )}
        {player?.rank !== undefined && (
          <View style={[styles.rankBadge, { backgroundColor: COLOR_HEX[color] }]}>
            <Text style={styles.rankText}>#{player.rank}</Text>
          </View>
        )}
      </View>

      {/* Pieces row */}
      {!compact && player && (
        <View style={styles.piecesRow}>
          {player.pieces.map((piece) => (
            <PieceIndicator key={piece.id} piece={piece} color={color} />
          ))}
          <Text style={styles.finishedCount}>{piecesFinished}/4</Text>
        </View>
      )}

      {/* Connection status */}
      {player && !player.connected && (
        <Text style={styles.disconnectedText}>Mất kết nối</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 2,
    padding: 8,
    flex: 1,
    margin: 2,
  },
  activeTurn: {
    borderWidth: 3,
    backgroundColor: '#1e2d5a',
    elevation: 4,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  myPlayer: {
    borderStyle: 'dashed',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  nameContainer: {
    flex: 1,
  },
  colorLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  username: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  emptySlot: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  turnIndicator: {
    marginLeft: 4,
  },
  turnText: {
    color: '#e94560',
    fontSize: 14,
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  rankText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  piecesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  pieceIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceHomeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  piecePositionText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  finishedCount: {
    color: '#9ca3af',
    fontSize: 11,
    marginLeft: 4,
  },
  disconnectedText: {
    color: '#ef4444',
    fontSize: 10,
    marginTop: 2,
  },
});
