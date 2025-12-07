// Grid Configuration
export const GRID_W = 15;
export const GRID_H = 13;
export const TILE_SIZE = 48;
export const HEADER_HEIGHT = 64;

// Timing
export const BOMB_TIMER_MS = 3000;
export const EXPLOSION_DURATION_MS = 600;
export const TRAPPED_DURATION_MS = 5000;
export const INVINCIBLE_DURATION_MS = 2000;
export const GHOST_DURATION_MS = 10000;
export const GAME_DURATION_SEC = 180;

// Physics
export const BASE_SPEED = 1.5;
export const MAX_SPEED = 6;
export const BOMB_SLIDE_SPEED = 6;
export const CORNER_TOLERANCE = 15;
export const PLAYER_SIZE = 36;
export const PLAYER_OFFSET = (TILE_SIZE - PLAYER_SIZE) / 2;

// Enemy Stats
export const ENEMY_STATS: Record<string, { speed: number; hp: number }> = {
  BALLOON: { speed: 0.9, hp: 1 },
  GHOST: { speed: 1.3, hp: 1 },
  MINION: { speed: 1.2, hp: 1 },
  FROG: { speed: 1.2, hp: 1 },
  TANK: { speed: 0.6, hp: 2 },
  BOSS_SLIME: { speed: 1.7, hp: 4 },
  BOSS_MECHA: { speed: 1.1, hp: 6 },
};

// Level Configurations
export interface LevelConfig {
  level: number;
  wallDensity: number;
  enemies: string[];
  boss: string | null;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    wallDensity: 0.6,
    enemies: ["BALLOON", "BALLOON", "BALLOON", "MINION", "MINION"],
    boss: "BOSS_SLIME"
  },
  {
    level: 2,
    wallDensity: 0.55,
    enemies: ["MINION", "MINION", "FROG", "FROG", "TANK", "GHOST"],
    boss: "BOSS_MECHA"
  },
  {
    level: 3,
    wallDensity: 0.5,
    enemies: ["TANK", "TANK", "MINION", "MINION", "GHOST"],
    boss: "BOSS_SLIME"
  },
  {
    level: 4,
    wallDensity: 0.45,
    enemies: ["FROG", "FROG", "GHOST", "GHOST", "TANK"],
    boss: "BOSS_MECHA"
  }
];

// Tile Types
export const TileType = {
  EMPTY: 0,
  WALL_HARD: 1,
  WALL_SOFT: 2,
} as const;

// Item Types
export const ItemType = {
  NONE: 0,
  RANGE_UP: 1,
  BOMB_UP: 2,
  SPEED_UP: 3,
  KICK: 4,
  GHOST: 5,
  SHIELD: 6,
} as const;

// Player States
export const PlayerState = {
  NORMAL: "NORMAL",
  TRAPPED: "TRAPPED",
  DEAD: "DEAD",
} as const;

// Directions
export const Direction = {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  NONE: "NONE",
} as const;

