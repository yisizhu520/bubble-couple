/**
 * Asset System Entry Point
 * 
 * Re-exports all asset system functionality.
 * Import from here for a clean API.
 */

// Types
export * from './types';

// Loader
export { loadAllAssets, preloadImages } from './loader';
export type { LoadProgress, ProgressCallback } from './loader';

// Manager
export { assetManager, createAnimationState } from './manager';
export type { AnimationState } from './manager';

// Default assets
export {
  DEFAULT_CANVAS_ASSETS,
  getEnemyAssetKey,
  getPlayerAssetKey,
  getItemAssetKey,
} from './defaults';

// SVG assets
export { SVG_ASSETS } from './svg';

// Initialization (main entry point)
export { initAssets, isAssetsReady, getAssetType } from './init';
export type { AssetType } from './init';
