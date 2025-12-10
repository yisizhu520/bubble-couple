import { ArraySchema } from "@colyseus/schema";
import {
  GRID_W, GRID_H, TILE_SIZE, PLAYER_SIZE, TileType, ItemType,
  BOMB_TIMER_MS, EXPLOSION_DURATION_MS, BOMB_SLIDE_SPEED,
  CORNER_TOLERANCE, BASE_SPEED, MAX_SPEED, GHOST_DURATION_MS,
  TRAPPED_DURATION_MS, INVINCIBLE_DURATION_MS, LEVEL_CONFIGS, ENEMY_STATS
} from "./constants";
import { PlayerSchema } from "../rooms/schema/Player";
import { BombSchema, ExplosionSchema } from "../rooms/schema/Bomb";
import { EnemySchema } from "../rooms/schema/Enemy";
import { ItemSchema } from "../rooms/schema/Item";
import { GameRoomState } from "../rooms/schema/GameState";

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Convert grid coordinates to pixel coordinates
export function getPixelCoords(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: gridX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
    y: gridY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2,
  };
}

// Convert pixel coordinates to grid coordinates
export function getGridCoords(pixelX: number, pixelY: number): { x: number; y: number } {
  return {
    x: Math.floor((pixelX + PLAYER_SIZE / 2) / TILE_SIZE),
    y: Math.floor((pixelY + PLAYER_SIZE / 2) / TILE_SIZE),
  };
}

// Check if player overlaps with a grid tile
export function isColliding(px: number, py: number, gridX: number, gridY: number): boolean {
  const tileX = gridX * TILE_SIZE;
  const tileY = gridY * TILE_SIZE;
  return (
    px < tileX + TILE_SIZE &&
    px + PLAYER_SIZE > tileX &&
    py < tileY + TILE_SIZE &&
    py + PLAYER_SIZE > tileY
  );
}

// Check collision between two entities
export function checkEntityCollision(
  x1: number, y1: number,
  x2: number, y2: number,
  size: number = PLAYER_SIZE
): boolean {
  return (
    x1 < x2 + size &&
    x1 + size > x2 &&
    y1 < y2 + size &&
    y1 + size > y2
  );
}

// Create initial grid
// NOTE: ArraySchema does NOT support index assignment (grid[i] = value).
// Must use push() to add elements sequentially.
export function createInitialGrid(wallDensity: number = 0.6): {
  grid: ArraySchema<number>;
  items: ItemSchema[];
} {
  const grid = new ArraySchema<number>();
  const items: ItemSchema[] = [];

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let tileType: number;
      
      // Border walls
      if (x === 0 || x === GRID_W - 1 || y === 0 || y === GRID_H - 1) {
        tileType = TileType.WALL_HARD;
      }
      // Fixed pattern walls (every other)
      else if (x % 2 === 0 && y % 2 === 0) {
        tileType = TileType.WALL_HARD;
      }
      // Player spawn zones (keep clear)
      else if ((x <= 2 && y <= 2) || (x >= GRID_W - 3 && y >= GRID_H - 3)) {
        tileType = TileType.EMPTY;
      }
      // Random soft walls
      else if (Math.random() < wallDensity) {
        tileType = TileType.WALL_SOFT;
        
        // Random item under wall
        if (Math.random() < 0.4) {
          const itemTypes = [
            ItemType.RANGE_UP,
            ItemType.BOMB_UP,
            ItemType.SPEED_UP,
            ItemType.KICK,
            ItemType.GHOST,
            ItemType.SHIELD,
          ];
          const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
          items.push(new ItemSchema(generateId(), x, y, randomType));
        }
      }
      // Empty tile
      else {
        tileType = TileType.EMPTY;
      }
      
      // ArraySchema requires push(), index assignment doesn't work!
      grid.push(tileType);
    }
  }

  return { grid, items };
}

// Check if entity is blocked at position
export function isEntityBlocked(
  nx: number,
  ny: number,
  grid: ArraySchema<number>,
  bombs: ArraySchema<BombSchema>,
  ghostMode: boolean = false
): boolean {
  const epsilon = 0.1;
  const corners = [
    { x: nx, y: ny },
    { x: nx + PLAYER_SIZE - epsilon, y: ny },
    { x: nx, y: ny + PLAYER_SIZE - epsilon },
    { x: nx + PLAYER_SIZE - epsilon, y: ny + PLAYER_SIZE - epsilon },
  ];

  for (const c of corners) {
    const gx = Math.floor(c.x / TILE_SIZE);
    const gy = Math.floor(c.y / TILE_SIZE);

    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return true;

    const tile = grid[gy * GRID_W + gx];
    if (tile === TileType.WALL_HARD) return true;
    if (tile === TileType.WALL_SOFT && !ghostMode) return true;

    if (!ghostMode) {
      const bomb = bombs.find(b => b.gridX === gx && b.gridY === gy);
      if (bomb) return true;
    }
  }

  return false;
}

// Spawn enemy at valid location
export function spawnEnemy(
  grid: ArraySchema<number>,
  existingEnemies: ArraySchema<EnemySchema>,
  enemyType: string,
  idPrefix: string
): EnemySchema | null {
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const ex = Math.floor(Math.random() * GRID_W);
    const ey = Math.floor(Math.random() * GRID_H);

    const tile = grid[ey * GRID_W + ex];
    if (tile !== TileType.EMPTY) continue;

    // Avoid player spawn zones
    if ((ex < 5 && ey < 5) || (ex > GRID_W - 5 && ey > GRID_H - 5)) continue;

    // Avoid overlapping with existing enemies
    const overlaps = existingEnemies.some(e =>
      Math.abs(e.x - ex * TILE_SIZE) < TILE_SIZE &&
      Math.abs(e.y - ey * TILE_SIZE) < TILE_SIZE
    );
    if (overlaps) continue;

    const startPos = getPixelCoords(ex, ey);
    return new EnemySchema(`${idPrefix}-${Date.now()}-${attempts}`, enemyType, startPos.x, startPos.y);
  }
  return null;
}

// Player movement with collision and corner sliding
export function movePlayer(
  player: PlayerSchema,
  dx: number,
  dy: number,
  grid: ArraySchema<number>,
  bombs: ArraySchema<BombSchema>,
  currentX: number,
  currentY: number
): { x: number; y: number; direction: string } {
  const ghostMode = player.ghostTimer > 0;
  let newX = currentX;
  let newY = currentY;
  let direction = player.direction;

  const checkMove = (nx: number, ny: number): boolean => {
    return isEntityBlocked(nx, ny, grid, bombs, ghostMode);
  };

  // Move on X axis
  if (dx !== 0) {
    if (!checkMove(currentX + dx, currentY)) {
      newX = currentX + dx;
    } else {
      // Corner sliding
      const centerY = currentY + PLAYER_SIZE / 2;
      const tileY = Math.floor(centerY / TILE_SIZE);
      const tileCenterY = tileY * TILE_SIZE + TILE_SIZE / 2;
      const diff = centerY - tileCenterY;
      if (Math.abs(diff) <= CORNER_TOLERANCE && Math.abs(diff) > 0) {
        const dir = diff > 0 ? -1 : 1;
        const correction = dir * player.speed;
        if (!checkMove(currentX, currentY + correction)) {
          newY = currentY + correction;
        }
      }
    }
  }

  // Move on Y axis
  if (dy !== 0) {
    if (!checkMove(newX, currentY + dy)) {
      newY = currentY + dy;
    } else {
      // Corner sliding
      const centerX = newX + PLAYER_SIZE / 2;
      const tileX = Math.floor(centerX / TILE_SIZE);
      const tileCenterX = tileX * TILE_SIZE + TILE_SIZE / 2;
      const diff = centerX - tileCenterX;
      if (Math.abs(diff) <= CORNER_TOLERANCE && Math.abs(diff) > 0) {
        const dir = diff > 0 ? -1 : 1;
        const correction = dir * player.speed;
        if (!checkMove(newX + correction, currentY)) {
          newX = newX + correction;
        }
      }
    }
  }

  // Update direction
  if (dy < 0) direction = "UP";
  else if (dy > 0) direction = "DOWN";
  else if (dx < 0) direction = "LEFT";
  else if (dx > 0) direction = "RIGHT";

  return { x: newX, y: newY, direction };
}

// Trigger explosion chain
export function triggerExplosion(
  bomb: BombSchema,
  state: GameRoomState,
  newExplosions: ExplosionSchema[]
): void {
  // Create center explosion
  newExplosions.push(new ExplosionSchema(generateId(), bomb.ownerId, bomb.gridX, bomb.gridY));

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  for (const dir of directions) {
    for (let i = 1; i <= bomb.range; i++) {
      const tx = bomb.gridX + dir.dx * i;
      const ty = bomb.gridY + dir.dy * i;

      if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) break;

      const tile = state.grid[ty * GRID_W + tx];
      if (tile === TileType.WALL_HARD) break;

      if (tile === TileType.WALL_SOFT) {
        state.grid[ty * GRID_W + tx] = TileType.EMPTY;
        newExplosions.push(new ExplosionSchema(generateId(), bomb.ownerId, tx, ty));
        break;
      }

      // Chain reaction - explode other bombs
      const hitBombIndex = state.bombs.findIndex(b => b.gridX === tx && b.gridY === ty);
      if (hitBombIndex !== -1) {
        const hitBomb = state.bombs[hitBombIndex];
        if (hitBomb) {
          state.bombs.splice(hitBombIndex, 1);
          triggerExplosion(hitBomb, state, newExplosions);
        }
      }

      newExplosions.push(new ExplosionSchema(generateId(), bomb.ownerId, tx, ty));
    }
  }
}

// Apply item effect to player
export function applyItemEffect(player: PlayerSchema, itemType: number): void {
  switch (itemType) {
    case ItemType.RANGE_UP:
      player.bombRange = Math.min(player.bombRange + 1, 8);
      break;
    case ItemType.BOMB_UP:
      player.maxBombs = Math.min(player.maxBombs + 1, 8);
      break;
    case ItemType.SPEED_UP:
      player.speed = Math.min(player.speed + 1, MAX_SPEED);
      break;
    case ItemType.KICK:
      player.canKick = true;
      break;
    case ItemType.GHOST:
      player.ghostTimer = GHOST_DURATION_MS;
      break;
    case ItemType.SHIELD:
      player.hasShield = true;
      break;
  }
}

