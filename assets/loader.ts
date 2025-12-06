/**
 * Asset Loader
 * 
 * Handles preloading of all game assets before the game starts.
 * Supports multiple asset types with progress tracking.
 * 
 * Industry best practice: All assets loaded before game loop starts.
 * This prevents janky loading during gameplay.
 */

import {
  AssetDef,
  AssetSourceType,
  LoadedAsset,
  ImageAssetDef,
  SpritesheetAssetDef,
  SVGAssetDef,
  AnimatedImageAssetDef,
  CanvasAssetDef,
} from './types';

// ============================================================================
// LOADER TYPES
// ============================================================================

export interface LoadProgress {
  loaded: number;
  total: number;
  current: string;
  percent: number;
}

export type ProgressCallback = (progress: LoadProgress) => void;

// ============================================================================
// INDIVIDUAL LOADERS
// ============================================================================

/**
 * Load a single image file
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Create a loaded asset from a Canvas definition (procedural)
 */
function createCanvasAsset(def: CanvasAssetDef): LoadedAsset {
  return {
    def,
    loaded: true,
    draw: def.draw,
  };
}

/**
 * Create a loaded asset from an Image definition
 */
async function createImageAsset(def: ImageAssetDef): Promise<LoadedAsset> {
  const image = await loadImage(def.url);
  const anchor = def.anchor ?? { x: 0.5, y: 0.5 };
  
  return {
    def,
    loaded: true,
    image,
    draw: (ctx, x, y) => {
      const drawX = x - image.width * anchor.x;
      const drawY = y - image.height * anchor.y;
      ctx.drawImage(image, drawX, drawY);
    },
  };
}

/**
 * Create a loaded asset from a Spritesheet definition
 */
async function createSpritesheetAsset(def: SpritesheetAssetDef): Promise<LoadedAsset> {
  const image = await loadImage(def.url);
  const anchor = def.anchor ?? { x: 0.5, y: 0.5 };
  
  // Calculate frame layout
  const framesPerRow = def.framesPerRow ?? Math.floor(image.width / def.frameWidth);
  const totalRows = Math.ceil(image.height / def.frameHeight);
  const frameCount = def.frameCount ?? framesPerRow * totalRows;
  
  return {
    def,
    loaded: true,
    image,
    frameCount,
    draw: (ctx, x, y, frame = 0) => {
      const safeFrame = frame % frameCount;
      const col = safeFrame % framesPerRow;
      const row = Math.floor(safeFrame / framesPerRow);
      
      const srcX = col * def.frameWidth;
      const srcY = row * def.frameHeight;
      
      const drawX = x - def.frameWidth * anchor.x;
      const drawY = y - def.frameHeight * anchor.y;
      
      ctx.drawImage(
        image,
        srcX, srcY, def.frameWidth, def.frameHeight,
        drawX, drawY, def.frameWidth, def.frameHeight
      );
    },
  };
}

/**
 * Create a loaded asset from an SVG definition
 * SVG is rasterized to a canvas for fast rendering
 */
async function createSVGAsset(def: SVGAssetDef): Promise<LoadedAsset> {
  const image = await loadImage(def.url);
  
  // Pre-render SVG to an offscreen canvas for performance
  const offscreen = document.createElement('canvas');
  offscreen.width = def.width;
  offscreen.height = def.height;
  const offCtx = offscreen.getContext('2d')!;
  offCtx.drawImage(image, 0, 0, def.width, def.height);
  
  return {
    def,
    loaded: true,
    image,
    draw: (ctx, x, y) => {
      ctx.drawImage(offscreen, x - def.width / 2, y - def.height / 2);
    },
  };
}

/**
 * Create a loaded asset from an animated image (GIF/APNG)
 * Note: For full GIF frame support, a specialized decoder would be needed.
 * This basic implementation treats it as a static image.
 * For real animation, use spritesheets instead.
 */
async function createAnimatedImageAsset(def: AnimatedImageAssetDef): Promise<LoadedAsset> {
  const image = await loadImage(def.url);
  
  return {
    def,
    loaded: true,
    image,
    draw: (ctx, x, y) => {
      ctx.drawImage(image, x - image.width / 2, y - image.height / 2);
    },
  };
}

// ============================================================================
// MAIN LOADER
// ============================================================================

/**
 * Load a single asset based on its type
 */
async function loadAsset(def: AssetDef): Promise<LoadedAsset> {
  switch (def.sourceType) {
    case AssetSourceType.CANVAS:
      return createCanvasAsset(def);
    case AssetSourceType.IMAGE:
      return createImageAsset(def);
    case AssetSourceType.SPRITESHEET:
      return createSpritesheetAsset(def);
    case AssetSourceType.SVG:
      return createSVGAsset(def);
    case AssetSourceType.ANIMATED_IMAGE:
      return createAnimatedImageAsset(def);
    default:
      throw new Error(`Unknown asset type: ${(def as AssetDef).sourceType}`);
  }
}

/**
 * Load all assets with progress tracking
 * 
 * @param assets - Array of asset definitions to load
 * @param onProgress - Optional callback for progress updates
 * @returns Map of asset key to loaded asset
 */
export async function loadAllAssets(
  assets: AssetDef[],
  onProgress?: ProgressCallback
): Promise<Map<string, LoadedAsset>> {
  const result = new Map<string, LoadedAsset>();
  const total = assets.length;
  
  for (let i = 0; i < assets.length; i++) {
    const def = assets[i];
    
    // Report progress
    if (onProgress) {
      onProgress({
        loaded: i,
        total,
        current: def.key,
        percent: Math.round((i / total) * 100),
      });
    }
    
    try {
      const loaded = await loadAsset(def);
      result.set(def.key, loaded);
    } catch (error) {
      console.error(`Failed to load asset "${def.key}":`, error);
      // Continue loading other assets
    }
  }
  
  // Final progress update
  if (onProgress) {
    onProgress({
      loaded: total,
      total,
      current: 'complete',
      percent: 100,
    });
  }
  
  return result;
}

/**
 * Preload an array of image URLs (utility function)
 * Useful for preloading images before registering them as assets
 */
export async function preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(urls.map(loadImage));
}
