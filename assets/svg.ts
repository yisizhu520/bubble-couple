/**
 * SVG Assets
 * 
 * References to external SVG sprite files.
 * SVG files are stored in /public/sprites/ for easy editing and version control.
 * 
 * Note: width/height here define the RENDER size, not the source SVG size.
 * SVG is vector-based, so it scales without quality loss.
 */

import { AssetDef, AssetSourceType } from './types';
import { ItemType } from '../types';
import { PLAYER_SIZE, TILE_SIZE } from '../constants';

// Boss sprites are 1.5x player size
const BOSS_SIZE = Math.round(PLAYER_SIZE * 1.5);
// Minion is smaller
const MINION_SIZE = Math.round(PLAYER_SIZE * 1);
// Items are slightly smaller than player
const ITEM_SIZE = Math.round(PLAYER_SIZE * 0.8);

// ============================================================================
// SVG ASSET DEFINITIONS
// ============================================================================

export const SVG_ASSETS: AssetDef[] = [
  // ==================== Players ====================
  {
    key: 'player_1',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/players/player1.svg',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  {
    key: 'player_2',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/players/player2.svg',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  
  // ==================== Enemies ====================
  {
    key: 'enemy_balloon',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/balloon.svg',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  {
    key: 'enemy_ghost',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/ghost.svg',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  {
    key: 'enemy_minion',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/minion.svg',
    width: MINION_SIZE,
    height: MINION_SIZE,
  },
  {
    key: 'enemy_frog',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/frog.svg',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  {
    key: 'enemy_tank',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/tank.svg',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  {
    key: 'enemy_boss_slime',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/boss_slime.svg',
    width: BOSS_SIZE,
    height: BOSS_SIZE,
  },
  {
    key: 'enemy_boss_mecha',
    sourceType: AssetSourceType.SVG,
    url: '/sprites/enemies/boss_mecha.svg',
    width: BOSS_SIZE,
    height: BOSS_SIZE,
  },
  
  // ==================== Items ====================
  {
    key: `item_${ItemType.BOMB_UP}`,
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/bomb_up.svg',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  {
    key: `item_${ItemType.RANGE_UP}`,
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/range_up.svg',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  {
    key: `item_${ItemType.SPEED_UP}`,
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/speed_up.svg',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  {
    key: `item_${ItemType.KICK}`,
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/kick.svg',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  {
    key: `item_${ItemType.GHOST}`,
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/ghost.svg',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  {
    key: `item_${ItemType.SHIELD}`,
    sourceType: AssetSourceType.SVG,
    url: '/sprites/items/shield.svg',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
];
