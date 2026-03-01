'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { Player, PlayerColor } from '@/types/game';
import { COLOR_HEX } from '@/lib/board-coords';

interface GameOverModalProps {
  rankings: PlayerColor[];
  players: Player[];
  myColor: PlayerColor | null;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

const RANK_EMOJIS = ['1', '2', '3', '4'];
const RANK_LABELS = ['Nhat', 'Nhi', 'Ba', 'Tu'];

const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Do',
  blue: 'Xanh Duong',
  yellow: 'Vang',
  green: 'Xanh La',
};

// Simple confetti
function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#f97316', '#a855f7'][
      Math.floor(Math.random() * 6)
    ],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function GameOverModal({
  rankings,
  players,
  myColor,
  onPlayAgain,
  onGoHome,
}: GameOverModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  const myRank = myColor ? rankings.indexOf(myColor) : -1;
  const isWinner = myRank === 0;

  const getPlayer = (color: PlayerColor) =>
    players.find((p) => p.color === color);

  return (
    <>
      {isWinner && <Confetti />}

      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-4">
        <div
          className={clsx(
            'bg-slate-900 border-2 rounded-2xl p-8 max-w-md w-full text-center',
            'transition-all duration-500',
            show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8',
            isWinner ? 'border-yellow-400 shadow-2xl shadow-yellow-400/20' : 'border-slate-700'
          )}
        >
          {/* Header */}
          <div className="mb-6">
            {isWinner ? (
              <>
                <div className="text-6xl mb-2 animate-bounce">*</div>
                <h2 className="text-3xl font-black text-yellow-400">CHUC MUNG!</h2>
                <p className="text-slate-300 mt-1">Ban da vo dich!</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-2">*</div>
                <h2 className="text-2xl font-bold text-white">Ket Thuc Tran Dau</h2>
                {myRank > 0 && (
                  <p className="text-slate-300 mt-1">
                    Ban xep hang {RANK_LABELS[myRank]}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Rankings */}
          <div className="space-y-3 mb-8">
            {rankings.map((color, rank) => {
              const player = getPlayer(color);
              if (!player) return null;
              const isMyResult = color === myColor;

              return (
                <div
                  key={color}
                  className={clsx(
                    'flex items-center gap-4 p-3 rounded-xl transition-all',
                    rank === 0 && 'bg-yellow-500/10 border border-yellow-500/30',
                    isMyResult && 'ring-2 ring-offset-1 ring-offset-slate-900',
                    isMyResult && `ring-[${COLOR_HEX[color]}]`
                  )}
                  style={{
                    border: isMyResult ? `2px solid ${COLOR_HEX[color]}` : undefined,
                    backgroundColor:
                      rank === 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                  }}
                >
                  {/* Rank number */}
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      rank === 0 && 'bg-yellow-400 text-black',
                      rank === 1 && 'bg-slate-400 text-black',
                      rank === 2 && 'bg-amber-700 text-white',
                      rank >= 3 && 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {rank + 1}
                  </div>

                  {/* Color indicator */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLOR_HEX[color] }}
                  />

                  {/* Username */}
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-white">{player.username}</span>
                    {isMyResult && (
                      <span className="ml-2 text-xs text-slate-400">(ban)</span>
                    )}
                    {player.isBot && (
                      <span className="ml-2 text-xs text-purple-400">[BOT]</span>
                    )}
                  </div>

                  {/* Medal */}
                  <div className="text-lg">
                    {rank === 0 ? '*' : rank === 1 ? '*' : rank === 2 ? '*' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onGoHome}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              Trang Chu
            </button>
            <button
              onClick={onPlayAgain}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95"
            >
              Choi Lai
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
