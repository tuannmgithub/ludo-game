import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Rect,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import {
  TRACK_COORDS,
  HOME_COORDS,
  CELL_SIZE,
  BOARD_VIRTUAL_SIZE,
  getPieceCoords,
} from '../lib/board-coords';
import {
  GameState,
  PlayerColor,
  ValidMove,
  COLOR_HEX,
  SAFE_ZONES,
  START_POSITIONS,
} from '../types/game';

const C = CELL_SIZE;

interface Props {
  gameState: GameState;
  myColor: PlayerColor | null;
  onPiecePress: (pieceId: number, color: PlayerColor) => void;
  selectedPieceId: number | null;
}

// Stable area background rectangle per color
const STABLE_AREAS: Record<PlayerColor, { x: number; y: number; w: number; h: number }> = {
  red: { x: C * 0, y: C * 10, w: C * 5, h: C * 5 },
  blue: { x: C * 0, y: C * 0, w: C * 5, h: C * 5 },
  yellow: { x: C * 10, y: C * 10, w: C * 5, h: C * 5 },
  green: { x: C * 10, y: C * 0, w: C * 5, h: C * 5 },
};

// Home stretch lane backgrounds per color
const HOME_LANE_RECTS: Record<
  PlayerColor,
  { x: number; y: number; w: number; h: number }
> = {
  red: { x: C * 1, y: C * 7, w: C * 6, h: C },
  blue: { x: C * 7, y: C * 1, w: C, h: C * 6 },
  yellow: { x: C * 8, y: C * 7, w: C * 6, h: C },
  green: { x: C * 7, y: C * 8, w: C, h: C * 6 },
};

function BoardBackground() {
  const colors: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];
  return (
    <>
      {/* Overall board background */}
      <Rect x={0} y={0} width={BOARD_VIRTUAL_SIZE} height={BOARD_VIRTUAL_SIZE} fill="#f0f0f0" />

      {/* Stable areas */}
      {colors.map((color) => {
        const area = STABLE_AREAS[color];
        return (
          <G key={`stable-area-${color}`}>
            <Rect
              x={area.x}
              y={area.y}
              width={area.w}
              height={area.h}
              fill={COLOR_HEX[color]}
              opacity={0.85}
            />
            <Rect
              x={area.x + 4}
              y={area.y + 4}
              width={area.w - 8}
              height={area.h - 8}
              fill="#ffffff"
              opacity={0.3}
              rx={8}
            />
          </G>
        );
      })}

      {/* Track cells - main path */}
      {TRACK_COORDS.map(([x, y], idx) => {
        const isSafe = (SAFE_ZONES as readonly number[]).includes(idx);
        const isStart = Object.values(START_POSITIONS).includes(idx);
        let cellFill = '#ffffff';
        if (isStart) {
          // Find which color this start belongs to
          const startColor = (Object.entries(START_POSITIONS) as [PlayerColor, number][]).find(
            ([, pos]) => pos === idx
          );
          if (startColor) cellFill = COLOR_HEX[startColor[0]];
        } else if (isSafe) {
          cellFill = '#d1fae5'; // light green tint for safe zone
        }
        return (
          <Rect
            key={`track-${idx}`}
            x={x - C / 2}
            y={y - C / 2}
            width={C}
            height={C}
            fill={cellFill}
            stroke="#ccc"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Home stretch lanes */}
      {colors.map((color) => {
        const lane = HOME_LANE_RECTS[color];
        return (
          <Rect
            key={`home-lane-${color}`}
            x={lane.x}
            y={lane.y}
            width={lane.w}
            height={lane.h}
            fill={COLOR_HEX[color]}
            opacity={0.5}
          />
        );
      })}

      {/* Individual home stretch cells */}
      {colors.map((color) =>
        HOME_COORDS[color].slice(0, 5).map(([x, y], idx) => (
          <Rect
            key={`home-cell-${color}-${idx}`}
            x={x - C / 2}
            y={y - C / 2}
            width={C}
            height={C}
            fill={COLOR_HEX[color]}
            opacity={0.4}
            stroke={COLOR_HEX[color]}
            strokeWidth={0.5}
          />
        ))
      )}

      {/* Center goal (position 57) */}
      <Rect
        x={C * 6}
        y={C * 6}
        width={C * 3}
        height={C * 3}
        fill="#1a1a2e"
        opacity={0.9}
      />
      {/* Center star */}
      <SvgText
        x={C * 7 + C / 2}
        y={C * 7 + C / 2 + 10}
        textAnchor="middle"
        fontSize={36}
        fill="#fbbf24"
      >
        ★
      </SvgText>

      {/* Safe zone markers */}
      {(SAFE_ZONES as readonly number[]).map((pos) => {
        const [x, y] = TRACK_COORDS[pos];
        // Check if this is a start position - already colored
        if (Object.values(START_POSITIONS).includes(pos)) return null;
        return (
          <SvgText
            key={`safe-${pos}`}
            x={x}
            y={y + 5}
            textAnchor="middle"
            fontSize={14}
            fill="#10b981"
          >
            ★
          </SvgText>
        );
      })}
    </>
  );
}

interface PieceProp {
  cx: number;
  cy: number;
  color: PlayerColor;
  pieceId: number;
  isSelected: boolean;
  isValidMove: boolean;
  isMyPiece: boolean;
  onPress: () => void;
}

function GamePiece({
  cx,
  cy,
  color,
  pieceId,
  isSelected,
  isValidMove,
  isMyPiece,
  onPress,
}: PieceProp) {
  const fill = COLOR_HEX[color];
  const r = isSelected ? 14 : 12;
  const strokeColor = isSelected ? '#ffffff' : isValidMove ? '#fbbf24' : '#00000040';
  const strokeWidth = isSelected ? 3 : isValidMove ? 2.5 : 1;

  return (
    <G onPress={isMyPiece || isValidMove ? onPress : undefined}>
      {/* Glow ring for valid move targets */}
      {isValidMove && !isSelected && (
        <Circle cx={cx} cy={cy} r={16} fill={fill} opacity={0.25} />
      )}
      {/* Main piece body */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Inner circle highlight */}
      <Circle cx={cx - 3} cy={cy - 3} r={4} fill="#ffffff" opacity={0.4} />
      {/* Piece number */}
      <SvgText
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={10}
        fill="#ffffff"
        fontWeight="bold"
      >
        {pieceId + 1}
      </SvgText>
    </G>
  );
}

export function GameBoard({ gameState, myColor, onPiecePress, selectedPieceId }: Props) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 500);

  const validMoveMap = new Map<number, ValidMove>();
  for (const move of gameState.validMoves) {
    validMoveMap.set(move.pieceId, move);
  }

  // Collect all pieces with their display positions
  const piecesToRender: Array<{
    piece: { id: number; color: PlayerColor; position: number };
    cx: number;
    cy: number;
    isMyPiece: boolean;
    isSelected: boolean;
    isValidMove: boolean;
    key: string;
  }> = [];

  // Track piece counts at same position for slight offset to avoid full overlap
  const positionCounts: Map<string, number> = new Map();

  for (const player of gameState.players) {
    for (let i = 0; i < player.pieces.length; i++) {
      const piece = player.pieces[i];
      const posKey = `${player.color}-${piece.position}`;
      const count = positionCounts.get(posKey) || 0;
      positionCounts.set(posKey, count + 1);

      let [baseX, baseY] = getPieceCoords(piece.position, player.color, i);

      // Slight offset for multiple pieces at same position on track
      if (piece.position >= 0 && piece.position < 52) {
        const trackKey = `track-${piece.position}`;
        const trackCount = positionCounts.get(trackKey) || 0;
        positionCounts.set(trackKey, trackCount + 1);
        if (trackCount > 0) {
          baseX += (trackCount % 2 === 0 ? 1 : -1) * 7;
          baseY += trackCount > 1 ? 7 : -7;
        }
      }

      const isMyPiece = player.color === myColor;
      const isSelected = selectedPieceId === piece.id && isMyPiece;
      const isValidMove = validMoveMap.has(piece.id);

      piecesToRender.push({
        piece,
        cx: baseX,
        cy: baseY,
        isMyPiece,
        isSelected,
        isValidMove,
        key: `piece-${player.color}-${piece.id}`,
      });
    }
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg
        width={boardSize}
        height={boardSize}
        viewBox={`0 0 ${BOARD_VIRTUAL_SIZE} ${BOARD_VIRTUAL_SIZE}`}
      >
        <BoardBackground />

        {/* Render pieces */}
        {piecesToRender.map(({ piece, cx, cy, isMyPiece, isSelected, isValidMove, key }) => (
          <GamePiece
            key={key}
            cx={cx}
            cy={cy}
            color={piece.color}
            pieceId={piece.id}
            isSelected={isSelected}
            isValidMove={isValidMove}
            isMyPiece={isMyPiece}
            onPress={() => onPiecePress(piece.id, piece.color)}
          />
        ))}
      </Svg>
    </View>
  );
}
