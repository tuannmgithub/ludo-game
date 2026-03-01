import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DiceResult } from '../types/game';

interface Props {
  dice: DiceResult | null;
  isMyTurn: boolean;
  isRolling: boolean;
  hasRolled: boolean;
  onRoll: () => void;
}

function DieFace({ value, color = '#1a1a2e' }: { value: number; color?: string }) {
  const dotPositions: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [
      [25, 25],
      [75, 75],
    ],
    3: [
      [25, 25],
      [50, 50],
      [75, 75],
    ],
    4: [
      [25, 25],
      [75, 25],
      [25, 75],
      [75, 75],
    ],
    5: [
      [25, 25],
      [75, 25],
      [50, 50],
      [25, 75],
      [75, 75],
    ],
    6: [
      [25, 25],
      [75, 25],
      [25, 50],
      [75, 50],
      [25, 75],
      [75, 75],
    ],
  };

  const dots = dotPositions[value] || dotPositions[1];

  return (
    <View style={[styles.die, { borderColor: color }]}>
      <View style={styles.dieInner}>
        {dots.map(([left, top], idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor: color,
                left: `${left - 6}%` as any,
                top: `${top - 6}%` as any,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function DiceRoller({ dice, isMyTurn, isRolling, hasRolled, onRoll }: Props) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRolling) {
      // Shake + spin animation while rolling
      Animated.loop(
        Animated.sequence([
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(spinAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 4 }
      ).start();

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRolling]);

  const handlePress = async () => {
    if (!isMyTurn || isRolling || hasRolled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics may not be available
    }
    onRoll();
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg'],
  });

  const canRoll = isMyTurn && !isRolling && !hasRolled;

  return (
    <View style={styles.container}>
      {/* Dice display */}
      <View style={styles.diceRow}>
        {dice ? (
          <>
            <Animated.View
              style={{
                transform: [{ rotate: isRolling ? spinInterpolate : '0deg' }, { scale: scaleAnim }],
              }}
            >
              <DieFace value={dice.dice1} color={isMyTurn ? '#e94560' : '#6b7280'} />
            </Animated.View>

            <View style={styles.diceSpacing} />

            <Animated.View
              style={{
                transform: [{ rotate: isRolling ? spinInterpolate : '0deg' }, { scale: scaleAnim }],
              }}
            >
              <DieFace value={dice.dice2} color={isMyTurn ? '#e94560' : '#6b7280'} />
            </Animated.View>

            <View style={styles.diceInfo}>
              <Text style={styles.diceTotal}>{dice.total}</Text>
              {dice.isDouble && <Text style={styles.specialTag}>Đôi!</Text>}
              {dice.isSpecial && <Text style={[styles.specialTag, { color: '#fbbf24' }]}>Đặc biệt!</Text>}
            </View>
          </>
        ) : (
          <View style={styles.emptyDice}>
            <View style={styles.emptyDieBox} />
            <View style={styles.diceSpacing} />
            <View style={styles.emptyDieBox} />
          </View>
        )}
      </View>

      {/* Roll button */}
      <TouchableOpacity
        style={[styles.rollButton, !canRoll && styles.rollButtonDisabled]}
        onPress={handlePress}
        disabled={!canRoll}
        activeOpacity={0.8}
      >
        {isRolling ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.rollButtonText}>
            {!isMyTurn ? 'Chờ lượt...' : hasRolled ? 'Đã tung' : 'Tung Xúc Xắc'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 70,
  },
  die: {
    width: 60,
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  dieInner: {
    flex: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  diceSpacing: {
    width: 16,
  },
  diceInfo: {
    marginLeft: 16,
    alignItems: 'center',
  },
  diceTotal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
  },
  specialTag: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 'bold',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  emptyDice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyDieBox: {
    width: 60,
    height: 60,
    backgroundColor: '#374151',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  rollButton: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    minWidth: 180,
    alignItems: 'center',
  },
  rollButtonDisabled: {
    backgroundColor: '#4b5563',
    shadowOpacity: 0,
    elevation: 0,
  },
  rollButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
