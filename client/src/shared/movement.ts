/**
 * Movement Module
 * 
 * Unified movement algorithms shared between:
 * - Local game mode (MovementSystem)
 * - Online client prediction (useOnlineGame)
 * 
 * Includes corner sliding for smooth navigation.
 */

import { TILE_SIZE, PLAYER_SIZE, CORNER_TOLERANCE } from '../constants';
import { isBlocked, GridAccessor, BombAccessor, CollisionOptions } from './collision';

// ============================================================================
// CORNER SLIDING
// ============================================================================

/**
 * Try to apply corner sliding correction when movement is blocked.
 * 
 * Corner sliding allows players to smoothly navigate around obstacles
 * when they're almost aligned with a passage.
 * 
 * @param currentX - Current X position
 * @param currentY - Current Y position
 * @param axis - Which axis we're trying to move on ('x' or 'y')
 * @param speed - Movement speed for correction
 * @param grid - Grid accessor
 * @param bombs - Bomb positions
 * @param options - Collision options
 * @returns Correction amount (0 if no sliding possible)
 */
export function tryCornerSlide(
  currentX: number,
  currentY: number,
  axis: 'x' | 'y',
  speed: number,
  grid: GridAccessor,
  bombs: BombAccessor[],
  options: CollisionOptions = {}
): number {
  if (axis === 'x') {
    // Trying to move horizontally but blocked - check vertical alignment
    const centerY = currentY + PLAYER_SIZE / 2;
    const tileY = Math.floor(centerY / TILE_SIZE);
    const tileCenterY = tileY * TILE_SIZE + TILE_SIZE / 2;
    const diff = centerY - tileCenterY;

    if (Math.abs(diff) <= CORNER_TOLERANCE && Math.abs(diff) > 0) {
      const dir = diff > 0 ? -1 : 1;
      const correction = dir * speed;
      if (!isBlocked(currentX, currentY + correction, grid, bombs, options)) {
        return correction;
      }
    }
  } else {
    // Trying to move vertically but blocked - check horizontal alignment
    const centerX = currentX + PLAYER_SIZE / 2;
    const tileX = Math.floor(centerX / TILE_SIZE);
    const tileCenterX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const diff = centerX - tileCenterX;

    if (Math.abs(diff) <= CORNER_TOLERANCE && Math.abs(diff) > 0) {
      const dir = diff > 0 ? -1 : 1;
      const correction = dir * speed;
      if (!isBlocked(currentX + correction, currentY, grid, bombs, options)) {
        return correction;
      }
    }
  }

  return 0;
}

// ============================================================================
// MOVEMENT PREDICTION
// ============================================================================

/**
 * Predict movement with collision detection and corner sliding.
 * 
 * Used by online mode for client-side prediction.
 * 
 * @param currentX - Current X position
 * @param currentY - Current Y position
 * @param dx - Desired X movement
 * @param dy - Desired Y movement
 * @param speed - Movement speed (for corner sliding)
 * @param grid - Grid accessor
 * @param bombs - Bomb positions
 * @param ghostMode - Whether entity can pass through walls/bombs
 * @returns New position after movement
 */
export function predictMove(
  currentX: number,
  currentY: number,
  dx: number,
  dy: number,
  speed: number,
  grid: GridAccessor,
  bombs: BombAccessor[],
  ghostMode: boolean = false
): { x: number; y: number } {
  const options: CollisionOptions = {
    canPassSoftWalls: ghostMode,
    canPassBombs: ghostMode,
    currentX,
    currentY,
  };

  let newX = currentX;
  let newY = currentY;

  // Move on X axis
  if (dx !== 0) {
    if (!isBlocked(currentX + dx, currentY, grid, bombs, options)) {
      newX = currentX + dx;
    } else {
      // Try corner sliding
      const correction = tryCornerSlide(currentX, currentY, 'x', speed, grid, bombs, options);
      if (correction !== 0) {
        newY = currentY + correction;
      }
    }
  }

  // Update options for Y movement (X might have changed)
  options.currentX = newX;

  // Move on Y axis
  if (dy !== 0) {
    if (!isBlocked(newX, currentY + dy, grid, bombs, options)) {
      newY = currentY + dy;
    } else {
      // Try corner sliding
      const correction = tryCornerSlide(newX, currentY, 'y', speed, grid, bombs, options);
      if (correction !== 0) {
        newX = newX + correction;
      }
    }
  }

  return { x: newX, y: newY };
}
