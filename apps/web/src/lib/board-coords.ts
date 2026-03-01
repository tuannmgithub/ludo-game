import type { PlayerColor } from '@/types/game';

export const CELL_SIZE = 40;
export const BOARD_SIZE_PX = 600; // 15 * 40

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

// Helper to compute pixel center from grid column/row
const px = (col: number, row: number): [number, number] => [
  col * CELL_SIZE + CELL_SIZE / 2,
  row * CELL_SIZE + CELL_SIZE / 2,
];

/**
 * TRACK_COORDS: 52 main track positions (0-51) as [x, y] pixel centers.
 *
 * Layout on a 15x15 grid (col 0-14, row 0-14):
 *
 * Stable corners (NOT part of track):
 *   Red stable:    rows 9-14, cols 0-5
 *   Blue stable:   rows 0-5,  cols 0-5
 *   Yellow stable: rows 0-5,  cols 9-14
 *   Green stable:  rows 9-14, cols 9-14
 *
 * Cross arms (track runs through these):
 *   Left arm:   rows 6-8, cols 0-5   (row 7 = Red home lane)
 *   Top arm:    rows 0-5, cols 6-8   (col 7 = Blue home lane)
 *   Right arm:  rows 6-8, cols 9-14  (row 7 = Yellow home lane)
 *   Bottom arm: rows 9-14, cols 6-8  (col 7 = Green home lane)
 *
 * Track path (counter-clockwise):
 *   Red   (0-12):  gate(1,8) → left edge col0 rows8→6 → top row6 cols0→5 → center col6 rows6→3
 *   Blue  (13-25): gate(6,2) → left col6 rows2→0 → top row0 cols6→8 → right col8 rows0→6 → center row6 cols8→10
 *   Yellow(26-38): gate(11,6) → top row6 cols11→13 → right col13 rows6→8 → bottom row8 cols13→8 → center col8 rows8→11
 *   Green (39-51): gate(8,12) → right col8 rows12→13 → bottom row13 cols8→6 → left col6 rows13→8 → bottom row8 cols6→2
 *
 * Safe zones at positions: 0, 8, 13, 21, 26, 34, 39, 47
 */
export const TRACK_COORDS: [number, number][] = [
  // === RED section (0–12): left arm, going left then up then right toward center ===
  px(1,  8),  // 0  Red start gate (safe) — exits stable upward into left arm
  px(0,  8),  // 1
  px(0,  7),  // 2  corner
  px(0,  6),  // 3
  px(1,  6),  // 4
  px(2,  6),  // 5
  px(3,  6),  // 6
  px(4,  6),  // 7
  px(5,  6),  // 8  safe zone
  px(6,  6),  // 9  enter center-top
  px(6,  5),  // 10
  px(6,  4),  // 11
  px(6,  3),  // 12

  // === BLUE section (13–25): top arm, going up then right then down toward center ===
  px(6,  2),  // 13 Blue start gate (safe) — exits stable rightward into top arm
  px(6,  1),  // 14
  px(6,  0),  // 15 top-left corner
  px(7,  0),  // 16
  px(8,  0),  // 17 top-right corner
  px(8,  1),  // 18
  px(8,  2),  // 19
  px(8,  3),  // 20
  px(8,  4),  // 21 safe zone
  px(8,  5),  // 22
  px(8,  6),  // 23 enter center
  px(9,  6),  // 24
  px(10, 6),  // 25

  // === YELLOW section (26–38): right arm, going right then down then left toward center ===
  px(11, 6),  // 26 Yellow start gate (safe) — exits stable downward into right arm
  px(12, 6),  // 27
  px(13, 6),  // 28 top-right corner
  px(13, 7),  // 29
  px(13, 8),  // 30 bottom-right corner
  px(12, 8),  // 31
  px(11, 8),  // 32
  px(10, 8),  // 33
  px(9,  8),  // 34 safe zone
  px(8,  8),  // 35 enter center-bottom
  px(8,  9),  // 36
  px(8,  10), // 37
  px(8,  11), // 38

  // === GREEN section (39–51): bottom arm, going down then left then up into left arm ===
  px(8,  12), // 39 Green start gate (safe) — exits stable leftward into bottom arm
  px(8,  13), // 40
  px(7,  13), // 41 bottom row
  px(6,  13), // 42 bottom-left corner
  px(6,  12), // 43
  px(6,  11), // 44
  px(6,  10), // 45
  px(6,  9),  // 46
  px(6,  8),  // 47 safe zone — enters bottom of left arm
  px(5,  8),  // 48
  px(4,  8),  // 49
  px(3,  8),  // 50
  px(2,  8),  // 51 last track square before Red home entry
];

/**
 * HOME_COORDS: Home stretch positions (52-57) for each color.
 * Position 52 = first step into home lane
 * Position 57 = goal (center)
 * Index 0 = position 52, index 5 = position 57
 */
export const HOME_COORDS: Record<PlayerColor, [number, number][]> = {
  // Red home stretch goes rightward along row 7 toward center
  red: [
    px(2, 7),  // 52
    px(3, 7),  // 53
    px(4, 7),  // 54
    px(5, 7),  // 55
    px(6, 7),  // 56
    px(7, 7),  // 57 goal (center)
  ],
  // Blue home stretch goes downward along col 7 toward center
  blue: [
    px(7, 2),  // 52
    px(7, 3),  // 53
    px(7, 4),  // 54
    px(7, 5),  // 55
    px(7, 6),  // 56
    px(7, 7),  // 57 goal
  ],
  // Yellow home stretch goes leftward along row 7 toward center
  yellow: [
    px(12, 7), // 52
    px(11, 7), // 53
    px(10, 7), // 54
    px(9, 7),  // 55
    px(8, 7),  // 56
    px(7, 7),  // 57 goal
  ],
  // Green home stretch goes upward along col 7 toward center
  green: [
    px(7, 12), // 52
    px(7, 11), // 53
    px(7, 10), // 54
    px(7, 9),  // 55
    px(7, 8),  // 56
    px(7, 7),  // 57 goal
  ],
};

/**
 * STABLE_COORDS: Starting positions for pieces in their stable (home base).
 * 4 pieces per color, arranged in a 2x2 grid inside their stable area.
 */
export const STABLE_COORDS: Record<PlayerColor, [number, number][]> = {
  // Red stable: rows 9-14, cols 0-5 → center the 4 pieces around col 2-3, row 10-11
  red: [
    px(2, 10), // piece 0
    px(3, 10), // piece 1
    px(2, 11), // piece 2
    px(3, 11), // piece 3
  ],
  // Blue stable: rows 0-5, cols 0-5 → center around col 2-3, row 3-4
  blue: [
    px(2, 3),  // piece 0
    px(3, 3),  // piece 1
    px(2, 4),  // piece 2
    px(3, 4),  // piece 3
  ],
  // Yellow stable: rows 0-5, cols 9-14 → center around col 11-12, row 3-4
  yellow: [
    px(11, 3), // piece 0
    px(12, 3), // piece 1
    px(11, 4), // piece 2
    px(12, 4), // piece 3
  ],
  // Green stable: rows 9-14, cols 9-14 → center around col 11-12, row 10-11
  green: [
    px(11, 10),// piece 0
    px(12, 10),// piece 1
    px(11, 11),// piece 2
    px(12, 11),// piece 3
  ],
};

/**
 * Stable area bounding boxes [x, y, width, height] for each color.
 */
export const STABLE_BOUNDS: Record<PlayerColor, [number, number, number, number]> = {
  red:    [0,   9 * CELL_SIZE, 6 * CELL_SIZE, 6 * CELL_SIZE],
  blue:   [0,   0,             6 * CELL_SIZE, 6 * CELL_SIZE],
  yellow: [9 * CELL_SIZE, 0,  6 * CELL_SIZE, 6 * CELL_SIZE],
  green:  [9 * CELL_SIZE, 9 * CELL_SIZE, 6 * CELL_SIZE, 6 * CELL_SIZE],
};

/**
 * Get pixel coordinates for a piece based on its position.
 * position -1 = in stable (use stableIndex for exact spot)
 * position 0-51 = main track
 * position 52-57 = home stretch
 */
export function getPieceCoords(
  position: number,
  color: PlayerColor,
  pieceIndex: number
): [number, number] {
  if (position === -1) {
    // In stable
    return STABLE_COORDS[color][pieceIndex % 4];
  }
  if (position >= 52 && position <= 57) {
    // Home stretch
    const homeIndex = position - 52;
    return HOME_COORDS[color][homeIndex];
  }
  if (position >= 0 && position <= 51) {
    return TRACK_COORDS[position];
  }
  // Fallback
  return STABLE_COORDS[color][pieceIndex % 4];
}

// Safe zone positions set for O(1) lookup
export const SAFE_ZONE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
