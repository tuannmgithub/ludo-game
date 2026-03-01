'use client';

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { DiceResult } from '@/types/game';

interface DiceRollerProps {
  dice: DiceResult | null;
  canRoll: boolean;
  isMyTurn: boolean;
  isRolling: boolean;
  onRoll: () => void;
  timeLeft?: number; // seconds remaining in turn
}

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function DiceFaceDisplay({ value, rolling }: { value: number; rolling: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!rolling) {
      setDisplayValue(value);
      return;
    }
    // Animate through random values
    let count = 0;
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 10) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [rolling, value]);

  return (
    <div
      className={clsx(
        'w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-gray-200',
        'flex items-center justify-center text-4xl select-none',
        'transition-transform duration-200',
        rolling && 'animate-dice-roll scale-110'
      )}
    >
      <span>{DICE_FACES[displayValue] || '?'}</span>
    </div>
  );
}

export default function DiceRoller({
  dice,
  canRoll,
  isMyTurn,
  isRolling,
  onRoll,
  timeLeft,
}: DiceRollerProps) {
  const showTimer = isMyTurn && timeLeft !== undefined && timeLeft > 0;
  const timerUrgent = timeLeft !== undefined && timeLeft <= 10;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Dice display */}
      <div className="flex items-center gap-3">
        <DiceFaceDisplay value={dice?.dice1 ?? 0} rolling={isRolling} />
        <span className="text-2xl font-bold text-gray-400">+</span>
        <DiceFaceDisplay value={dice?.dice2 ?? 0} rolling={isRolling} />

        {dice && (
          <div className="ml-2 flex flex-col items-center">
            <span className="text-2xl font-bold text-white">=</span>
            <span className="text-3xl font-black text-yellow-400">{dice.total}</span>
          </div>
        )}
      </div>

      {/* Dice info badges */}
      {dice && (
        <div className="flex gap-2">
          {dice.isDouble && (
            <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full animate-bounce">
              DOUBLE! Them luot!
            </span>
          )}
          {dice.isSpecial && (
            <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full animate-bounce">
              XUC XAC DAC BIET!
            </span>
          )}
        </div>
      )}

      {/* Timer */}
      {showTimer && (
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'text-sm font-semibold px-3 py-1 rounded-full',
              timerUrgent
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-700 text-slate-300'
            )}
          >
            {timeLeft}s
          </div>
          {/* Timer bar */}
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-1000',
                timerUrgent ? 'bg-red-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(100, (timeLeft / 30) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Roll button */}
      {isMyTurn && (
        <button
          onClick={onRoll}
          disabled={!canRoll || isRolling}
          className={clsx(
            'px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200',
            'shadow-lg active:scale-95',
            canRoll && !isRolling
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-300 hover:to-orange-400 hover:shadow-yellow-500/25 hover:shadow-xl cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          )}
        >
          {isRolling ? (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Dang tung...
            </span>
          ) : canRoll ? (
            'Tung Xuc Xac'
          ) : (
            'Chon quan co'
          )}
        </button>
      )}

      {!isMyTurn && (
        <div className="text-slate-400 text-sm italic animate-pulse">
          Dang cho luot cua ban...
        </div>
      )}
    </div>
  );
}
