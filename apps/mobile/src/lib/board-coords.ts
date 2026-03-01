import { PlayerColor } from '../types/game';

const C = 40; // cell size in pixels

// Track positions [x, y] for 52 main board positions
// Board is 600x600 SVG (scaled to fit screen)
export const TRACK_COORDS: [number, number][] = [
  // Pos 0-12: Red section
  [C * 1 + C / 2, C * 13 + C / 2],
  [C * 1 + C / 2, C * 12 + C / 2],
  [C * 1 + C / 2, C * 11 + C / 2],
  [C * 1 + C / 2, C * 10 + C / 2],
  [C * 1 + C / 2, C * 9 + C / 2],
  [C * 1 + C / 2, C * 8 + C / 2],
  [C * 1 + C / 2, C * 7 + C / 2],
  [C * 2 + C / 2, C * 6 + C / 2],
  [C * 3 + C / 2, C * 6 + C / 2],
  [C * 4 + C / 2, C * 6 + C / 2],
  [C * 5 + C / 2, C * 6 + C / 2],
  [C * 6 + C / 2, C * 6 + C / 2],
  [C * 6 + C / 2, C * 5 + C / 2],
  // Pos 13-25: Blue section
  [C * 6 + C / 2, C * 1 + C / 2],
  [C * 7 + C / 2, C * 1 + C / 2],
  [C * 8 + C / 2, C * 1 + C / 2],
  [C * 8 + C / 2, C * 2 + C / 2],
  [C * 8 + C / 2, C * 3 + C / 2],
  [C * 8 + C / 2, C * 4 + C / 2],
  [C * 8 + C / 2, C * 5 + C / 2],
  [C * 8 + C / 2, C * 6 + C / 2],
  [C * 9 + C / 2, C * 6 + C / 2],
  [C * 10 + C / 2, C * 6 + C / 2],
  [C * 11 + C / 2, C * 6 + C / 2],
  [C * 12 + C / 2, C * 6 + C / 2],
  [C * 13 + C / 2, C * 6 + C / 2],
  // Pos 26-38: Yellow section
  [C * 13 + C / 2, C * 7 + C / 2],
  [C * 13 + C / 2, C * 8 + C / 2],
  [C * 13 + C / 2, C * 9 + C / 2],
  [C * 13 + C / 2, C * 10 + C / 2],
  [C * 13 + C / 2, C * 11 + C / 2],
  [C * 13 + C / 2, C * 12 + C / 2],
  [C * 13 + C / 2, C * 13 + C / 2],
  [C * 12 + C / 2, C * 8 + C / 2],
  [C * 11 + C / 2, C * 8 + C / 2],
  [C * 10 + C / 2, C * 8 + C / 2],
  [C * 9 + C / 2, C * 8 + C / 2],
  [C * 8 + C / 2, C * 8 + C / 2],
  [C * 8 + C / 2, C * 9 + C / 2],
  // Pos 39-51: Green section
  [C * 8 + C / 2, C * 13 + C / 2],
  [C * 7 + C / 2, C * 13 + C / 2],
  [C * 6 + C / 2, C * 13 + C / 2],
  [C * 6 + C / 2, C * 12 + C / 2],
  [C * 6 + C / 2, C * 11 + C / 2],
  [C * 6 + C / 2, C * 10 + C / 2],
  [C * 6 + C / 2, C * 9 + C / 2],
  [C * 6 + C / 2, C * 8 + C / 2],
  [C * 5 + C / 2, C * 8 + C / 2],
  [C * 4 + C / 2, C * 8 + C / 2],
  [C * 3 + C / 2, C * 8 + C / 2],
  [C * 2 + C / 2, C * 8 + C / 2],
  [C * 1 + C / 2, C * 8 + C / 2],
];

// Home stretch positions [x, y] for each color (indices 0-5 = positions 52-57)
export const HOME_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [
    [C * 2 + C / 2, C * 7 + C / 2],
    [C * 3 + C / 2, C * 7 + C / 2],
    [C * 4 + C / 2, C * 7 + C / 2],
    [C * 5 + C / 2, C * 7 + C / 2],
    [C * 6 + C / 2, C * 7 + C / 2],
    [C * 7 + C / 2, C * 7 + C / 2],
  ],
  blue: [
    [C * 7 + C / 2, C * 2 + C / 2],
    [C * 7 + C / 2, C * 3 + C / 2],
    [C * 7 + C / 2, C * 4 + C / 2],
    [C * 7 + C / 2, C * 5 + C / 2],
    [C * 7 + C / 2, C * 6 + C / 2],
    [C * 7 + C / 2, C * 7 + C / 2],
  ],
  yellow: [
    [C * 12 + C / 2, C * 7 + C / 2],
    [C * 11 + C / 2, C * 7 + C / 2],
    [C * 10 + C / 2, C * 7 + C / 2],
    [C * 9 + C / 2, C * 7 + C / 2],
    [C * 8 + C / 2, C * 7 + C / 2],
    [C * 7 + C / 2, C * 7 + C / 2],
  ],
  green: [
    [C * 7 + C / 2, C * 12 + C / 2],
    [C * 7 + C / 2, C * 11 + C / 2],
    [C * 7 + C / 2, C * 10 + C / 2],
    [C * 7 + C / 2, C * 9 + C / 2],
    [C * 7 + C / 2, C * 8 + C / 2],
    [C * 7 + C / 2, C * 7 + C / 2],
  ],
};

// Stable positions for each piece in stable area
export const STABLE_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [
    [C * 2 + C / 2, C * 11 + C / 2],
    [C * 3 + C / 2, C * 11 + C / 2],
    [C * 2 + C / 2, C * 12 + C / 2],
    [C * 3 + C / 2, C * 12 + C / 2],
  ],
  blue: [
    [C * 2 + C / 2, C * 2 + C / 2],
    [C * 3 + C / 2, C * 2 + C / 2],
    [C * 2 + C / 2, C * 3 + C / 2],
    [C * 3 + C / 2, C * 3 + C / 2],
  ],
  yellow: [
    [C * 11 + C / 2, C * 11 + C / 2],
    [C * 12 + C / 2, C * 11 + C / 2],
    [C * 11 + C / 2, C * 12 + C / 2],
    [C * 12 + C / 2, C * 12 + C / 2],
  ],
  green: [
    [C * 11 + C / 2, C * 2 + C / 2],
    [C * 12 + C / 2, C * 2 + C / 2],
    [C * 11 + C / 2, C * 3 + C / 2],
    [C * 12 + C / 2, C * 3 + C / 2],
  ],
};

export const CELL_SIZE = C;
export const BOARD_VIRTUAL_SIZE = 600;

/**
 * Get the SVG coordinates for a piece given its position and color.
 * position -1 means in stable (not yet entered).
 * position 52-57 means in home stretch.
 * position 0-51 means on main track.
 */
export function getPieceCoords(
  position: number,
  color: PlayerColor,
  pieceIndex: number
): [number, number] {
  if (position === -1) {
    // In stable area
    return STABLE_COORDS[color][pieceIndex] ?? [0, 0];
  }
  if (position >= 52) {
    // Home stretch: index 0-5
    const homeIndex = position - 52;
    return HOME_COORDS[color][homeIndex] ?? HOME_COORDS[color][5];
  }
  // Main track
  return TRACK_COORDS[position] ?? [0, 0];
}
