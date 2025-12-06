/**
 * Rendering Constants
 * 
 * All colors, sizes, and magic numbers for the game renderer.
 * Centralized here for easy theming and consistency.
 */

import { ItemType, EnemyType } from '../types';

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const COLORS = {
  // Floor & Grid
  FLOOR_PRIMARY: '#F5F5F4',     // Stone-100
  FLOOR_SECONDARY: '#E7E5E4',   // Stone-200 (checkerboard)
  GRID_LINE: '#D6D3D1',         // Stone-300
  
  // Walls
  WALL_HARD: '#374151',         // Dark Slate
  WALL_SOFT_OUTER: '#FB923C',   // Orange-400
  WALL_SOFT_INNER: '#FDBA74',   // Orange-300
  
  // Common
  BLACK: '#000000',
  WHITE: '#ffffff',
  SHADOW: 'rgba(0,0,0,0.2)',
  OUTLINE: '#000',
  
  // Explosions
  EXPLOSION_OUTER: '#ef4444',   // Red-500
  EXPLOSION_INNER: '#fcd34d',   // Yellow-300
  
  // Bomb
  BOMB_BODY: '#000000',
  BOMB_FUSE: '#f59e0b',
  BOMB_SPARK_A: '#ef4444',
  BOMB_SPARK_B: '#fbbf24',
  
  // HP Bar
  HP_BG: '#fff',
  HP_LOW: '#ef4444',
  HP_HIGH: '#22c55e',
  
  // Player effects
  TRAPPED_BUBBLE: 'rgba(147, 197, 253, 0.6)',
  SHIELD: '#10b981',
  
  // Boss details
  BOSS_CROWN: '#fcd34d',
  MECHA_VISOR: '#3b82f6',
} as const;

// ============================================================================
// ITEM COLORS & ICONS
// ============================================================================

export const ITEM_COLORS: Record<ItemType, string> = {
  [ItemType.NONE]: COLORS.WHITE,
  [ItemType.BOMB_UP]: '#1f2937',
  [ItemType.RANGE_UP]: '#facc15',
  [ItemType.SPEED_UP]: '#3b82f6',
  [ItemType.KICK]: '#ec4899',
  [ItemType.GHOST]: '#a855f7',
  [ItemType.SHIELD]: '#10b981',
};

export const ITEM_ICONS: Record<ItemType, string> = {
  [ItemType.NONE]: '',
  [ItemType.BOMB_UP]: '💣',
  [ItemType.RANGE_UP]: '⚡',
  [ItemType.SPEED_UP]: '👟',
  [ItemType.KICK]: '🦶',
  [ItemType.GHOST]: '👻',
  [ItemType.SHIELD]: '🛡️',
};

// ============================================================================
// ENEMY COLORS
// ============================================================================

export const ENEMY_COLORS: Record<EnemyType, string> = {
  [EnemyType.BALLOON]: '#fb923c',
  [EnemyType.GHOST]: '#c084fc',
  [EnemyType.MINION]: '#fde047',
  [EnemyType.FROG]: '#4ade80',
  [EnemyType.TANK]: '#94a3b8',
  [EnemyType.BOSS_SLIME]: '#bef264',
  [EnemyType.BOSS_MECHA]: '#ef4444',
};

// ============================================================================
// GEOMETRY CONSTANTS
// ============================================================================

// Walls
export const WALL_INSET = 6;

// Items
export const ITEM_RADIUS = 14;

// Bombs
export const BOMB_PADDING = 6;
export const BOMB_SHINE_RATIO = 0.3;
export const BOMB_FUSE_LENGTH = 10;
export const SPARK_RADIUS = 4;

// Explosions
export const EXPLOSION_INSET = 8;

// Eyes (shared by players and enemies)
export const EYE_OFFSET_X = 6;
export const EYE_OFFSET_Y = 4;
export const EYE_RADIUS = 5;
export const PUPIL_RADIUS = 2;
export const PUPIL_MOVE = 2;

// HP Bar
export const HP_BAR_WIDTH = 32;
export const HP_BAR_HEIGHT = 6;
export const HP_BAR_OFFSET = 16;

// Bosses
export const BOSS_SCALE = 1.5;

// Shield
export const SHIELD_RADIUS_OFFSET = 8;

// Animation
export const BOB_SPEED = 150;   // ms per cycle
export const BOB_AMPLITUDE = 2; // pixels

export const BOMB_PULSE_SPEED = 100;
export const BOMB_PULSE_AMPLITUDE = 0.05;

export const SPARK_BLINK_SPEED = 50;
export const INVINCIBLE_BLINK_SPEED = 50;
export const PLAYER_INVINCIBLE_BLINK_SPEED = 100;
