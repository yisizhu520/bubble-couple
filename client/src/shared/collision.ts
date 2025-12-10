/**
 * Collision Detection Module
 * 
 * Unified collision detection logic shared between:
 * - Local game mode (MovementSystem)
 * - Online client prediction (useOnlineGame)
 * - Server-side validation (can be mirrored to server)
 * 
 * Uses abstract interfaces to work with different data structures.
 */

import { TileType } from '../types';
import { GRID_W, GRID_H, TILE_SIZE, PLAYER_SIZE } from '../constants';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Abstract interface for grid tile access.
 * Allows the same collision logic to work with:
 * - 2D array (local mode: grid[y][x])
 * - Flat array (online mode: grid[y * GRID_W + x])
 */
export interface GridAccessor {
  getTile(x: number, y: number): TileType | number;
}

/**
 * Abstract interface for bomb position access.
 */
export interface BombAccessor {
  gridX: number;
  gridY: number;
}

/**
 * Options for collision checking.
 */
export interface CollisionOptions {
  /** Ghost mode: can pass through soft walls */
  canPassSoftWalls?: boolean;
  /** Ghost mode: can pass through bombs */
  canPassBombs?: boolean;
  /** Current entity position for overlap detection */
  currentX?: number;
  currentY?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create GridAccessor from 2D array (local game mode).
 */
export function createGridAccessor2D(grid: number[][]): GridAccessor {
  return {
    getTile: (x: number, y: number) => grid[y]?.[x] ?? TileType.EMPTY
  };
}

/**
 * Create GridAccessor from flat array (online mode).
 */
export function createGridAccessorFlat(grid: number[]): GridAccessor {
  return {
    getTile: (x: number, y: number) => grid[y * GRID_W + x] ?? TileType.EMPTY
  };
}

/**
 * Check if player overlaps with a grid tile.
 */
export function isColliding(px: number, py: number, gridX: number, gridY: number): boolean {
  const tileX = gridX * TILE_SIZE;
  const tileY = gridY * TILE_SIZE;
  return (
    px < tileX + TILE_SIZE &&
    px + PLAYER_SIZE > tileX &&
    py < tileY + TILE_SIZE &&
    py + PLAYER_SIZE > tileY
  );
}

// ============================================================================
// CORE COLLISION DETECTION
// ============================================================================

/**
 * Check if a position is blocked by walls or bombs.
 * 
 * This is the unified collision detection function used by:
 * - Player movement (local mode)
 * - Client-side prediction (online mode)
 * - Enemy movement
 * 
 * @param nx - New X position (pixel coordinates)
 * @param ny - New Y position (pixel coordinates)
 * @param grid - Grid accessor for tile lookup
 * @param bombs - Array of bomb positions
 * @param options - Collision options (ghost mode, current position)
 * @returns true if position is blocked
 */
export function isBlocked(
  nx: number,
  ny: number,
  grid: GridAccessor,
  bombs: BombAccessor[],
  options: CollisionOptions = {}
): boolean {
  const { canPassSoftWalls = false, canPassBombs = false, currentX, currentY } = options;
  const epsilon = 0.1;
  
  // Check all four corners of the entity hitbox
  const corners = [
    { x: nx, y: ny },
    { x: nx + PLAYER_SIZE - epsilon, y: ny },
    { x: nx, y: ny + PLAYER_SIZE - epsilon },
    { x: nx + PLAYER_SIZE - epsilon, y: ny + PLAYER_SIZE - epsilon },
  ];

  for (const c of corners) {
    const gx = Math.floor(c.x / TILE_SIZE);
    const gy = Math.floor(c.y / TILE_SIZE);

    // Boundary check
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return true;

    const tile = grid.getTile(gx, gy);
    
    // Hard walls always block
    if (tile === TileType.WALL_HARD) return true;
    
    // Soft walls block unless ghost mode
    if (tile === TileType.WALL_SOFT && !canPassSoftWalls) return true;

    // Bomb collision (unless ghost mode)
    if (!canPassBombs) {
      const bomb = bombs.find(b => b.gridX === gx && b.gridY === gy);
      if (bomb) {
        // Allow moving out of a bomb you're standing on
        if (currentX !== undefined && currentY !== undefined) {
          if (isColliding(currentX, currentY, gx, gy)) {
            continue; // Currently overlapping bomb, allow movement
          }
        }
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if an entity is blocked (simplified version for enemies).
 * Does not handle bomb overlap or kick mechanics.
 */
export function isEntityBlocked(
  nx: number,
  ny: number,
  grid: GridAccessor,
  bombs: BombAccessor[],
  ghostMode: boolean = false
): boolean {
  return isBlocked(nx, ny, grid, bombs, {
    canPassSoftWalls: ghostMode,
    canPassBombs: ghostMode,
  });
}
