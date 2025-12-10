/**
 * Shared Game Logic Module
 * 
 * Pure game logic functions that can be shared between:
 * - Local game mode (client)
 * - Online client prediction
 * - Server-side validation (mirror to server/src/shared/)
 * 
 * All functions are framework-agnostic (no React, no Colyseus dependencies).
 */

// Collision detection
export {
  isBlocked,
  isEntityBlocked,
  isColliding,
  createGridAccessor2D,
  createGridAccessorFlat,
  type GridAccessor,
  type BombAccessor,
  type CollisionOptions,
} from './collision';

// Movement algorithms
export {
  tryCornerSlide,
  predictMove,
} from './movement';

// Enemy AI algorithms
export {
  AI_CONFIG,
  getGridPosition,
  randomDirection,
  randomDirInterval,
  findNearestTarget,
  getDangerLevel,
  isInDanger,
  getDodgeDirection,
  getChaseDirection,
  getSimpleChaseDirection,
  type Position,
  type EntityLike,
  type BombLike as AIBombLike,
  type DirectionString,
  type CollisionChecker,
} from './enemyAI';
