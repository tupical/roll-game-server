// Common interfaces for the game
export enum CellEventType {
  EMPTY = 'EMPTY',
  BONUS_STEPS = 'BONUS_STEPS',
  DEBUFF_STEPS = 'DEBUFF_STEPS',
  ENEMY = 'ENEMY',
}

// Coordinates in the world
export interface WorldCoord {
  x: number;
  y: number;
}

// Direction enum
export enum Direction {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

// Constants
export const VISIBLE_RADIUS = 3; // Visibility radius around player
