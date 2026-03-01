// ============================================================
// DICE — Cờ Cá Ngựa game-core
// ============================================================

import { DiceResult } from '@co-ca-ngua/shared-types';
import { DIE_MIN, DIE_MAX } from './constants';

/**
 * Roll a single six-sided die.
 * Returns an integer in [DIE_MIN, DIE_MAX].
 */
function rollSingleDie(): number {
  return Math.floor(Math.random() * (DIE_MAX - DIE_MIN + 1)) + DIE_MIN;
}

/**
 * Roll two six-sided dice and derive all computed fields.
 *
 * isDouble  = dice1 === dice2
 * isSpecial = isDouble OR (one die is 1 and the other is 6)
 *             → grants deploy ability + extra turn
 */
export function rollDice(): DiceResult {
  const dice1 = rollSingleDie();
  const dice2 = rollSingleDie();
  return buildDiceResult(dice1, dice2);
}

/**
 * Construct a DiceResult from two known die values.
 * Useful for deterministic testing or server-authoritative rolls.
 */
export function buildDiceResult(dice1: number, dice2: number): DiceResult {
  if (dice1 < DIE_MIN || dice1 > DIE_MAX || dice2 < DIE_MIN || dice2 > DIE_MAX) {
    throw new RangeError(
      `Die values must be in [${DIE_MIN}, ${DIE_MAX}], got dice1=${dice1}, dice2=${dice2}`,
    );
  }

  const total = dice1 + dice2;
  const isDouble = dice1 === dice2;
  const is16 = (dice1 === 1 && dice2 === 6) || (dice1 === 6 && dice2 === 1);
  const isSpecial = isDouble || is16;

  return { dice1, dice2, total, isDouble, isSpecial };
}

/**
 * Guard: check whether a pre-built DiceResult qualifies as special.
 * Redundant if you always use buildDiceResult/rollDice, but useful
 * when deserialising state from a network payload.
 */
export function isSpecialRoll(d: DiceResult): boolean {
  const isDouble = d.dice1 === d.dice2;
  const is16 = (d.dice1 === 1 && d.dice2 === 6) || (d.dice1 === 6 && d.dice2 === 1);
  return isDouble || is16;
}
