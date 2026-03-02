import type { PlayerColor } from '@/types/game';

// ─── Isometric grid constants ─────────────────────────────────────────────────
// No CSS 3D transforms — the isometric look comes entirely from 2D coordinate
// placement using the standard iso formula:
//   iso_x = CX + (col - row) * ISO_HW
//   iso_y = TOP_Y + (col + row) * ISO_HH
export const ISO_HW = 22;        // half-width step per grid unit (x-axis)
export const ISO_HH = 18;        // half-height step per grid unit
export const ISO_TILE_W = 46;    // rendered tile sprite width
export const ISO_TILE_H = 43;    // rendered tile height (top face + side wall)
export const BOARD_W = 700;
export const BOARD_H = 640;

const CX = BOARD_W / 2;          // = 350  horizontal center
const TOP_Y = 15;                // top padding

// Color hex values
export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
};

// Lighter versions of colors for stable areas
export const COLOR_LIGHT: Record<PlayerColor, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  yellow: '#fde047',
  green: '#86efac',
};

// Isometric pixel center from grid column/row
const px = (col: number, row: number): [number, number] => [
  CX + (col - row) * ISO_HW,
  TOP_Y + (col + row) * ISO_HH,
];

/**
 * TRACK_COORDS: 52 main track positions (0-51) as isometric [x, y] pixel centers.
 * Same grid col/row as the original orthogonal layout, now in 2D isometric coords.
 *
 * Safe zones at positions: 0, 8, 13, 21, 26, 34, 39, 47
 */
export const TRACK_COORDS: [number, number][] = [
  // === RED section (0–12) ===
  px(1,  8),  // 0  Red start gate (safe)
  px(0,  8),  // 1
  px(0,  7),  // 2
  px(0,  6),  // 3
  px(1,  6),  // 4
  px(2,  6),  // 5
  px(3,  6),  // 6
  px(4,  6),  // 7
  px(5,  6),  // 8  safe
  px(6,  6),  // 9
  px(6,  5),  // 10
  px(6,  4),  // 11
  px(6,  3),  // 12

  // === BLUE section (13–25) ===
  px(6,  2),  // 13 Blue start gate (safe)
  px(6,  1),  // 14
  px(6,  0),  // 15
  px(7,  0),  // 16
  px(8,  0),  // 17
  px(8,  1),  // 18
  px(8,  2),  // 19
  px(8,  3),  // 20
  px(8,  4),  // 21 safe
  px(8,  5),  // 22
  px(8,  6),  // 23
  px(9,  6),  // 24
  px(10, 6),  // 25

  // === YELLOW section (26–38) ===
  px(11, 6),  // 26 Yellow start gate (safe)
  px(12, 6),  // 27
  px(13, 6),  // 28
  px(13, 7),  // 29
  px(13, 8),  // 30
  px(12, 8),  // 31
  px(11, 8),  // 32
  px(10, 8),  // 33
  px(9,  8),  // 34 safe
  px(8,  8),  // 35
  px(8,  9),  // 36
  px(8,  10), // 37
  px(8,  11), // 38

  // === GREEN section (39–51) ===
  px(8,  12), // 39 Green start gate (safe)
  px(8,  13), // 40
  px(7,  13), // 41
  px(6,  13), // 42
  px(6,  12), // 43
  px(6,  11), // 44
  px(6,  10), // 45
  px(6,  9),  // 46
  px(6,  8),  // 47 safe
  px(5,  8),  // 48
  px(4,  8),  // 49
  px(3,  8),  // 50
  px(2,  8),  // 51
];

/**
 * HOME_COORDS: home stretch positions (52-57) per color, isometric.
 * Index 0 = position 52, index 5 = position 57 (goal center).
 */
export const HOME_COORDS: Record<PlayerColor, [number, number][]> = {
  // Red home lane: rightward along row 7 toward center
  red: [
    px(2, 7),  // 52
    px(3, 7),  // 53
    px(4, 7),  // 54
    px(5, 7),  // 55
    px(6, 7),  // 56
    px(7, 7),  // 57 goal
  ],
  // Blue home lane: downward along col 7 toward center
  blue: [
    px(7, 2),  // 52
    px(7, 3),  // 53
    px(7, 4),  // 54
    px(7, 5),  // 55
    px(7, 6),  // 56
    px(7, 7),  // 57 goal
  ],
  // Yellow home lane: leftward along row 7 toward center
  yellow: [
    px(12, 7), // 52
    px(11, 7), // 53
    px(10, 7), // 54
    px(9,  7), // 55
    px(8,  7), // 56
    px(7,  7), // 57 goal
  ],
  // Green home lane: upward along col 7 toward center
  green: [
    px(7, 12), // 52
    px(7, 11), // 53
    px(7, 10), // 54
    px(7,  9), // 55
    px(7,  8), // 56
    px(7,  7), // 57 goal
  ],
};

/**
 * STABLE_COORDS: piece positions inside stable area (4 pieces per color).
 * Arranged in a 2×2 grid inside each stable corner.
 */
export const STABLE_COORDS: Record<PlayerColor, [number, number][]> = {
  // Red stable: rows 9-14, cols 0-5 → pieces at col 2-3, row 10-11
  red: [
    px(2, 10),
    px(3, 10),
    px(2, 11),
    px(3, 11),
  ],
  // Blue stable: rows 0-5, cols 0-5 → pieces at col 2-3, row 3-4
  blue: [
    px(2, 3),
    px(3, 3),
    px(2, 4),
    px(3, 4),
  ],
  // Yellow stable: rows 0-5, cols 9-14 → pieces at col 11-12, row 3-4
  yellow: [
    px(11, 3),
    px(12, 3),
    px(11, 4),
    px(12, 4),
  ],
  // Green stable: rows 9-14, cols 9-14 → pieces at col 11-12, row 10-11
  green: [
    px(11, 10),
    px(12, 10),
    px(11, 11),
    px(12, 11),
  ],
};

// ─── Stable area diamond polygons ─────────────────────────────────────────────
// In isometric projection, a rectangular grid area [c1..c2]×[r1..r2] becomes
// a rhombus. Vertices are at the 4 extreme corner tile centers, expanded by
// half-tile to fully enclose the edge tile sprites.
function stableDiamond(c1: number, c2: number, r1: number, r2: number): string {
  const top   = px(c1, r1);  // topmost point (min col+row)
  const right = px(c2, r1);  // rightmost point (max col-row)
  const bot   = px(c2, r2);  // bottommost point (max col+row)
  const left  = px(c1, r2);  // leftmost point (min col-row)
  return [
    `${top[0]},${top[1] - ISO_HH}`,
    `${right[0] + ISO_HW},${right[1]}`,
    `${bot[0]},${bot[1] + ISO_HH}`,
    `${left[0] - ISO_HW},${left[1]}`,
  ].join(' ');
}

export const STABLE_DIAMONDS: Record<PlayerColor, string> = {
  red:    stableDiamond(0, 5, 9, 14),
  blue:   stableDiamond(0, 5, 0, 5),
  yellow: stableDiamond(9, 14, 0, 5),
  green:  stableDiamond(9, 14, 9, 14),
};

/** Center goal tile pixel coordinates. */
export const GOAL_PX: [number, number] = px(7, 7);

/** Goal area diamond polygon (center 3×3 cell area). */
export const GOAL_DIAMOND: string = stableDiamond(6, 8, 6, 8);

/**
 * Get pixel coordinates for a piece based on its position.
 * position -1 = in stable, 0-51 = main track, 52-57 = home stretch (57=goal)
 */
export function getPieceCoords(
  position: number,
  color: PlayerColor,
  pieceIndex: number
): [number, number] {
  if (position === -1) return STABLE_COORDS[color][pieceIndex % 4];
  if (position >= 52 && position <= 57) return HOME_COORDS[color][position - 52];
  if (position >= 0 && position <= 51) return TRACK_COORDS[position];
  return STABLE_COORDS[color][pieceIndex % 4];
}

// Safe zone positions set for O(1) lookup
export const SAFE_ZONE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
