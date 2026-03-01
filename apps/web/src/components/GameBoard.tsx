'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  TRACK_COORDS,
  HOME_COORDS,
  STABLE_COORDS,
  STABLE_BOUNDS,
  CELL_SIZE,
  BOARD_SIZE_PX,
  COLOR_HEX,
  COLOR_LIGHT,
  SAFE_ZONE_SET,
} from '@/lib/board-coords';
import type { GameState, PlayerColor, Piece, ValidMove } from '@/types/game';
import { GOAL_POSITION } from '@/types/game';
import type { CaptureEvent, ExitEvent } from '@/store/gameStore';

interface GameBoardProps {
  gameState: GameState;
  myColor: PlayerColor | null;
  onPieceClick: (pieceId: number) => void;
  lastCapturedPieceId: number | null;
  captureEvent?: CaptureEvent | null;
  exitEvent?: ExitEvent | null;
}

const COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

// Map position to pixel [x, y]
function posToCoord(pos: number, color: PlayerColor): [number, number] {
  if (pos === -1) return [0, 0]; // in stable, handled separately
  if (pos >= 52 && pos <= 57) {
    const idx = pos - 52;
    return HOME_COORDS[color][idx];
  }
  if (pos >= 0 && pos <= 51) {
    return TRACK_COORDS[pos];
  }
  return [0, 0];
}

// StarIcon for safe zones
function StarShape({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.45;
    return `${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`;
  }).join(' ');
  return <polygon points={points} fill="gold" opacity={0.8} />;
}

// Dice face dots
function DiceFace({ value, x, y, size = 28 }: { value: number; x: number; y: number; size?: number }) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
  };
  const dots = dotPositions[value] || [];
  const r = size / 2;
  return (
    <g>
      <rect x={x - r} y={y - r} width={size} height={size} rx={4} fill="white" stroke="#ddd" strokeWidth={1} />
      {dots.map(([dx, dy], i) => (
        <circle
          key={i}
          cx={x - r + dx * size}
          cy={y - r + dy * size}
          r={2.5}
          fill="#1e293b"
        />
      ))}
    </g>
  );
}

export default function GameBoard({
  gameState,
  myColor,
  onPieceClick,
  lastCapturedPieceId,
  captureEvent,
  exitEvent,
}: GameBoardProps) {
  const validMoveSet = useMemo(() => {
    const s = new Set<number>();
    gameState.validMoves.forEach((m) => s.add(m.pieceId));
    return s;
  }, [gameState.validMoves]);

  const isMyTurn = gameState.currentPlayerColor === myColor && gameState.status === 'playing';

  // Group pieces at same position for stacking
  const piecesByPosition = useMemo(() => {
    const map = new Map<string, Piece[]>();
    gameState.players.forEach((player) => {
      player.pieces.forEach((piece) => {
        const key = `${piece.color}-${piece.position}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(piece);
      });
    });
    return map;
  }, [gameState.players]);

  // All pieces flat
  const allPieces = useMemo(() => {
    return gameState.players.flatMap((p) => p.pieces);
  }, [gameState.players]);

  return (
    <div
      className="relative inline-block"
      style={{ perspective: '900px', perspectiveOrigin: '50% 30%' }}
    >
      {/* 3D tilted board container */}
      <div
        style={{
          transform: 'rotateX(32deg)',
          transformStyle: 'preserve-3d',
          display: 'inline-block',
        }}
      >
      <svg
        width={BOARD_SIZE_PX}
        height={BOARD_SIZE_PX}
        viewBox={`0 0 ${BOARD_SIZE_PX} ${BOARD_SIZE_PX}`}
        className="rounded-lg shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      >
        {/* Background */}
        <rect width={BOARD_SIZE_PX} height={BOARD_SIZE_PX} fill="#e2e8f0" />

        {/* Cross-arm background (slightly lighter) */}
        {/* Left arm */}
        <rect x={0} y={6 * CELL_SIZE} width={6 * CELL_SIZE} height={3 * CELL_SIZE} fill="#f1f5f9" />
        {/* Right arm */}
        <rect x={9 * CELL_SIZE} y={6 * CELL_SIZE} width={6 * CELL_SIZE} height={3 * CELL_SIZE} fill="#f1f5f9" />
        {/* Top arm */}
        <rect x={6 * CELL_SIZE} y={0} width={3 * CELL_SIZE} height={6 * CELL_SIZE} fill="#f1f5f9" />
        {/* Bottom arm */}
        <rect x={6 * CELL_SIZE} y={9 * CELL_SIZE} width={3 * CELL_SIZE} height={6 * CELL_SIZE} fill="#f1f5f9" />
        {/* Center */}
        <rect x={6 * CELL_SIZE} y={6 * CELL_SIZE} width={3 * CELL_SIZE} height={3 * CELL_SIZE} fill="#f1f5f9" />

        {/* === STABLE AREAS === */}
        {COLORS.map((color) => {
          const [bx, by, bw, bh] = STABLE_BOUNDS[color];
          return (
            <g key={`stable-${color}`}>
              {/* 3D depth shadow offset */}
              <rect
                x={bx + 5}
                y={by + 5}
                width={bw}
                height={bh}
                fill={COLOR_HEX[color]}
                opacity={0.2}
                rx={6}
              />
              {/* Outer stable border */}
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                fill={COLOR_LIGHT[color]}
                stroke={COLOR_HEX[color]}
                strokeWidth={3}
                rx={4}
              />
              {/* Inner stable circle area */}
              <rect
                x={bx + CELL_SIZE * 0.7}
                y={by + CELL_SIZE * 0.7}
                width={bw - CELL_SIZE * 1.4}
                height={bh - CELL_SIZE * 1.4}
                rx={8}
                fill="white"
                fillOpacity={0.6}
                stroke={COLOR_HEX[color]}
                strokeWidth={2}
              />
              {/* Color label */}
              <text
                x={bx + bw / 2}
                y={by + bh / 2 + 24}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={COLOR_HEX[color]}
                opacity={0.7}
              >
                {color.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* === TRACK SQUARES (cross pattern) === */}
        {/* Draw all 52 track squares */}
        {TRACK_COORDS.map(([tx, ty], pos) => {
          const isSafe = SAFE_ZONE_SET.has(pos);
          const isStart = pos === 0 || pos === 13 || pos === 26 || pos === 39;
          let startColor: string | null = null;
          if (pos === 0) startColor = COLOR_LIGHT.red;
          else if (pos === 13) startColor = COLOR_LIGHT.blue;
          else if (pos === 26) startColor = COLOR_LIGHT.yellow;
          else if (pos === 39) startColor = COLOR_LIGHT.green;

          const half = CELL_SIZE / 2;
          return (
            <g key={`track-${pos}`}>
              <rect
                x={tx - half}
                y={ty - half}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={isStart && startColor ? startColor : isSafe ? '#fef9c3' : 'white'}
                stroke={isStart ? (startColor ? '#888' : '#cbd5e1') : '#cbd5e1'}
                strokeWidth={isStart ? 2 : 1}
                className="track-square"
              />
              {isSafe && !isStart && (
                <StarShape x={tx} y={ty} size={9} />
              )}
              {isStart && startColor && (
                <StarShape x={tx} y={ty} size={9} />
              )}
              {/* Position number for debugging - very faint */}
              {/* <text x={tx} y={ty+4} textAnchor="middle" fontSize={8} fill="#94a3b8">{pos}</text> */}
            </g>
          );
        })}

        {/* === HOME STRETCH LANES === */}
        {COLORS.map((color) =>
          HOME_COORDS[color].slice(0, 5).map(([hx, hy], idx) => {
            const half = CELL_SIZE / 2;
            return (
              <rect
                key={`home-${color}-${idx}`}
                x={hx - half}
                y={hy - half}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={COLOR_LIGHT[color]}
                stroke={COLOR_HEX[color]}
                strokeWidth={1.5}
              />
            );
          })
        )}

        {/* === CENTER GOAL AREA === */}
        {/* The center 3x3 area (cols 6-8, rows 6-8) — draw a diamond */}
        <polygon
          points={`${7 * CELL_SIZE + CELL_SIZE / 2},${6 * CELL_SIZE} ${9 * CELL_SIZE},${7 * CELL_SIZE + CELL_SIZE / 2} ${7 * CELL_SIZE + CELL_SIZE / 2},${9 * CELL_SIZE} ${6 * CELL_SIZE},${7 * CELL_SIZE + CELL_SIZE / 2}`}
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth={2}
          opacity={0.9}
        />
        {/* Goal star */}
        <StarShape x={7 * CELL_SIZE + CELL_SIZE / 2} y={7 * CELL_SIZE + CELL_SIZE / 2} size={22} />
        {/* Center label */}
        <text
          x={7 * CELL_SIZE + CELL_SIZE / 2}
          y={7 * CELL_SIZE + CELL_SIZE / 2 + 30}
          textAnchor="middle"
          fontSize={9}
          fontWeight="bold"
          fill="#92400e"
        >
          DICH
        </text>

        {/* === PIECES IN STABLE === */}
        {COLORS.map((color) => {
          const player = gameState.players.find((p) => p.color === color);
          if (!player) return null;
          const stablePieces = player.pieces.filter((p) => p.position === -1);
          return stablePieces.map((piece, idx) => {
            const [sx, sy] = STABLE_COORDS[color][idx % 4];
            const isValid = isMyTurn && validMoveSet.has(piece.id);
            const isCaptured = piece.id === lastCapturedPieceId;
            return (
              <PieceCircle
                key={`piece-${color}-${piece.id}`}
                x={sx}
                y={sy}
                color={color}
                isValid={isValid}
                isCaptured={isCaptured}
                isMyPiece={color === myColor}
                onClick={() => isValid && onPieceClick(piece.id)}
              />
            );
          });
        })}

        {/* === PIECES ON TRACK === */}
        {allPieces
          .filter((p) => p.position >= 0 && p.position <= 51)
          .map((piece) => {
            const [tx, ty] = TRACK_COORDS[piece.position];
            const isValid = isMyTurn && validMoveSet.has(piece.id);
            const isCaptured = piece.id === lastCapturedPieceId;

            // Check for stacking — offset if multiple pieces at same position
            const samePosPieces = allPieces.filter(
              (other) => other.position === piece.position && other.color !== piece.color
            );
            const stackIdx = samePosPieces.indexOf(piece);
            const offsetX = samePosPieces.length > 0 ? (stackIdx % 2 === 0 ? -7 : 7) : 0;
            const offsetY = samePosPieces.length > 1 ? (stackIdx < 2 ? -7 : 7) : 0;

            return (
              <PieceCircle
                key={`piece-track-${piece.color}-${piece.id}`}
                x={tx + offsetX}
                y={ty + offsetY}
                color={piece.color}
                isValid={isValid}
                isCaptured={isCaptured}
                isMyPiece={piece.color === myColor}
                onClick={() => isValid && onPieceClick(piece.id)}
              />
            );
          })}

        {/* === PIECES IN HOME STRETCH === */}
        {allPieces
          .filter((p) => p.position >= 52 && p.position <= 56)
          .map((piece) => {
            const homeIdx = piece.position - 52;
            const [hx, hy] = HOME_COORDS[piece.color][homeIdx];
            const isValid = isMyTurn && validMoveSet.has(piece.id);
            const isCaptured = piece.id === lastCapturedPieceId;
            return (
              <PieceCircle
                key={`piece-home-${piece.color}-${piece.id}`}
                x={hx}
                y={hy}
                color={piece.color}
                isValid={isValid}
                isCaptured={isCaptured}
                isMyPiece={piece.color === myColor}
                onClick={() => isValid && onPieceClick(piece.id)}
              />
            );
          })}

        {/* === PIECES AT GOAL === */}
        {allPieces
          .filter((p) => p.position === GOAL_POSITION)
          .map((piece, idx) => {
            const cx = 7 * CELL_SIZE + CELL_SIZE / 2;
            const cy = 7 * CELL_SIZE + CELL_SIZE / 2;
            const offsetX = (idx % 2 === 0 ? -8 : 8);
            const offsetY = (idx < 2 ? -8 : 8);
            return (
              <PieceCircle
                key={`piece-goal-${piece.color}-${piece.id}`}
                x={cx + offsetX}
                y={cy + offsetY}
                color={piece.color}
                isValid={false}
                isCaptured={false}
                isMyPiece={piece.color === myColor}
                onClick={() => {}}
                small
              />
            );
          })}

        {/* === DICE DISPLAY (top-right corner of board) === */}
        {gameState.dice && (
          <g>
            <rect
              x={BOARD_SIZE_PX - 100}
              y={BOARD_SIZE_PX - 80}
              width={90}
              height={70}
              rx={8}
              fill="rgba(15, 23, 42, 0.85)"
              stroke="#475569"
              strokeWidth={1}
            />
            <DiceFace value={gameState.dice.dice1} x={BOARD_SIZE_PX - 75} y={BOARD_SIZE_PX - 45} size={28} />
            <DiceFace value={gameState.dice.dice2} x={BOARD_SIZE_PX - 40} y={BOARD_SIZE_PX - 45} size={28} />
            {gameState.dice.isDouble && (
              <text
                x={BOARD_SIZE_PX - 57}
                y={BOARD_SIZE_PX - 14}
                textAnchor="middle"
                fontSize={9}
                fill="#fbbf24"
                fontWeight="bold"
              >
                DOUBLE!
              </text>
            )}
          </g>
        )}

        {/* === EXIT-STABLE EFFECT (Xuất quân) === */}
        {exitEvent && (() => {
          const [ex, ey] = TRACK_COORDS[exitEvent.position] ?? [0, 0];
          return (
            <ExitEffect
              key={exitEvent.key}
              x={ex}
              y={ey}
              color={exitEvent.color}
            />
          );
        })()}

        {/* === CAPTURE EFFECT (Đá quân) === */}
        {captureEvent && (() => {
          const [cx, cy] = TRACK_COORDS[captureEvent.position] ?? [0, 0];
          return (
            <CaptureEffect
              key={captureEvent.key}
              x={cx}
              y={cy}
              color={captureEvent.color}
            />
          );
        })()}

        {/* === CURRENT PLAYER INDICATOR === */}
        {gameState.currentPlayerColor && (
          <g>
            <rect
              x={CELL_SIZE * 0.3}
              y={BOARD_SIZE_PX - 70}
              width={130}
              height={26}
              rx={5}
              fill={COLOR_HEX[gameState.currentPlayerColor]}
              opacity={0.9}
            />
            <text
              x={CELL_SIZE * 0.3 + 65}
              y={BOARD_SIZE_PX - 52}
              textAnchor="middle"
              fontSize={11}
              fill="white"
              fontWeight="bold"
            >
              {gameState.currentPlayerColor === myColor
                ? 'Luot cua ban!'
                : `Luot: ${gameState.players.find((p) => p.color === gameState.currentPlayerColor)?.username || ''}`}
            </text>
          </g>
        )}
      </svg>

      {/* Board edge — gives 3D thickness illusion */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '22px',
          bottom: '-22px',
          left: 0,
          background: 'linear-gradient(to bottom, #334155, #1e293b)',
          borderRadius: '0 0 6px 6px',
          transformOrigin: 'top',
          transform: 'rotateX(-90deg)',
        }}
      />
      </div>
    </div>
  );
}

interface PieceCircleProps {
  x: number;
  y: number;
  color: PlayerColor;
  isValid: boolean;
  isCaptured: boolean;
  isMyPiece: boolean;
  onClick: () => void;
  small?: boolean;
}

function PieceCircle({
  x,
  y,
  color,
  isValid,
  isCaptured,
  isMyPiece,
  onClick,
  small = false,
}: PieceCircleProps) {
  const r = small ? 8 : 14;
  const innerR = small ? 4 : 8;

  return (
    <g
      onClick={onClick}
      className={clsx(isValid && 'piece-valid', isCaptured && 'piece-capture')}
      style={{
        cursor: isValid ? 'pointer' : 'default',
        // CSS translate drives smooth movement animation whenever x/y change
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
      }}
    >
      {/* Outer glow for valid moves — rendered at origin since g is translated */}
      {isValid && (
        <circle
          cx={0}
          cy={0}
          r={r + 5}
          fill="none"
          stroke={COLOR_HEX[color]}
          strokeWidth={2.5}
          opacity={0.6}
        >
          <animate
            attributeName="r"
            values={`${r + 3};${r + 8};${r + 3}`}
            dur="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Drop shadow (3D elevation illusion) */}
      <ellipse cx={2} cy={r * 0.6 + 4} rx={r * 0.85} ry={r * 0.3} fill="rgba(0,0,0,0.25)" />

      {/* Piece body — elevated look with bottom rim */}
      <circle cx={0} cy={2} r={r} fill={COLOR_HEX[color]} opacity={0.55} />
      <circle
        cx={0}
        cy={0}
        r={r}
        fill={COLOR_HEX[color]}
        stroke="white"
        strokeWidth={isMyPiece ? 2.5 : 1.5}
      />

      {/* Inner circle highlight */}
      <circle cx={0} cy={0} r={innerR} fill="white" opacity={0.35} />

      {/* Top sheen */}
      <circle cx={-r * 0.28} cy={-r * 0.28} r={r * 0.28} fill="white" opacity={0.55} />
    </g>
  );
}

// ─── Xuất quân — piece exits stable ───────────────────────────────────────────
// Sparkle burst at the gate square. key prop on parent forces remount → SMIL restarts.
function ExitEffect({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = COLOR_HEX[color];
  const NUM_RAYS = 8;
  const RAY_LEN = 26;
  return (
    <g pointerEvents="none">
      {/* Expanding outer gold ring */}
      <circle cx={x} cy={y} r={4} fill="none" stroke="gold" strokeWidth={3}>
        <animate attributeName="r"           from="4"   to="36"  dur="0.75s" fill="freeze" />
        <animate attributeName="opacity"     from="1"   to="0"   dur="0.75s" fill="freeze" />
        <animate attributeName="stroke-width" from="3" to="0.5"  dur="0.75s" fill="freeze" />
      </circle>
      {/* Inner color ring */}
      <circle cx={x} cy={y} r={4} fill="none" stroke={c} strokeWidth={2}>
        <animate attributeName="r"       from="4"  to="22"  dur="0.55s" begin="0.1s" fill="freeze" />
        <animate attributeName="opacity" from="0.9" to="0"  dur="0.55s" begin="0.1s" fill="freeze" />
      </circle>
      {/* Radiating sparkle rays */}
      {Array.from({ length: NUM_RAYS }, (_, i) => {
        const angle = (i * 2 * Math.PI) / NUM_RAYS;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const x2start = x + dx * 6;
        const y2start = y + dy * 6;
        const x2end   = x + dx * (6 + RAY_LEN);
        const y2end   = y + dy * (6 + RAY_LEN);
        return (
          <line
            key={i}
            x1={x} y1={y}
            x2={x2start} y2={y2start}
            stroke={i % 2 === 0 ? 'gold' : c}
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <animate attributeName="x2"     from={x2start} to={x2end}   dur="0.6s" fill="freeze" />
            <animate attributeName="y2"     from={y2start} to={y2end}   dur="0.6s" fill="freeze" />
            <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.5;1" dur="0.7s" fill="freeze" />
          </line>
        );
      })}
      {/* Center flash */}
      <circle cx={x} cy={y} r={14} fill="gold" opacity={0.7}>
        <animate attributeName="r"       from="14" to="5"  dur="0.3s" fill="freeze" />
        <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" fill="freeze" />
      </circle>
      {/* Floating label */}
      <text x={x} y={y - 22} textAnchor="middle" fontSize={11} fontWeight="bold" fill="gold" opacity={1}>
        XUẤT!
        <animate attributeName="y"       from={y - 16} to={y - 36} dur="0.9s" fill="freeze" />
        <animate attributeName="opacity" from="1"      to="0"      dur="0.9s" fill="freeze" />
      </text>
    </g>
  );
}

// ─── Đá quân — piece captured ──────────────────────────────────────────────────
// Shockwave explosion at the capture square.
function CaptureEffect({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = COLOR_HEX[color];
  return (
    <g pointerEvents="none">
      {/* White impact flash */}
      <circle cx={x} cy={y} r={18} fill="white" opacity={0.9}>
        <animate attributeName="r"       from="8"   to="26"  dur="0.18s" fill="freeze" />
        <animate attributeName="opacity" from="0.9" to="0"   dur="0.22s" fill="freeze" />
      </circle>
      {/* Primary shockwave */}
      <circle cx={x} cy={y} r={6} fill="none" stroke={c} strokeWidth={4.5}>
        <animate attributeName="r"            from="6"   to="46"  dur="0.6s" fill="freeze" />
        <animate attributeName="opacity"      from="1"   to="0"   dur="0.6s" fill="freeze" />
        <animate attributeName="stroke-width" from="4.5" to="0.5" dur="0.6s" fill="freeze" />
      </circle>
      {/* Secondary white ring */}
      <circle cx={x} cy={y} r={6} fill="none" stroke="white" strokeWidth={2.5} opacity={0}>
        <animate attributeName="r"       from="6"   to="36"  dur="0.5s" begin="0.08s" fill="freeze" />
        <animate attributeName="opacity" from="0.85" to="0"  dur="0.5s" begin="0.08s" fill="freeze" />
      </circle>
      {/* Tertiary color ring */}
      <circle cx={x} cy={y} r={6} fill="none" stroke={c} strokeWidth={2} opacity={0}>
        <animate attributeName="r"       from="6"  to="28"  dur="0.4s" begin="0.18s" fill="freeze" />
        <animate attributeName="opacity" from="0.7" to="0"  dur="0.4s" begin="0.18s" fill="freeze" />
      </circle>
      {/* 4 debris sparks flying outward */}
      {[45, 135, 225, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const tx = x + Math.cos(rad) * 30;
        const ty = y + Math.sin(rad) * 30;
        return (
          <circle key={i} cx={x} cy={y} r={4} fill={i % 2 === 0 ? c : 'white'}>
            <animate attributeName="cx"      from={x}  to={tx}  dur="0.55s" fill="freeze" />
            <animate attributeName="cy"      from={y}  to={ty}  dur="0.55s" fill="freeze" />
            <animate attributeName="r"       from="4"  to="1"   dur="0.55s" fill="freeze" />
            <animate attributeName="opacity" from="1"  to="0"   dur="0.55s" fill="freeze" />
          </circle>
        );
      })}
      {/* Floating label */}
      <text x={x} y={y - 22} textAnchor="middle" fontSize={12} fontWeight="bold" fill={c} opacity={1}
        style={{ textShadow: '0 0 4px white' }}>
        ĐÁ!
        <animate attributeName="y"       from={y - 16} to={y - 40} dur="0.85s" fill="freeze" />
        <animate attributeName="opacity" from="1"      to="0"      dur="0.85s" fill="freeze" />
      </text>
    </g>
  );
}
