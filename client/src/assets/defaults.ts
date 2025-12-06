/**
 * Default Canvas Assets
 * 
 * Wraps the current procedural Canvas drawing into the asset system.
 * This provides backward compatibility - the game works exactly as before
 * if no images are loaded.
 * 
 * When image assets are available, they can replace these procedural assets.
 */

import { PLAYER_SIZE } from '../constants';
import { EnemyType, ItemType } from '../types';
import { AssetDef, AssetSourceType, CanvasAssetDef } from './types';
import {
  COLORS,
  ENEMY_COLORS,
  ITEM_COLORS,
  ITEM_ICONS,
  BOSS_SCALE,
  EYE_OFFSET_X,
  EYE_OFFSET_Y,
  EYE_RADIUS,
  PUPIL_RADIUS,
  HP_BAR_WIDTH,
  HP_BAR_HEIGHT,
  ITEM_RADIUS,
} from '../rendering/constants';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.fillStyle = COLORS.SHADOW;
  ctx.beginPath();
  ctx.ellipse(cx, cy + size / 2, size / 2, size / 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Eye whites
  ctx.fillStyle = COLORS.WHITE;
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X, cy - EYE_OFFSET_Y, EYE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X, cy - EYE_OFFSET_Y, EYE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Pupils
  ctx.fillStyle = COLORS.BLACK;
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X, cy - EYE_OFFSET_Y, PUPIL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X, cy - EYE_OFFSET_Y, PUPIL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawCyclopsEye(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = COLORS.WHITE;
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = COLORS.BLACK;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================================
// ENEMY CANVAS ASSETS
// ============================================================================

const balloonAsset: CanvasAssetDef = {
  key: 'enemy_balloon',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    drawShadow(ctx, x, y, PLAYER_SIZE);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.BALLOON];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    drawEyes(ctx, x, y);
  },
};

const ghostAsset: CanvasAssetDef = {
  key: 'enemy_ghost',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    drawShadow(ctx, x, y, PLAYER_SIZE);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.GHOST];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y - 4, PLAYER_SIZE / 2 - 2, Math.PI, 0);
    ctx.lineTo(x + PLAYER_SIZE / 2 - 2, y + PLAYER_SIZE / 2);
    ctx.lineTo(x, y + PLAYER_SIZE / 2 - 4);
    ctx.lineTo(x - PLAYER_SIZE / 2 + 2, y + PLAYER_SIZE / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Smaller ghost eyes
    ctx.fillStyle = COLORS.WHITE;
    ctx.beginPath();
    ctx.arc(x - EYE_OFFSET_X, y - EYE_OFFSET_Y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + EYE_OFFSET_X, y - EYE_OFFSET_Y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },
};

const minionAsset: CanvasAssetDef = {
  key: 'enemy_minion',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    drawShadow(ctx, x, y, PLAYER_SIZE);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.MINION];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    drawCyclopsEye(ctx, x, y);
  },
};

const frogAsset: CanvasAssetDef = {
  key: 'enemy_frog',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    drawShadow(ctx, x, y, PLAYER_SIZE);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.FROG];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    
    // Body ellipse
    ctx.beginPath();
    ctx.ellipse(x, y, PLAYER_SIZE / 2, PLAYER_SIZE / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Bulging eyes
    ctx.beginPath();
    ctx.arc(x - 8, y - 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 8, y - 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },
};

const tankAsset: CanvasAssetDef = {
  key: 'enemy_tank',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    drawShadow(ctx, x, y, PLAYER_SIZE);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.TANK];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    
    // Square body
    ctx.fillRect(x - PLAYER_SIZE / 2, y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    ctx.strokeRect(x - PLAYER_SIZE / 2, y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    
    // Treads
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(x - PLAYER_SIZE / 2 - 4, y - PLAYER_SIZE / 2, 6, PLAYER_SIZE);
    ctx.fillRect(x + PLAYER_SIZE / 2 - 2, y - PLAYER_SIZE / 2, 6, PLAYER_SIZE);
  },
};

const bossSlimeAsset: CanvasAssetDef = {
  key: 'enemy_boss_slime',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    const sz = PLAYER_SIZE * BOSS_SCALE;
    drawShadow(ctx, x, y, sz);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.BOSS_SLIME];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, sz / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Crown
    ctx.fillStyle = COLORS.BOSS_CROWN;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - sz / 2);
    ctx.lineTo(x - 6, y - sz / 2 - 14);
    ctx.lineTo(x, y - sz / 2);
    ctx.lineTo(x + 6, y - sz / 2 - 14);
    ctx.lineTo(x + 12, y - sz / 2);
    ctx.fill();
    ctx.stroke();
  },
};

const bossMechaAsset: CanvasAssetDef = {
  key: 'enemy_boss_mecha',
  sourceType: AssetSourceType.CANVAS,
  draw: (ctx, x, y) => {
    const sz = PLAYER_SIZE * BOSS_SCALE;
    drawShadow(ctx, x, y, sz);
    
    ctx.fillStyle = ENEMY_COLORS[EnemyType.BOSS_MECHA];
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.lineWidth = 2;
    
    // Square body
    ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz);
    
    // Visor
    ctx.fillStyle = COLORS.MECHA_VISOR;
    ctx.fillRect(x - sz / 2 + 4, y - 8, sz - 8, 8);
    ctx.strokeRect(x - sz / 2 + 4, y - 8, sz - 8, 8);
  },
};

// ============================================================================
// PLAYER CANVAS ASSETS
// ============================================================================

function createPlayerAsset(color: string, id: number): CanvasAssetDef {
  return {
    key: `player_${id}`,
    sourceType: AssetSourceType.CANVAS,
    draw: (ctx, x, y) => {
      // Shadow
      ctx.fillStyle = COLORS.SHADOW;
      ctx.beginPath();
      ctx.ellipse(x, y + PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Body
      ctx.fillStyle = color;
      ctx.strokeStyle = COLORS.OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      drawEyes(ctx, x, y);
    },
  };
}

// ============================================================================
// ITEM CANVAS ASSETS
// ============================================================================

function createItemAsset(itemType: ItemType): CanvasAssetDef {
  return {
    key: `item_${itemType}`,
    sourceType: AssetSourceType.CANVAS,
    draw: (ctx, x, y) => {
      // Background circle
      ctx.fillStyle = ITEM_COLORS[itemType];
      ctx.strokeStyle = COLORS.OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, ITEM_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Icon
      const icon = ITEM_ICONS[itemType];
      if (icon) {
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
      }
    },
  };
}

// ============================================================================
// COLLECT ALL DEFAULT ASSETS
// ============================================================================

export const DEFAULT_CANVAS_ASSETS: AssetDef[] = [
  // Enemies
  balloonAsset,
  ghostAsset,
  minionAsset,
  frogAsset,
  tankAsset,
  bossSlimeAsset,
  bossMechaAsset,
  
  // Players (with default colors)
  createPlayerAsset('#3b82f6', 1), // Blue
  createPlayerAsset('#ef4444', 2), // Red
  
  // Items
  createItemAsset(ItemType.BOMB_UP),
  createItemAsset(ItemType.RANGE_UP),
  createItemAsset(ItemType.SPEED_UP),
  createItemAsset(ItemType.KICK),
  createItemAsset(ItemType.GHOST),
  createItemAsset(ItemType.SHIELD),
];

// ============================================================================
// ASSET KEY HELPERS
// ============================================================================

/**
 * Get the asset key for an enemy type
 */
export function getEnemyAssetKey(type: EnemyType): string {
  return `enemy_${type.toLowerCase()}`;
}

/**
 * Get the asset key for a player
 */
export function getPlayerAssetKey(playerId: number): string {
  return `player_${playerId}`;
}

/**
 * Get the asset key for an item type
 */
export function getItemAssetKey(type: ItemType): string {
  return `item_${type}`;
}
