/**
 * Rendering Module
 * 
 * Centralized exports for all rendering functions.
 * Import from here to get everything you need.
 * 
 * All rendering functions now accept generic interfaces (EnemyLike, PlayerLike, etc.)
 * to support both local game mode and online multiplayer mode.
 */

// Re-export constants for external use
export * from './constants';

// Re-export primitives
export { drawShadow, drawEyes, drawCyclopsEye, drawHpBar, shouldFlash } from './primitives';

// Re-export grid rendering and interfaces
export {
  drawFloor,
  drawHardWall,
  drawSoftWall,
  drawItem,
  drawGridContent,
  drawGridWalls,
  drawItems,
  createGridAccessor2D,
  createGridAccessorFlat,
  type GridLike,
  type ItemLike,
} from './grid';

// Re-export effects rendering and interfaces
export {
  drawBomb,
  drawBombs,
  drawExplosion,
  drawExplosions,
  type BombLike,
  type ExplosionLike,
} from './effects';

// Re-export enemy rendering and interfaces
export { drawEnemy, drawEnemies, type EnemyLike } from './enemies';

// Re-export player rendering and interfaces
export { drawPlayer, drawPlayers, type PlayerLike } from './players';
