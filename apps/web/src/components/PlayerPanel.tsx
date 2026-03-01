'use client';

import React from 'react';
import clsx from 'clsx';
import type { Player, PlayerColor } from '@/types/game';
import { COLOR_HEX, COLOR_LIGHT } from '@/lib/board-coords';
import { GOAL_POSITION } from '@/types/game';

interface PlayerPanelProps {
  player: Player;
  isCurrentTurn: boolean;
  isMe: boolean;
  rank?: number;
}

const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Do',
  blue: 'Xanh Duong',
  yellow: 'Vang',
  green: 'Xanh La',
};

const RANK_LABELS = ['', '1st', '2nd', '3rd', '4th'];

function MiniPiece({
  color,
  atGoal,
  inHome,
}: {
  color: PlayerColor;
  atGoal: boolean;
  inHome: boolean;
}) {
  return (
    <div
      className={clsx(
        'w-5 h-5 rounded-full border-2 border-white shadow-sm transition-all duration-300',
        atGoal && 'ring-2 ring-yellow-400 scale-110',
        inHome && 'opacity-50'
      )}
      style={{ backgroundColor: COLOR_HEX[color] }}
    />
  );
}

export default function PlayerPanel({
  player,
  isCurrentTurn,
  isMe,
  rank,
}: PlayerPanelProps) {
  const atGoalCount = player.pieces.filter((p) => p.position === GOAL_POSITION).length;
  const onBoardCount = player.pieces.filter(
    (p) => p.position >= 0 && p.position < GOAL_POSITION
  ).length;
  const inStableCount = player.pieces.filter((p) => p.position === -1).length;

  const borderColor = COLOR_HEX[player.color];
  const bgColor = COLOR_LIGHT[player.color];

  return (
    <div
      className={clsx(
        'relative rounded-xl p-3 border-2 transition-all duration-300 min-w-[140px]',
        isCurrentTurn && 'shadow-lg scale-105',
        !player.connected && 'opacity-60'
      )}
      style={{
        borderColor: isCurrentTurn ? borderColor : '#334155',
        backgroundColor: isCurrentTurn ? bgColor + '33' : '#1e293b',
        boxShadow: isCurrentTurn ? `0 0 20px ${borderColor}44` : undefined,
      }}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs animate-bounce"
          style={{ backgroundColor: borderColor }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <polygon points="2,1 9,5 2,9" />
          </svg>
        </div>
      )}

      {/* Rank badge */}
      {rank && (
        <div
          className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : '#b45309' }}
        >
          {rank}
        </div>
      )}

      {/* Player name + status */}
      <div className="flex items-center gap-2 mb-2">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: borderColor }}
        />
        <span
          className={clsx(
            'text-sm font-semibold truncate max-w-[90px]',
            isMe ? 'text-white' : 'text-slate-300'
          )}
        >
          {player.username}
          {isMe && <span className="text-xs ml-1 text-slate-400">(ban)</span>}
        </span>
      </div>

      {/* Bot / Disconnected indicator */}
      <div className="flex gap-1 mb-2">
        {player.isBot && (
          <span className="text-xs px-1.5 py-0.5 bg-purple-900 text-purple-300 rounded font-medium">
            BOT
          </span>
        )}
        {!player.connected && !player.isBot && (
          <span className="text-xs px-1.5 py-0.5 bg-red-900 text-red-300 rounded font-medium">
            Mat ket noi
          </span>
        )}
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{
            backgroundColor: borderColor + '33',
            color: borderColor,
          }}
        >
          {COLOR_NAMES[player.color]}
        </span>
      </div>

      {/* Pieces display */}
      <div className="flex gap-1 flex-wrap">
        {player.pieces.map((piece) => (
          <MiniPiece
            key={piece.id}
            color={player.color}
            atGoal={piece.position === GOAL_POSITION}
            inHome={piece.position === -1}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{atGoalCount}/4 ve dich</span>
          <span>{onBoardCount} tren ban</span>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(atGoalCount / 4) * 100}%`,
              backgroundColor: borderColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
