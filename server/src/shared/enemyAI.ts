/**
 * Enemy AI Core Algorithms (Server Mirror)
 * 
 * This is a mirror of client/src/shared/enemyAI.ts for server-side use.
 * Keep in sync with the client version.
 * 
 * Pure AI logic functions for server-side enemy behavior.
 */

import { PLAYER_SIZE, TILE_SIZE, GRID_W, GRID_H } from '../utils/constants';

// ============================================================================
// AI CONFIGURATION
// ============================================================================

export const AI_CONFIG = {
  RANDOM_DIR_INTERVAL: { min: 2000, max: 4000 },
  CHASE_RECALC_INTERVAL: 100,
  CHASE_STUCK_ESCAPE_TIME: 300,
  BOSS_SLIME_SPAWN_COOLDOWN: 4000,
  BOSS_MECHA_BOMB_COOLDOWN: 5000,
  BOSS_MECHA_BOMB_RANGE: 5,
  BOSS_MECHA_BOMB_TIMER: 4000,
  BOSS_MECHA_DODGE_THRESHOLD: 2000,
  MAX_MINIONS: 8,
} as const;

// ============================================================================
// INTERFACES
// ============================================================================

/** Generic position interface */
export interface Position {
  x: number;
  y: number;
}

/** Generic entity with position and speed */
export interface EntityLike extends Position {
  speed: number;
}

/** Generic bomb for danger calculation */
export interface BombLike {
  gridX: number;
  gridY: number;
  range: number;
  timer: number;
}

/** Direction as string (server uses string directions) */
export type DirectionString = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

/** Collision checker function type */
export type CollisionChecker = (nx: number, ny: number, entity: EntityLike) => boolean;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get grid coordinates from pixel position.
 */
export function getGridPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.floor((x + PLAYER_SIZE / 2) / TILE_SIZE),
    y: Math.floor((y + PLAYER_SIZE / 2) / TILE_SIZE),
  };
}

/**
 * Generate a random direction.
 */
export function randomDirection(): DirectionString {
  const dirs: DirectionString[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

/**
 * Generate a random interval within the configured range.
 */
export function randomDirInterval(): number {
  return AI_CONFIG.RANDOM_DIR_INTERVAL.min +
    Math.random() * (AI_CONFIG.RANDOM_DIR_INTERVAL.max - AI_CONFIG.RANDOM_DIR_INTERVAL.min);
}

// ============================================================================
// TARGETING
// ============================================================================

/**
 * Find the nearest valid entity from a list.
 * Returns null if no valid targets exist.
 */
export function findNearestTarget<T extends Position>(
  from: Position,
  targets: T[],
  isValidTarget: (t: T) => boolean
): T | null {
  let nearest: T | null = null;
  let minDist = Infinity;

  for (const target of targets) {
    if (!isValidTarget(target)) continue;
    
    const dist = Math.hypot(target.x - from.x, target.y - from.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = target;
    }
  }

  return nearest;
}

// ============================================================================
// DANGER ASSESSMENT
// ============================================================================

/**
 * Calculate danger level at a grid position based on bombs.
 * Higher value = more dangerous (0 = safe).
 */
export function getDangerLevel(gridX: number, gridY: number, bombs: BombLike[]): number {
  let maxDanger = 0;

  for (const bomb of bombs) {
    // Standing on bomb
    if (bomb.gridX === gridX && bomb.gridY === gridY) {
      const danger = AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD - bomb.timer + 1000;
      maxDanger = Math.max(maxDanger, danger);
      continue;
    }

    // In horizontal blast range
    if (bomb.gridY === gridY && Math.abs(bomb.gridX - gridX) <= bomb.range) {
      const danger = AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD - bomb.timer + 1000;
      maxDanger = Math.max(maxDanger, danger);
    }

    // In vertical blast range
    if (bomb.gridX === gridX && Math.abs(bomb.gridY - gridY) <= bomb.range) {
      const danger = AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD - bomb.timer + 1000;
      maxDanger = Math.max(maxDanger, danger);
    }
  }

  return maxDanger;
}

/**
 * Check if entity is in immediate danger (bomb about to explode).
 */
export function isInDanger(entity: Position, bombs: BombLike[]): boolean {
  const grid = getGridPosition(entity.x, entity.y);

  for (const bomb of bombs) {
    if (bomb.timer > AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD) continue;

    if (bomb.gridX === grid.x && bomb.gridY === grid.y) return true;
    if (bomb.gridY === grid.y && Math.abs(bomb.gridX - grid.x) <= bomb.range) return true;
    if (bomb.gridX === grid.x && Math.abs(bomb.gridY - grid.y) <= bomb.range) return true;
  }

  return false;
}

// ============================================================================
// DIRECTION DECISION
// ============================================================================

interface DirectionInfo {
  dir: DirectionString;
  danger: number;
  blocked: boolean;
  priority: number;
}

/**
 * Calculate the best dodge direction to escape from bombs.
 * Returns null if current position is safe or no escape route exists.
 */
export function getDodgeDirection(
  entity: EntityLike,
  bombs: BombLike[],
  isBlocked: CollisionChecker
): DirectionString | null {
  const currentGrid = getGridPosition(entity.x, entity.y);
  const currentDanger = getDangerLevel(currentGrid.x, currentGrid.y, bombs);

  if (currentDanger <= 0) return null;

  const directions: DirectionInfo[] = [
    { dir: 'UP', danger: 0, blocked: false, priority: 0 },
    { dir: 'DOWN', danger: 0, blocked: false, priority: 0 },
    { dir: 'LEFT', danger: 0, blocked: false, priority: 0 },
    { dir: 'RIGHT', danger: 0, blocked: false, priority: 0 },
  ];

  for (const d of directions) {
    let targetGridX = currentGrid.x;
    let targetGridY = currentGrid.y;
    let dx = 0, dy = 0;

    switch (d.dir) {
      case 'UP': dy = -entity.speed; targetGridY--; break;
      case 'DOWN': dy = entity.speed; targetGridY++; break;
      case 'LEFT': dx = -entity.speed; targetGridX--; break;
      case 'RIGHT': dx = entity.speed; targetGridX++; break;
    }

    d.blocked = isBlocked(entity.x + dx, entity.y + dy, entity);

    if (!d.blocked && targetGridX >= 0 && targetGridX < GRID_W &&
        targetGridY >= 0 && targetGridY < GRID_H) {
      d.danger = getDangerLevel(targetGridX, targetGridY, bombs);
    } else {
      d.danger = Infinity;
    }
  }

  directions.sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    return a.danger - b.danger;
  });

  const best = directions[0];

  if (!best.blocked && best.danger < currentDanger) {
    return best.dir;
  }

  const unblocked = directions.filter(d => !d.blocked);
  if (unblocked.length > 0) {
    return unblocked[0].dir;
  }

  return null;
}

/**
 * Calculate the best direction to chase a target.
 * Uses intelligent pathfinding that avoids obstacles.
 */
export function getChaseDirection(
  entity: EntityLike,
  target: Position,
  isBlocked: CollisionChecker
): DirectionString {
  const diffX = target.x - entity.x;
  const diffY = target.y - entity.y;

  const directions: DirectionInfo[] = [
    { dir: 'UP', priority: diffY < 0 ? Math.abs(diffY) : -1, blocked: false, danger: 0 },
    { dir: 'DOWN', priority: diffY > 0 ? Math.abs(diffY) : -1, blocked: false, danger: 0 },
    { dir: 'LEFT', priority: diffX < 0 ? Math.abs(diffX) : -1, blocked: false, danger: 0 },
    { dir: 'RIGHT', priority: diffX > 0 ? Math.abs(diffX) : -1, blocked: false, danger: 0 },
  ];

  for (const d of directions) {
    let dx = 0, dy = 0;
    switch (d.dir) {
      case 'UP': dy = -entity.speed; break;
      case 'DOWN': dy = entity.speed; break;
      case 'LEFT': dx = -entity.speed; break;
      case 'RIGHT': dx = entity.speed; break;
    }
    d.blocked = isBlocked(entity.x + dx, entity.y + dy, entity);
  }

  directions.sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    return b.priority - a.priority;
  });

  const best = directions[0];
  if (best.blocked) {
    const unblocked = directions.filter(d => !d.blocked);
    if (unblocked.length > 0) {
      return unblocked[Math.floor(Math.random() * unblocked.length)].dir;
    }
  }

  return best.dir;
}

/**
 * Simple chase direction (just picks direction toward target).
 * For basic enemy AI without obstacle avoidance.
 */
export function getSimpleChaseDirection(entity: Position, target: Position): DirectionString {
  const diffX = target.x - entity.x;
  const diffY = target.y - entity.y;

  if (Math.abs(diffX) > Math.abs(diffY)) {
    return diffX > 0 ? 'RIGHT' : 'LEFT';
  } else {
    return diffY > 0 ? 'DOWN' : 'UP';
  }
}
