/**
 * Asset Initialization
 * 
 * Entry point for initializing the asset system.
 * Automatically selects between SVG and Canvas assets based on environment variable.
 * 
 * Environment variable: VITE_ASSET_TYPE
 * - 'svg' (default): Use SVG vector graphics
 * - 'canvas': Use procedural Canvas drawing
 */

import { assetManager } from './manager';
import { DEFAULT_CANVAS_ASSETS } from './defaults';
import { SVG_ASSETS } from './svg';
import { AssetDef } from './types';
import { LoadProgress } from './loader';

// ============================================================================
// CONFIGURATION
// ============================================================================

export type AssetType = 'svg' | 'canvas';

/**
 * Get the configured asset type from environment
 */
export function getAssetType(): AssetType {
  const envType = process.env.VITE_ASSET_TYPE as string | undefined;
  if (envType === 'canvas') {
    return 'canvas';
  }
  return 'svg'; // Default to SVG
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the asset system
 * 
 * @param onProgress - Optional progress callback for loading screen
 * @returns Promise that resolves when all assets are loaded
 */
export async function initAssets(
  onProgress?: (progress: LoadProgress) => void
): Promise<void> {
  const assetType = getAssetType();
  
  console.log(`[Assets] Initializing with type: ${assetType}`);
  
  let assets: AssetDef[];
  
  if (assetType === 'svg') {
    // SVG mode: Start with Canvas defaults, then override with SVG
    // This ensures any missing SVG assets fall back to Canvas
    assets = [...DEFAULT_CANVAS_ASSETS, ...SVG_ASSETS];
  } else {
    // Canvas mode: Use only procedural Canvas assets
    assets = DEFAULT_CANVAS_ASSETS;
  }
  
  await assetManager.init(assets, [], onProgress);
  
  console.log(`[Assets] Loaded ${assets.length} assets (${assetType} mode)`);
}

/**
 * Check if assets have been initialized
 */
export function isAssetsReady(): boolean {
  return assetManager.isLoaded();
}
