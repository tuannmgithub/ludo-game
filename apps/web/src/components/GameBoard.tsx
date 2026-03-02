'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  TRACK_COORDS,
  HOME_COORDS,
  STABLE_COORDS,
  STABLE_DIAMONDS,
  ISO_HH,
  ISO_HW,
  ISO_TILE_W,
  ISO_TILE_H,
  BOARD_W,
  BOARD_H,
  COLOR_HEX,
  SAFE_ZONE_SET,
  GOAL_PX,
  GOAL_DIAMOND,
} from '@/lib/board-coords';
import type { GameState, PlayerColor } from '@/types/game';
import { GOAL_POSITION } from '@/types/game';
import type { CaptureEvent, ExitEvent } from '@/store/gameStore';

// ─── Sprite sheet ─────────────────────────────────────────────────────────────
const SHEET_URL = '/assets/mainBoard/mainBoard.png';
const SHEET_W = 1024;
const SHEET_H = 1024;

// Track positions: 0-8 = red arm, 13-21 = blue arm, 26-34 = yellow arm, 39-47 = green arm
function getTrackTileColor(pos: number): string {
  if (pos >= 0  && pos <= 8)  return 'red';
  if (pos >= 13 && pos <= 21) return 'blue';
  if (pos >= 26 && pos <= 34) return 'yellow';
  if (pos >= 39 && pos <= 47) return 'green';
  return 'white';
}

// Approximate top-face fill color per tile type.
// Used as an opaque background diamond behind each tile sprite to block
// adjacent-tile bleeding through transparent sprite corners.
const TILE_FACE_COLOR: Record<string, string> = {
  'spr-white':  '#c8cad4',
  'spr-red':    '#c84050',
  'spr-blue':   '#4060c8',
  'spr-yellow': '#c0a030',
  'spr-green':  '#40a040',
};

// SVG <symbol> definitions for tile sprites extracted from mainBoard.plist (1024×1024 atlas).
// Non-rotated tiles: viewBox inset 1px on all sides to prevent adjacent-sprite bleed.
// Rotated 90° CW tiles: matrix f = sx+sw-1 (not sx+sw) to fix off-by-1 bleed.
// overflow="hidden" is explicit (should be default per spec but enforced for safety).
function TileSymbols() {
  return (
    <>
      {/* tile_red_1:    sx=787 sy=400 sw=101 sh=91  — not rotated; inset 1px */}
      <symbol id="spr-red"    viewBox="788 401 99 89" preserveAspectRatio="none" overflow="hidden">
        <image href={SHEET_URL} x={0} y={0} width={SHEET_W} height={SHEET_H} />
      </symbol>
      {/* tile_yellow_1: sx=787 sy=307 sw=101 sh=91  — not rotated; inset 1px */}
      <symbol id="spr-yellow" viewBox="788 308 99 89" preserveAspectRatio="none" overflow="hidden">
        <image href={SHEET_URL} x={0} y={0} width={SHEET_W} height={SHEET_H} />
      </symbol>
      {/* tile_green_1:  sx=890 sy=483 sw=101 sh=91  — not rotated; inset 1px */}
      <symbol id="spr-green"  viewBox="891 484 99 89" preserveAspectRatio="none" overflow="hidden">
        <image href={SHEET_URL} x={0} y={0} width={SHEET_W} height={SHEET_H} />
      </symbol>
      {/* tile_blue_1:   sx=93  sy=911 sw=101 sh=89  — rotated CW; f=sx+sw-1=193 */}
      <symbol id="spr-blue"  viewBox="0 0 89 101" preserveAspectRatio="none" overflow="hidden">
        <image href={SHEET_URL} x={0} y={0} width={SHEET_W} height={SHEET_H}
          transform="matrix(0,-1,1,0,-911,193)" />
      </symbol>
      {/* tile_white:    sx=694 sy=375 sw=101 sh=91  — rotated CW; f=sx+sw-1=794 */}
      <symbol id="spr-white" viewBox="0 0 91 101" preserveAspectRatio="none" overflow="hidden">
        <image href={SHEET_URL} x={0} y={0} width={SHEET_W} height={SHEET_H}
          transform="matrix(0,-1,1,0,-375,794)" />
      </symbol>
    </>
  );
}

interface GameBoardProps {
  gameState: GameState;
  myColor: PlayerColor | null;
  onPieceClick: (pieceId: number) => void;
  lastCapturedPieceId: number | null;
  captureEvent?: CaptureEvent | null;
  exitEvent?: ExitEvent | null;
}

const COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

// Star icon for safe zones
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
        <circle key={i} cx={x - r + dx * size} cy={y - r + dy * size} r={2.5} fill="#1e293b" />
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

  const allPieces = useMemo(() => {
    return gameState.players.flatMap((p) => p.pieces);
  }, [gameState.players]);

  // All board tiles sorted by iso_y ascending (back-to-front for proper depth)
  const allTiles = useMemo(() => {
    const tiles: { key: string; x: number; y: number; spriteId: string; isSafe: boolean }[] = [];

    TRACK_COORDS.forEach(([tx, ty], pos) => {
      tiles.push({
        key: `track-${pos}`,
        x: tx, y: ty,
        spriteId: `spr-${getTrackTileColor(pos)}`,
        isSafe: SAFE_ZONE_SET.has(pos),
      });
    });

    // Home stretch tiles (positions 52-56) have no sprite — left empty

    // Sort ascending y → render back tiles first, front tiles on top
    tiles.sort((a, b) => a.y - b.y);
    return tiles;
  }, []);

  const [goalX, goalY] = GOAL_PX;

  return (
    // No CSS 3D transforms — pure 2D isometric coordinate placement
    // SVG is responsive: fills container while preserving aspect ratio via viewBox
    <svg
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
        {/* Background — scaled to exactly match SVG canvas */}
        <image
          href="/assets/mainBoard/bg2.jpg"
          x={0} y={0}
          width={BOARD_W}
          height={BOARD_H}
          preserveAspectRatio="none"
        />

        {/* Tile sprite symbol definitions */}
        <defs>
          <TileSymbols />
        </defs>

        {/* === STABLE AREAS (colored diamond polygons) === */}
        {COLORS.map((color) => (
          <polygon
            key={`stable-${color}`}
            points={STABLE_DIAMONDS[color]}
            fill={COLOR_HEX[color]}
            fillOpacity={0.22}
            stroke={COLOR_HEX[color]}
            strokeWidth={2.5}
            strokeOpacity={0.75}
          />
        ))}

        {/* === ALL TILES — sorted back-to-front for isometric depth === */}
        {allTiles.map(({ key, x, y, spriteId, isSafe }) => {
          const faceColor = TILE_FACE_COLOR[spriteId] ?? '#c8cad4';
          const diamond = `${x},${y - ISO_HH} ${x + ISO_HW},${y} ${x},${y + ISO_HH} ${x - ISO_HW},${y}`;
          return (
            <g key={key}>
              {/* Opaque diamond fill blocks adjacent-tile bleed through transparent sprite corners */}
              <polygon points={diamond} fill={faceColor} />
              <use
                href={`#${spriteId}`}
                x={x - ISO_TILE_W / 2}
                y={y - ISO_HH}
                width={ISO_TILE_W}
                height={ISO_TILE_H}
              />
              {isSafe && <StarShape x={x} y={y + ISO_HH / 2} size={8} />}
            </g>
          );
        })}

        {/* === CENTER GOAL AREA === */}
        <polygon
          points={GOAL_DIAMOND}
          fill="rgba(251,191,36,0.28)"
          stroke="gold"
          strokeWidth={2}
        />
        <StarShape x={goalX} y={goalY} size={20} />

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
                x={sx} y={sy}
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
            const samePosPieces = allPieces.filter(
              (other) => other.position === piece.position && other.color !== piece.color
            );
            const stackIdx = samePosPieces.indexOf(piece);
            const offsetX = samePosPieces.length > 0 ? (stackIdx % 2 === 0 ? -7 : 7) : 0;
            const offsetY = samePosPieces.length > 1 ? (stackIdx < 2 ? -7 : 7) : 0;
            return (
              <PieceCircle
                key={`piece-track-${piece.color}-${piece.id}`}
                x={tx + offsetX} y={ty + offsetY}
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
                x={hx} y={hy}
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
            const offsetX = idx % 2 === 0 ? -8 : 8;
            const offsetY = idx < 2 ? -8 : 8;
            return (
              <PieceCircle
                key={`piece-goal-${piece.color}-${piece.id}`}
                x={goalX + offsetX} y={goalY + offsetY}
                color={piece.color}
                isValid={false}
                isCaptured={false}
                isMyPiece={piece.color === myColor}
                onClick={() => {}}
                small
              />
            );
          })}

        {/* === DICE DISPLAY (bottom-right) === */}
        {gameState.dice && (
          <g>
            <rect
              x={BOARD_W - 100} y={BOARD_H - 80}
              width={90} height={70}
              rx={8}
              fill="rgba(15, 23, 42, 0.85)"
              stroke="#475569"
              strokeWidth={1}
            />
            <DiceFace value={gameState.dice.dice1} x={BOARD_W - 75} y={BOARD_H - 45} size={28} />
            <DiceFace value={gameState.dice.dice2} x={BOARD_W - 40} y={BOARD_H - 45} size={28} />
            {gameState.dice.isDouble && (
              <text
                x={BOARD_W - 55} y={BOARD_H - 14}
                textAnchor="middle" fontSize={9}
                fill="#fbbf24" fontWeight="bold"
              >
                DOUBLE!
              </text>
            )}
          </g>
        )}

        {/* === EXIT-STABLE EFFECT (Xuất quân) === */}
        {exitEvent && (() => {
          const [ex, ey] = TRACK_COORDS[exitEvent.position] ?? [0, 0];
          return <ExitEffect key={exitEvent.key} x={ex} y={ey} color={exitEvent.color} />;
        })()}

        {/* === CAPTURE EFFECT (Đá quân) === */}
        {captureEvent && (() => {
          const [cx, cy] = TRACK_COORDS[captureEvent.position] ?? [0, 0];
          return <CaptureEffect key={captureEvent.key} x={cx} y={cy} color={captureEvent.color} />;
        })()}

        {/* === CURRENT PLAYER INDICATOR (bottom-left) === */}
        {gameState.currentPlayerColor && (
          <g>
            <rect
              x={10} y={BOARD_H - 40}
              width={140} height={26}
              rx={5}
              fill={COLOR_HEX[gameState.currentPlayerColor]}
              opacity={0.9}
            />
            <text
              x={80} y={BOARD_H - 22}
              textAnchor="middle" fontSize={11}
              fill="white" fontWeight="bold"
            >
              {gameState.currentPlayerColor === myColor
                ? 'Luot cua ban!'
                : `Luot: ${gameState.players.find((p) => p.color === gameState.currentPlayerColor)?.username || ''}`}
            </text>
          </g>
        )}
    </svg>
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

function PieceCircle({ x, y, color, isValid, isCaptured, isMyPiece, onClick, small = false }: PieceCircleProps) {
  const size = small ? 22 : 36;
  const halfW = size / 2;
  const halfH = size * 0.6;

  return (
    <g
      onClick={onClick}
      className={clsx(isValid && 'piece-valid', isCaptured && 'piece-capture')}
      style={{
        cursor: isValid ? 'pointer' : 'default',
        transform: `translate(${x}px, ${y - halfH}px)`,
        transition: 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
      }}
    >
      {isValid && (
        <circle cx={0} cy={4} r={halfW + 4} fill="none" stroke={COLOR_HEX[color]} strokeWidth={2.5} opacity={0.7}>
          <animate attributeName="r"       values={`${halfW + 2};${halfW + 9};${halfW + 2}`} dur="0.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.25;0.9" dur="0.9s" repeatCount="indefinite" />
        </circle>
      )}
      {isMyPiece && !small && (
        <circle cx={0} cy={4} r={halfW + 1} fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray="3 2" />
      )}
      <ellipse cx={1} cy={halfH - 2} rx={halfW * 0.8} ry={halfW * 0.25} fill="rgba(0,0,0,0.45)" />
      <image
        href={`/assets/game/Horse/skin_1/${color}_horse.png`}
        x={-halfW} y={-halfH}
        width={size} height={size * 1.2}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

// ─── Xuất quân effect ─────────────────────────────────────────────────────────
function ExitEffect({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = COLOR_HEX[color];
  const NUM_RAYS = 8;
  const RAY_LEN = 26;
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={4} fill="none" stroke="gold" strokeWidth={3}>
        <animate attributeName="r"           from="4"  to="36"  dur="0.75s" fill="freeze" />
        <animate attributeName="opacity"     from="1"  to="0"   dur="0.75s" fill="freeze" />
        <animate attributeName="stroke-width" from="3" to="0.5" dur="0.75s" fill="freeze" />
      </circle>
      <circle cx={x} cy={y} r={4} fill="none" stroke={c} strokeWidth={2}>
        <animate attributeName="r"       from="4"   to="22"  dur="0.55s" begin="0.1s" fill="freeze" />
        <animate attributeName="opacity" from="0.9" to="0"   dur="0.55s" begin="0.1s" fill="freeze" />
      </circle>
      {Array.from({ length: NUM_RAYS }, (_, i) => {
        const angle = (i * 2 * Math.PI) / NUM_RAYS;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const x2start = x + dx * 6;
        const y2start = y + dy * 6;
        const x2end   = x + dx * (6 + RAY_LEN);
        const y2end   = y + dy * (6 + RAY_LEN);
        return (
          <line key={i} x1={x} y1={y} x2={x2start} y2={y2start}
            stroke={i % 2 === 0 ? 'gold' : c} strokeWidth={2.5} strokeLinecap="round">
            <animate attributeName="x2"     from={x2start} to={x2end}   dur="0.6s" fill="freeze" />
            <animate attributeName="y2"     from={y2start} to={y2end}   dur="0.6s" fill="freeze" />
            <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.5;1" dur="0.7s" fill="freeze" />
          </line>
        );
      })}
      <circle cx={x} cy={y} r={14} fill="gold" opacity={0.7}>
        <animate attributeName="r"       from="14" to="5"  dur="0.3s" fill="freeze" />
        <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" fill="freeze" />
      </circle>
      <text x={x} y={y - 22} textAnchor="middle" fontSize={11} fontWeight="bold" fill="gold" opacity={1}>
        XUẤT!
        <animate attributeName="y"       from={y - 16} to={y - 36} dur="0.9s" fill="freeze" />
        <animate attributeName="opacity" from="1"      to="0"      dur="0.9s" fill="freeze" />
      </text>
    </g>
  );
}

// ─── Đá quân effect ───────────────────────────────────────────────────────────
function CaptureEffect({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = COLOR_HEX[color];
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={18} fill="white" opacity={0.9}>
        <animate attributeName="r"       from="8"   to="26"  dur="0.18s" fill="freeze" />
        <animate attributeName="opacity" from="0.9" to="0"   dur="0.22s" fill="freeze" />
      </circle>
      <circle cx={x} cy={y} r={6} fill="none" stroke={c} strokeWidth={4.5}>
        <animate attributeName="r"            from="6"   to="46"  dur="0.6s" fill="freeze" />
        <animate attributeName="opacity"      from="1"   to="0"   dur="0.6s" fill="freeze" />
        <animate attributeName="stroke-width" from="4.5" to="0.5" dur="0.6s" fill="freeze" />
      </circle>
      <circle cx={x} cy={y} r={6} fill="none" stroke="white" strokeWidth={2.5} opacity={0}>
        <animate attributeName="r"       from="6"    to="36"  dur="0.5s" begin="0.08s" fill="freeze" />
        <animate attributeName="opacity" from="0.85" to="0"   dur="0.5s" begin="0.08s" fill="freeze" />
      </circle>
      <circle cx={x} cy={y} r={6} fill="none" stroke={c} strokeWidth={2} opacity={0}>
        <animate attributeName="r"       from="6"   to="28"  dur="0.4s" begin="0.18s" fill="freeze" />
        <animate attributeName="opacity" from="0.7" to="0"   dur="0.4s" begin="0.18s" fill="freeze" />
      </circle>
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
      <text x={x} y={y - 22} textAnchor="middle" fontSize={12} fontWeight="bold" fill={c} opacity={1}
        style={{ textShadow: '0 0 4px white' }}>
        ĐÁ!
        <animate attributeName="y"       from={y - 16} to={y - 40} dur="0.85s" fill="freeze" />
        <animate attributeName="opacity" from="1"      to="0"      dur="0.85s" fill="freeze" />
      </text>
    </g>
  );
}
