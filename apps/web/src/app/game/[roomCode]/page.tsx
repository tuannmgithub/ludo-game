'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import GameBoard from '@/components/GameBoard';
import DiceRoller from '@/components/DiceRoller';
import PlayerPanel from '@/components/PlayerPanel';
import GameOverModal from '@/components/GameOverModal';
import { COLOR_HEX } from '@/lib/board-coords';
import { storage } from '@/lib/api';
import type { PlayerColor } from '@/types/game';

const COLOR_NAMES: Record<PlayerColor, string> = {
  red: 'Do',
  blue: 'Xanh Duong',
  yellow: 'Vang',
  green: 'Xanh La',
};

// Turn timer hook
function useTurnTimer(turnStartedAt: number | null, isMyTurn: boolean) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!isMyTurn || !turnStartedAt) {
      setTimeLeft(30);
      return;
    }
    const update = () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [turnStartedAt, isMyTurn]);

  return timeLeft;
}

// Notification toast
function Notification({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-slate-800 border border-slate-600 text-white px-5 py-3 rounded-full text-sm font-medium shadow-xl">
        {message}
      </div>
    </div>
  );
}

// Waiting room component
function WaitingRoom({
  roomCode,
  players,
  isHost,
  onStart,
  onLeave,
  isLoading,
}: {
  roomCode: string;
  players: any[];
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
  isLoading: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-2">Phong Cho</h1>
          <p className="text-slate-400 text-sm">Dang cho nguoi choi tham gia...</p>
        </div>

        {/* Room code display */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">
          <p className="text-slate-400 text-sm mb-2">Ma Phong</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono font-black text-yellow-400 tracking-widest">
              {roomCode}
            </span>
            <button
              onClick={copyCode}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
              title="Sao chep"
            >
              {copied ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-green-400">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Chia se ma nay cho ban be</p>
        </div>

        {/* Players list */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Nguoi choi ({players.length})
          </h3>
          <div className="space-y-2">
            {players.map((player, i) => (
              <div
                key={player.id || i}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLOR_HEX[player.color as PlayerColor] || '#888' }}
                />
                <span className="text-white font-medium">{player.username}</span>
                {player.isBot && (
                  <span className="ml-auto text-xs text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded">
                    BOT
                  </span>
                )}
                {i === 0 && (
                  <span className="ml-auto text-xs text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded">
                    Chu phong
                  </span>
                )}
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-slate-700 opacity-50"
              >
                <div className="w-4 h-4 rounded-full bg-slate-600" />
                <span className="text-slate-500 text-sm">Dang cho...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onLeave}
            className="py-3 px-5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
          >
            Thoat
          </button>
          {isHost && (
            <button
              onClick={onStart}
              disabled={isLoading || players.length < 2}
              className={clsx(
                'flex-1 py-3 rounded-xl font-bold transition-all active:scale-95',
                players.length >= 2 && !isLoading
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg hover:shadow-green-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              {isLoading ? 'Dang bat dau...' : players.length < 2 ? 'Can them nguoi choi' : 'Bat Dau Game'}
            </button>
          )}
          {!isHost && (
            <div className="flex-1 py-3 text-center text-slate-500 text-sm italic">
              Dang cho chu phong bat dau...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const {
    gameState,
    myColor,
    isConnected,
    connectionError,
    isRolling,
    lastCapturedPieceId,
    captureEvent,
    exitEvent,
    notification,
    setIsRolling,
    username,
  } = useGameStore();

  const [showGameOver, setShowGameOver] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);

  const { rollDice, movePiece, startGame, leaveRoom } = useSocket(roomCode);

  const isMyTurn = gameState?.currentPlayerColor === myColor && gameState?.status === 'playing';
  const canRollDice = useGameStore((s) => s.canRollDice());
  const timeLeft = useTurnTimer(
    isMyTurn && gameState ? gameState.turnStartedAt : null,
    isMyTurn
  );

  // Show game over modal when game finishes
  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'finished' && prevStatusRef.current !== 'finished') {
      setShowGameOver(true);
    }
    prevStatusRef.current = gameState.status;
  }, [gameState?.status]);

  // Auto-start bot rooms: if I'm the host and the room has bots, start immediately
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!gameState || !isConnected || !myColor) return;
    if (gameState.status !== 'waiting') return;
    const isHost = gameState.players[0]?.color === myColor;
    const hasBots = gameState.players.some((p) => p.isBot);
    if (isHost && hasBots) {
      autoStartedRef.current = true;
      startGame();
    }
  }, [gameState?.status, gameState?.players, isConnected, myColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRollDice = useCallback(() => {
    if (!canRollDice) return;
    setIsRolling(true);
    rollDice();
    setTimeout(() => setIsRolling(false), 800);
  }, [canRollDice, rollDice, setIsRolling]);

  const handleMovePiece = useCallback(
    (pieceId: number) => {
      movePiece(pieceId);
    },
    [movePiece]
  );

  const handleLeave = useCallback(() => {
    leaveRoom();
    router.push('/');
  }, [leaveRoom, router]);

  const handlePlayAgain = useCallback(() => {
    setShowGameOver(false);
    leaveRoom();
    router.push('/');
  }, [leaveRoom, router]);

  // Connection error screen
  if (connectionError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Loi Ket Noi</h2>
          <p className="text-slate-400 mb-6 text-sm">{connectionError}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
          >
            Quay Ve Trang Chu
          </button>
        </div>
      </div>
    );
  }

  // Loading / connecting
  if (!isConnected || !gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400 font-medium">Dang ket noi den phong...</p>
          <p className="text-slate-600 text-sm mt-1">{roomCode}</p>
        </div>
      </div>
    );
  }

  // Waiting room
  if (gameState.status === 'waiting') {
    const myPlayer = gameState.players.find((p) => p.color === myColor);
    const isHost = gameState.players.length > 0 && gameState.players[0].color === myColor;

    return (
      <>
        <Notification message={notification} />
        <WaitingRoom
          roomCode={roomCode}
          players={gameState.players}
          isHost={isHost}
          onStart={startGame}
          onLeave={handleLeave}
          isLoading={false}
        />
      </>
    );
  }

  // Active game
  const currentPlayer = gameState.players.find(
    (p) => p.color === gameState.currentPlayerColor
  );

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: "url('/assets/mainBoard/bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Notification message={notification} />

      {/* Top bar */}
      <div className="bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <button
          onClick={handleLeave}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Thoat
        </button>

        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-400' : 'bg-red-400'
            )}
          />
          <span className="text-slate-400 text-xs font-mono">{roomCode}</span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-500 text-xs">Luot: {gameState.turnCount}</span>
        </div>

        {/* My color badge */}
        {myColor && (
          <div
            className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: COLOR_HEX[myColor] }}
          >
            {COLOR_NAMES[myColor]}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left: Player panels */}
        <div className="lg:w-48 flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap lg:overflow-y-auto">
          {gameState.players.map((player) => (
            <PlayerPanel
              key={player.id}
              player={player}
              isCurrentTurn={player.color === gameState.currentPlayerColor}
              isMe={player.color === myColor}
              rank={
                gameState.rankings.includes(player.color)
                  ? gameState.rankings.indexOf(player.color) + 1
                  : undefined
              }
            />
          ))}
        </div>

        {/* Center: Game board — fills available space, aspect ratio preserved by SVG viewBox */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GameBoard
              gameState={gameState}
              myColor={myColor}
              onPieceClick={handleMovePiece}
              lastCapturedPieceId={lastCapturedPieceId}
              captureEvent={captureEvent}
              exitEvent={exitEvent}
            />
          </div>
        </div>

        {/* Right: Controls */}
        <div className="lg:w-56 flex flex-col gap-4">
          {/* Turn info */}
          <div
            className={clsx(
              'rounded-xl p-3 border text-center transition-all',
              isMyTurn
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-slate-700 bg-slate-900'
            )}
          >
            {isMyTurn ? (
              <>
                <p className="text-yellow-400 font-bold text-sm">LUOT CUA BAN!</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {gameState.dice
                    ? `Chon quan co de di (${gameState.validMoves.length} nuoc)`
                    : 'Tung xuc xac de bat dau'}
                </p>
              </>
            ) : (
              <>
                {currentPlayer && (
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: COLOR_HEX[currentPlayer.color] }}
                  />
                )}
                <p className="text-slate-300 font-medium text-sm">
                  {currentPlayer?.username || '...'}
                </p>
                <p className="text-slate-500 text-xs">Dang choi...</p>
              </>
            )}
          </div>

          {/* Dice roller */}
          <DiceRoller
            dice={gameState.dice}
            canRoll={canRollDice}
            isMyTurn={isMyTurn}
            isRolling={isRolling}
            onRoll={handleRollDice}
            timeLeft={isMyTurn ? timeLeft : undefined}
          />

          {/* Valid moves hint */}
          {isMyTurn && gameState.validMoves.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nuoc Di Hop Le ({gameState.validMoves.length})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {gameState.validMoves.map((move) => (
                  <button
                    key={`${move.pieceId}-${move.toPosition}`}
                    onClick={() => handleMovePiece(move.pieceId)}
                    className={clsx(
                      'w-full text-left p-2 rounded-lg text-xs transition-all',
                      'bg-slate-700 hover:bg-slate-600 text-slate-300',
                      'hover:text-white active:scale-95',
                      move.isMandatory && 'border border-yellow-500/50'
                    )}
                  >
                    <span className="font-medium">Quan #{move.pieceId}</span>
                    <span className="text-slate-500 ml-1">
                      {move.fromPosition === -1 ? 'Xuat quan' : `${move.fromPosition} → ${move.toPosition}`}
                    </span>
                    {move.isCapture && (
                      <span className="ml-1 text-red-400 font-bold">[an quan!]</span>
                    )}
                    {move.isThuaMa && (
                      <span className="ml-1 text-purple-400 font-bold">[thua ma!]</span>
                    )}
                    {move.isMandatory && (
                      <span className="ml-1 text-yellow-400 font-bold">[bat buoc]</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rankings (if any players finished) */}
          {gameState.rankings.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Xep Hang
              </p>
              <div className="space-y-1">
                {gameState.rankings.map((color, rank) => {
                  const player = gameState.players.find((p) => p.color === color);
                  return (
                    <div key={color} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-4">{rank + 1}.</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLOR_HEX[color] }}
                      />
                      <span className="text-white truncate">{player?.username}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game over modal */}
      {showGameOver && gameState.status === 'finished' && (
        <GameOverModal
          rankings={gameState.rankings}
          players={gameState.players}
          myColor={myColor}
          onPlayAgain={handlePlayAgain}
          onGoHome={() => router.push('/')}
        />
      )}
    </div>
  );
}
