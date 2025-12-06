/**
 * Asset System Types
 * 
 * Defines the core types for the game's asset loading and rendering system.
 * Supports multiple asset sources: Canvas shapes, Images, Spritesheets, SVG, GIF, etc.
 */

// ============================================================================
// ASSET SOURCE TYPES
// ============================================================================

/**
 * The type of asset source - what kind of resource we're loading
 */
export enum AssetSourceType {
  /** Procedural Canvas drawing (current behavior - shapes) */
  CANVAS = 'CANVAS',
  /** Static image (PNG, JPG, WEBP) */
  IMAGE = 'IMAGE',
  /** Sprite sheet with multiple frames */
  SPRITESHEET = 'SPRITESHEET',
  /** SVG vector graphic */
  SVG = 'SVG',
  /** Animated GIF/APNG */
  ANIMATED_IMAGE = 'ANIMATED_IMAGE',
}

// ============================================================================
// ASSET DEFINITION INTERFACES
// ============================================================================

/**
 * Base interface for all asset definitions
 */
interface BaseAssetDef {
  /** Unique identifier for this asset */
  key: string;
  /** Source type determines how to load and render */
  sourceType: AssetSourceType;
}

/**
 * Canvas-based procedural asset (current system - draw with code)
 */
export interface CanvasAssetDef extends BaseAssetDef {
  sourceType: AssetSourceType.CANVAS;
  /** Custom draw function - receives context and position */
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, frame?: number) => void;
}

/**
 * Static image asset
 */
export interface ImageAssetDef extends BaseAssetDef {
  sourceType: AssetSourceType.IMAGE;
  /** URL to the image file */
  url: string;
  /** Optional: anchor point (0-1), defaults to center */
  anchor?: { x: number; y: number };
}

/**
 * Spritesheet asset - image with multiple frames
 */
export interface SpritesheetAssetDef extends BaseAssetDef {
  sourceType: AssetSourceType.SPRITESHEET;
  /** URL to the spritesheet image */
  url: string;
  /** Width of each frame in pixels */
  frameWidth: number;
  /** Height of each frame in pixels */
  frameHeight: number;
  /** Number of frames in the sheet (auto-calculated if omitted) */
  frameCount?: number;
  /** Frames per row (auto-calculated if omitted) */
  framesPerRow?: number;
  /** Optional: anchor point (0-1), defaults to center */
  anchor?: { x: number; y: number };
}

/**
 * SVG vector asset
 */
export interface SVGAssetDef extends BaseAssetDef {
  sourceType: AssetSourceType.SVG;
  /** URL to the SVG file or inline SVG string */
  url: string;
  /** Render size (SVG will be scaled to fit) */
  width: number;
  height: number;
}

/**
 * Animated image (GIF, APNG)
 */
export interface AnimatedImageAssetDef extends BaseAssetDef {
  sourceType: AssetSourceType.ANIMATED_IMAGE;
  /** URL to the animated image */
  url: string;
  /** Frame duration in ms (for manual animation control) */
  frameDuration?: number;
}

/**
 * Union type for all asset definitions
 */
export type AssetDef =
  | CanvasAssetDef
  | ImageAssetDef
  | SpritesheetAssetDef
  | SVGAssetDef
  | AnimatedImageAssetDef;

// ============================================================================
// ANIMATION DEFINITION
// ============================================================================

/**
 * Animation definition - sequence of frames with timing
 */
export interface AnimationDef {
  /** Unique identifier for this animation */
  key: string;
  /** The spritesheet asset key this animation uses */
  assetKey: string;
  /** Array of frame indices to play */
  frames: number[];
  /** Frame rate (frames per second) */
  frameRate: number;
  /** Should the animation loop? */
  loop: boolean;
}

// ============================================================================
// LOADED ASSET INTERFACES
// ============================================================================

/**
 * A loaded, ready-to-use asset
 */
export interface LoadedAsset {
  /** Original definition */
  def: AssetDef;
  /** Whether the asset is fully loaded */
  loaded: boolean;
  /** 
   * Draw this asset to a canvas context
   * @param ctx - Canvas 2D context
   * @param x - Center X position
   * @param y - Center Y position
   * @param frame - Frame index for animated assets (optional)
   */
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, frame?: number) => void;
  /** For spritesheets: total number of frames */
  frameCount?: number;
  /** Raw image element (if applicable) */
  image?: HTMLImageElement;
}

// ============================================================================
// ENTITY ASSET MAPPING
// ============================================================================

/**
 * Maps entity states to their visual assets
 * Used for players and enemies to support different visuals per state
 */
export interface EntityAssetConfig {
  /** Asset key for idle/default state */
  idle: string;
  /** Asset key for walking animation (optional) */
  walk?: string;
  /** Asset key for up direction (optional) */
  walkUp?: string;
  /** Asset key for down direction (optional) */
  walkDown?: string;
  /** Asset key for left direction (optional) */
  walkLeft?: string;
  /** Asset key for right direction (optional) */
  walkRight?: string;
  /** Asset key for death animation (optional) */
  death?: string;
  /** Asset key for attack animation (optional) */
  attack?: string;
  /** Shadow asset key (optional, uses default if not specified) */
  shadow?: string;
}

/**
 * Full visual theme configuration
 */
export interface ThemeConfig {
  /** Player assets by player ID */
  players: Record<number, EntityAssetConfig>;
  /** Enemy assets by enemy type */
  enemies: Record<string, EntityAssetConfig>;
  /** Bomb assets */
  bombs: {
    normal: string;
    mega?: string;
  };
  /** Explosion assets */
  explosions: {
    center: string;
    horizontal: string;
    vertical: string;
    endUp: string;
    endDown: string;
    endLeft: string;
    endRight: string;
  };
  /** Item assets by item type */
  items: Record<string, string>;
  /** Tile assets */
  tiles: {
    floor: string;
    wallHard: string;
    wallSoft: string;
  };
}
