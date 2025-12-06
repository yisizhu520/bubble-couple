/**
 * Asset Manager
 * 
 * Singleton that manages all game assets. Provides a unified interface
 * for accessing loaded assets regardless of their source type.
 * 
 * Key features:
 * - Centralized asset registry
 * - Animation state management
 * - Theme-based asset swapping
 * - Fallback to procedural rendering if image not loaded
 */

import { AssetDef, LoadedAsset, AnimationDef, EntityAssetConfig, ThemeConfig } from './types';
import { loadAllAssets, LoadProgress } from './loader';

// ============================================================================
// ANIMATION STATE
// ============================================================================

export interface AnimationState {
  animKey: string;
  currentFrame: number;
  frameTimer: number;
  playing: boolean;
}

/**
 * Create a new animation state for an entity
 */
export function createAnimationState(animKey: string): AnimationState {
  return {
    animKey,
    currentFrame: 0,
    frameTimer: 0,
    playing: true,
  };
}

// ============================================================================
// ASSET MANAGER
// ============================================================================

class AssetManagerClass {
  private assets = new Map<string, LoadedAsset>();
  private animations = new Map<string, AnimationDef>();
  private currentTheme: ThemeConfig | null = null;
  private loaded = false;

  /**
   * Check if assets have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Initialize the asset manager by loading all assets
   * Call this before the game starts!
   */
  async init(
    assetDefs: AssetDef[],
    animDefs: AnimationDef[] = [],
    onProgress?: (progress: LoadProgress) => void
  ): Promise<void> {
    // Load all assets
    this.assets = await loadAllAssets(assetDefs, onProgress);
    
    // Register animations
    animDefs.forEach(anim => {
      this.animations.set(anim.key, anim);
    });
    
    this.loaded = true;
    console.log(`[AssetManager] Loaded ${this.assets.size} assets, ${this.animations.size} animations`);
  }

  /**
   * Set the current visual theme
   */
  setTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
  }

  /**
   * Get the current theme
   */
  getTheme(): ThemeConfig | null {
    return this.currentTheme;
  }

  /**
   * Get a loaded asset by key
   */
  get(key: string): LoadedAsset | undefined {
    return this.assets.get(key);
  }

  /**
   * Check if an asset exists
   */
  has(key: string): boolean {
    return this.assets.has(key);
  }

  /**
   * Register a new asset (for procedural assets added at runtime)
   */
  register(asset: LoadedAsset): void {
    this.assets.set(asset.def.key, asset);
  }

  /**
   * Get an animation definition
   */
  getAnimation(key: string): AnimationDef | undefined {
    return this.animations.get(key);
  }

  /**
   * Get entity asset config for a player
   */
  getPlayerAssets(playerId: number): EntityAssetConfig | undefined {
    return this.currentTheme?.players[playerId];
  }

  /**
   * Get entity asset config for an enemy type
   */
  getEnemyAssets(enemyType: string): EntityAssetConfig | undefined {
    return this.currentTheme?.enemies[enemyType];
  }

  /**
   * Draw an asset to a canvas context
   * Handles missing assets gracefully with a fallback
   */
  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    frame?: number
  ): boolean {
    const asset = this.assets.get(key);
    if (!asset) {
      // Draw a magenta box as "missing asset" indicator
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(x - 16, y - 16, 32, 32);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(x - 16, y - 16, 32, 32);
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('?', x, y + 4);
      return false;
    }
    
    asset.draw(ctx, x, y, frame);
    return true;
  }

  /**
   * Update an animation state (call each frame)
   * @returns The current frame index to use for drawing
   */
  updateAnimation(state: AnimationState, deltaMs: number): number {
    const anim = this.animations.get(state.animKey);
    if (!anim || !state.playing) {
      return state.currentFrame;
    }
    
    const frameDuration = 1000 / anim.frameRate;
    state.frameTimer += deltaMs;
    
    while (state.frameTimer >= frameDuration) {
      state.frameTimer -= frameDuration;
      state.currentFrame++;
      
      if (state.currentFrame >= anim.frames.length) {
        if (anim.loop) {
          state.currentFrame = 0;
        } else {
          state.currentFrame = anim.frames.length - 1;
          state.playing = false;
        }
      }
    }
    
    return anim.frames[state.currentFrame];
  }

  /**
   * Draw an animated asset
   */
  drawAnimated(
    ctx: CanvasRenderingContext2D,
    state: AnimationState,
    x: number,
    y: number,
    deltaMs: number
  ): boolean {
    const anim = this.animations.get(state.animKey);
    if (!anim) {
      return false;
    }
    
    const frame = this.updateAnimation(state, deltaMs);
    return this.draw(ctx, anim.assetKey, x, y, frame);
  }

  /**
   * Clear all assets (for testing or hot reloading)
   */
  clear(): void {
    this.assets.clear();
    this.animations.clear();
    this.currentTheme = null;
    this.loaded = false;
  }
}

// Export singleton instance
export const assetManager = new AssetManagerClass();
