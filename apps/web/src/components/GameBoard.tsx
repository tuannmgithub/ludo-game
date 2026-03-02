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
        {/* Background image */}
        <image
          href="/assets/mainBoard/bg2.jpg"
          x={0} y={0}
          width={BOARD_SIZE_PX}
          height={BOARD_SIZE_PX}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Dark overlay to make board elements readable */}
        <rect width={BOARD_SIZE_PX} height={BOARD_SIZE_PX} fill="rgba(0,0,0,0.25)" />

        {/* === STABLE AREAS === */}
        {COLORS.map((color) => {
          const [bx, by, bw, bh] = STABLE_BOUNDS[color];
          return (
            <g key={`stable-${color}`}>
              {/* Glass background */}
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                fill={COLOR_HEX[color]}
                fillOpacity={0.18}
                stroke={COLOR_HEX[color]}
                strokeWidth={2.5}
                strokeOpacity={0.7}
                rx={6}
              />
              {/* Inner glow ring */}
              <rect
                x={bx + CELL_SIZE * 0.5}
                y={by + CELL_SIZE * 0.5}
                width={bw - CELL_SIZE}
                height={bh - CELL_SIZE}
                rx={10}
                fill={COLOR_HEX[color]}
                fillOpacity={0.12}
                stroke={COLOR_HEX[color]}
                strokeWidth={1.5}
                strokeOpacity={0.5}
              />
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

          const half = CELL_SIZE / 2 - 1;
          const fillColor = isStart && startColor ? startColor
            : isSafe ? '#fde68a'
            : 'white';
          const fillOpacity = isStart ? 0.75 : isSafe ? 0.6 : 0.35;
          return (
            <g key={`track-${pos}`}>
              {/* Tile shadow */}
              <rect
                x={tx - half + 2}
                y={ty - half + 2}
                width={half * 2}
                height={half * 2}
                rx={5}
                fill="rgba(0,0,0,0.3)"
              />
              {/* Tile body */}
              <rect
                x={tx - half}
                y={ty - half}
                width={half * 2}
                height={half * 2}
                fill={fillColor}
                fillOpacity={fillOpacity}
                stroke={isStart ? COLOR_HEX[(['red','blue','yellow','green'] as PlayerColor[])[([0,13,26,39]).indexOf(pos)]] : 'rgba(255,255,255,0.5)'}
                strokeWidth={isStart ? 2 : 0.8}
                rx={5}
              />
              {/* Shine highlight */}
              <rect
                x={tx - half + 2}
                y={ty - half + 2}
                width={half * 2 - 4}
                height={(half * 2 - 4) * 0.4}
                fill="rgba(255,255,255,0.25)"
                rx={3}
              />
              {(isSafe || isStart) && (
                <StarShape x={tx} y={ty} size={9} />
              )}
            </g>
          );
        })}

        {/* === HOME STRETCH LANES === */}
        {COLORS.map((color) =>
          HOME_COORDS[color].slice(0, 5).map(([hx, hy], idx) => {
            const half = CELL_SIZE / 2 - 1;
            return (
              <g key={`home-${color}-${idx}`}>
                <rect
                  x={hx - half + 2}
                  y={hy - half + 2}
                  width={half * 2}
                  height={half * 2}
                  rx={5}
                  fill="rgba(0,0,0,0.3)"
                />
                <rect
                  x={hx - half}
                  y={hy - half}
                  width={half * 2}
                  height={half * 2}
                  fill={COLOR_HEX[color]}
                  fillOpacity={0.45}
                  stroke={COLOR_HEX[color]}
                  strokeWidth={1.5}
                  strokeOpacity={0.8}
                  rx={5}
                />
                <rect
                  x={hx - half + 2}
                  y={hy - half + 2}
                  width={half * 2 - 4}
                  height={(half * 2 - 4) * 0.4}
                  fill="rgba(255,255,255,0.3)"
                  rx={3}
                />
              </g>
            );
          })
        )}

        {/* === CENTER GOAL AREA === */}
        <polygon
          points={`${7 * CELL_SIZE + CELL_SIZE / 2},${6 * CELL_SIZE} ${9 * CELL_SIZE},${7 * CELL_SIZE + CELL_SIZE / 2} ${7 * CELL_SIZE + CELL_SIZE / 2},${9 * CELL_SIZE} ${6 * CELL_SIZE},${7 * CELL_SIZE + CELL_SIZE / 2}`}
          fill="rgba(251,191,36,0.25)"
          stroke="gold"
          strokeWidth={2}
        />
        <StarShape x={7 * CELL_SIZE + CELL_SIZE / 2} y={7 * CELL_SIZE + CELL_SIZE / 2} size={22} />

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
          background: 'linear-gradient(to bottom, #4c1d95, #2e1065)',
          borderRadius: '0 0 8px 8px',
          transformOrigin: 'top',
          transform: 'rotateX(-90deg)',
          boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)',
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
  const size = small ? 22 : 36;
  const halfW = size / 2;
  const halfH = size * 0.6; // horse image taller than wide

  return (
    <g
      onClick={onClick}
      className={clsx(isValid && 'piece-valid', isCaptured && 'piece-capture')}
      style={{
        cursor: isValid ? 'pointer' : 'default',
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
      }}
    >
      {/* Pulsing glow ring for valid moves */}
      {isValid && (
        <circle
          cx={0}
          cy={4}
          r={halfW + 4}
          fill="none"
          stroke={COLOR_HEX[color]}
          strokeWidth={2.5}
          opacity={0.7}
        >
          <animate attributeName="r"       values={`${halfW + 2};${halfW + 9};${halfW + 2}`} dur="0.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.25;0.9" dur="0.9s" repeatCount="indefinite" />
        </circle>
      )}

      {/* My-piece indicator ring */}
      {isMyPiece && !small && (
        <circle cx={0} cy={4} r={halfW + 1} fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray="3 2" />
      )}

      {/* Drop shadow */}
      <ellipse cx={1} cy={halfH - 2} rx={halfW * 0.8} ry={halfW * 0.25} fill="rgba(0,0,0,0.45)" />

      {/* Horse image */}
      <image
        href={`/assets/game/Horse/skin_1/${color}_horse.png`}
        x={-halfW}
        y={-halfH}
        width={size}
        height={size * 1.2}
        preserveAspectRatio="xMidYMid meet"
      />
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
