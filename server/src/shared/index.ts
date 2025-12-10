/**
 * Shared Game Logic Module (Server)
 * 
 * Mirror of client/src/shared for server-side use.
 * Contains pure game logic functions.
 */

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
  type BombLike,
  type DirectionString,
  type CollisionChecker,
} from './enemyAI';
