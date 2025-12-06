/**
 * Example: How to Add Custom Image Assets
 * 
 * This file demonstrates how to replace the procedural Canvas drawings
 * with actual image assets (sprites, spritesheets, etc.)
 * 
 * USAGE GUIDE:
 * 
 * 1. Place your sprite images in /public/sprites/
 * 2. Define asset definitions (see examples below)
 * 3. Pass them to assetManager.init() before game starts
 * 4. The game will automatically use your sprites instead of shapes!
 */

import { AssetDef, AssetSourceType, AnimationDef } from './types';
import { EnemyType } from '../types';

// ============================================================================
// EXAMPLE: STATIC IMAGES
// ============================================================================

/**
 * Example: Replace an enemy with a static PNG image
 */
export const EXAMPLE_IMAGE_ASSETS: AssetDef[] = [
  // Static image for balloon enemy
  {
    key: 'enemy_balloon',
    sourceType: AssetSourceType.IMAGE,
    url: '/sprites/enemies/balloon.png',
    anchor: { x: 0.5, y: 0.5 }, // Center anchor
  },
  
  // Player 1 sprite
  {
    key: 'player_1',
    sourceType: AssetSourceType.IMAGE,
    url: '/sprites/players/player1.png',
    anchor: { x: 0.5, y: 0.5 },
  },
];

// ============================================================================
// EXAMPLE: SPRITESHEET WITH ANIMATIONS
// ============================================================================

/**
 * Example: Spritesheet for animated character
 * Assumes a 4x4 spritesheet with 16 frames:
 * - Row 0: Walk down (frames 0-3)
 * - Row 1: Walk left (frames 4-7)
 * - Row 2: Walk right (frames 8-11)
 * - Row 3: Walk up (frames 12-15)
 */
export const EXAMPLE_SPRITESHEET_ASSETS: AssetDef[] = [
  {
    key: 'player_1_sheet',
    sourceType: AssetSourceType.SPRITESHEET,
    url: '/sprites/players/player1_sheet.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 16,
    framesPerRow: 4,
    anchor: { x: 0.5, y: 0.5 },
  },
  
  // Bomberman-style character sheet
  {
    key: 'bomberman_sheet',
    sourceType: AssetSourceType.SPRITESHEET,
    url: '/sprites/characters/bomberman.png',
    frameWidth: 48,
    frameHeight: 48,
    framesPerRow: 4,
  },
];

/**
 * Example: Animation definitions for the spritesheet
 */
export const EXAMPLE_ANIMATIONS: AnimationDef[] = [
  {
    key: 'player_1_walk_down',
    assetKey: 'player_1_sheet',
    frames: [0, 1, 2, 3],
    frameRate: 8,
    loop: true,
  },
  {
    key: 'player_1_walk_left',
    assetKey: 'player_1_sheet',
    frames: [4, 5, 6, 7],
    frameRate: 8,
    loop: true,
  },
  {
    key: 'player_1_walk_right',
    assetKey: 'player_1_sheet',
    frames: [8, 9, 10, 11],
    frameRate: 8,
    loop: true,
  },
  {
    key: 'player_1_walk_up',
    assetKey: 'player_1_sheet',
    frames: [12, 13, 14, 15],
    frameRate: 8,
    loop: true,
  },
  {
    key: 'player_1_idle',
    assetKey: 'player_1_sheet',
    frames: [0], // First frame of walk down
    frameRate: 1,
    loop: false,
  },
];

// ============================================================================
// EXAMPLE: SVG ASSETS
// ============================================================================

/**
 * Example: SVG vector graphics
 * Great for resolution-independent sprites
 */
export const EXAMPLE_SVG_ASSETS: AssetDef[] = [
  {
    key: 'bomb_svg',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/bomb.svg',
    width: 32,
    height: 32,
  },
];

// ============================================================================
// EXAMPLE: FULL THEME CONFIGURATION
// ============================================================================

/**
 * Example: Complete theme that maps assets to game entities
 * Use this with assetManager.setTheme() to switch visual styles
 */
export const EXAMPLE_THEME = {
  players: {
    1: {
      idle: 'player_1',
      walkUp: 'player_1_walk_up',
      walkDown: 'player_1_walk_down',
      walkLeft: 'player_1_walk_left',
      walkRight: 'player_1_walk_right',
    },
    2: {
      idle: 'player_2',
      walkUp: 'player_2_walk_up',
      walkDown: 'player_2_walk_down',
      walkLeft: 'player_2_walk_left',
      walkRight: 'player_2_walk_right',
    },
  },
  enemies: {
    [EnemyType.BALLOON]: { idle: 'enemy_balloon' },
    [EnemyType.GHOST]: { idle: 'enemy_ghost' },
    [EnemyType.MINION]: { idle: 'enemy_minion' },
    [EnemyType.FROG]: { idle: 'enemy_frog' },
    [EnemyType.TANK]: { idle: 'enemy_tank' },
    [EnemyType.BOSS_SLIME]: { idle: 'enemy_boss_slime' },
    [EnemyType.BOSS_MECHA]: { idle: 'enemy_boss_mecha' },
  },
  bombs: {
    normal: 'bomb_normal',
    mega: 'bomb_mega',
  },
  explosions: {
    center: 'explosion_center',
    horizontal: 'explosion_h',
    vertical: 'explosion_v',
    endUp: 'explosion_end_up',
    endDown: 'explosion_end_down',
    endLeft: 'explosion_end_left',
    endRight: 'explosion_end_right',
  },
  items: {
    BOMB_UP: 'item_bomb_up',
    RANGE_UP: 'item_range_up',
    SPEED_UP: 'item_speed_up',
    KICK: 'item_kick',
    GHOST: 'item_ghost',
    SHIELD: 'item_shield',
  },
  tiles: {
    floor: 'tile_floor',
    wallHard: 'tile_wall_hard',
    wallSoft: 'tile_wall_soft',
  },
};

// ============================================================================
// HOW TO USE IN YOUR GAME
// ============================================================================

/**
 * Example: Initialize assets before game starts
 * 
 * ```typescript
 * import { assetManager, DEFAULT_CANVAS_ASSETS } from './assets';
 * import { EXAMPLE_IMAGE_ASSETS, EXAMPLE_ANIMATIONS } from './assets/examples';
 * 
 * async function startGame() {
 *   // Combine default Canvas assets with custom image assets
 *   // Image assets with same key will override Canvas assets!
 *   const allAssets = [...DEFAULT_CANVAS_ASSETS, ...EXAMPLE_IMAGE_ASSETS];
 *   
 *   // Show loading screen while assets load
 *   await assetManager.init(allAssets, EXAMPLE_ANIMATIONS, (progress) => {
 *     console.log(`Loading: ${progress.percent}% - ${progress.current}`);
 *     updateLoadingBar(progress.percent);
 *   });
 *   
 *   // Now start the game!
 *   startGameLoop();
 * }
 * ```
 */

/**
 * Example: Drawing an asset in render code
 * 
 * ```typescript
 * import { assetManager } from './assets';
 * 
 * function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
 *   const assetKey = `enemy_${enemy.type.toLowerCase()}`;
 *   assetManager.draw(ctx, assetKey, enemy.x, enemy.y);
 * }
 * ```
 */

/**
 * Example: Using animations
 * 
 * ```typescript
 * import { assetManager, createAnimationState } from './assets';
 * 
 * // Create animation state when entity spawns
 * const playerAnimState = createAnimationState('player_1_walk_down');
 * 
 * // In render loop (pass delta time in ms)
 * function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, deltaMs: number) {
 *   assetManager.drawAnimated(ctx, playerAnimState, player.x, player.y, deltaMs);
 * }
 * ```
 */
