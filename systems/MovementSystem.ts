/**
 * MovementSystem - 移动系统
 * 
 * 职责：处理实体移动、碰撞检测、角落滑动
 * 设计原则：统一的碰撞检测逻辑，消除 isEntityBlocked/checkMove 重复
 */

import { GameState, Player, PlayerState, TileType, Direction, Enemy, EnemyType } from '../types';
import { GRID_W, GRID_H, TILE_SIZE, PLAYER_SIZE, CORNER_TOLERANCE, BOMB_SLIDE_SPEED } from '../constants';
import { isColliding, getPixelCoords } from '../utils/gameUtils';
import { audioManager } from '../utils/audio';
import { SoundType } from '../types';
import { PlayerInput } from './InputSystem';

interface MoveIntent {
  dx: number;
  dy: number;
}

interface CollisionContext {
  state: GameState;
  canPassSoftWalls: boolean;  // Ghost mode
  canPassBombs: boolean;      // Ghost mode
  canKickBombs: boolean;      // Kick power-up
  currentX: number;           // For bomb overlap detection
  currentY: number;
}

/**
 * 统一的碰撞检测函数
 * 检查给定位置是否被阻挡
 */
function isBlocked(
  nx: number, 
  ny: number, 
  ctx: CollisionContext,
  moveDir?: MoveIntent
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

    // 边界检查
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return true;

    const tile = ctx.state.grid[gy][gx];
    
    // 硬墙永远阻挡
    if (tile === TileType.WALL_HARD) return true;
    
    // 软墙检查（Ghost 可以穿过）
    if (tile === TileType.WALL_SOFT && !ctx.canPassSoftWalls) return true;

    // 炸弹检查
    const bomb = ctx.state.bombs.find(b => b.gridX === gx && b.gridY === gy);
    if (bomb && !ctx.canPassBombs) {
      // 允许从炸弹内部走出（overlap）
      if (isColliding(ctx.currentX, ctx.currentY, gx, gy)) {
        continue; // 当前已在炸弹格子内，允许移动
      }
      
      // 踢炸弹逻辑
      if (ctx.canKickBombs && bomb.vx === 0 && bomb.vy === 0 && moveDir) {
        if (moveDir.dx !== 0) bomb.vx = Math.sign(moveDir.dx) * BOMB_SLIDE_SPEED;
        if (moveDir.dy !== 0) bomb.vy = Math.sign(moveDir.dy) * BOMB_SLIDE_SPEED;
        audioManager.play(SoundType.KICK);
      }
      return true;
    }
  }
  
  return false;
}

/**
 * 角落滑动修正
 * 当玩家几乎对齐通道时，自动微调位置
 */
function tryCornerSlide(
  player: Player,
  axis: 'x' | 'y',
  ctx: CollisionContext
): number {
  const speed = player.speed;
  
  if (axis === 'x') {
    // 垂直对齐检查
    const centerY = player.y + PLAYER_SIZE / 2;
    const tileY = Math.floor(centerY / TILE_SIZE);
    const tileCenterY = tileY * TILE_SIZE + TILE_SIZE / 2;
    const diff = centerY - tileCenterY;
    
    if (Math.abs(diff) <= CORNER_TOLERANCE && Math.abs(diff) > 0) {
      const dir = diff > 0 ? -1 : 1;
      const correction = dir * speed;
      if (!isBlocked(player.x, player.y + correction, ctx)) {
        return correction;
      }
    }
  } else {
    // 水平对齐检查
    const centerX = player.x + PLAYER_SIZE / 2;
    const tileX = Math.floor(centerX / TILE_SIZE);
    const tileCenterX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const diff = centerX - tileCenterX;
    
    if (Math.abs(diff) <= CORNER_TOLERANCE && Math.abs(diff) > 0) {
      const dir = diff > 0 ? -1 : 1;
      const correction = dir * speed;
      if (!isBlocked(player.x + correction, player.y, ctx)) {
        return correction;
      }
    }
  }
  
  return 0;
}

/**
 * 检查玩家是否卡在不可通过的位置（软墙或炸弹内）
 */
function isPlayerStuck(player: Player, state: GameState): boolean {
  const epsilon = 0.1;
  const corners = [
    { x: player.x, y: player.y },
    { x: player.x + PLAYER_SIZE - epsilon, y: player.y },
    { x: player.x, y: player.y + PLAYER_SIZE - epsilon },
    { x: player.x + PLAYER_SIZE - epsilon, y: player.y + PLAYER_SIZE - epsilon },
  ];

  for (const c of corners) {
    const gx = Math.floor(c.x / TILE_SIZE);
    const gy = Math.floor(c.y / TILE_SIZE);
    
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return true;
    
    // 卡在软墙里
    if (state.grid[gy][gx] === TileType.WALL_SOFT) return true;
    
    // 卡在炸弹里（检查是否完全重叠，不是边缘接触）
    const bomb = state.bombs.find(b => b.gridX === gx && b.gridY === gy);
    if (bomb && isColliding(player.x, player.y, gx, gy)) {
      // 检查是否是中心重叠（不只是边缘）
      const playerCenterX = player.x + PLAYER_SIZE / 2;
      const playerCenterY = player.y + PLAYER_SIZE / 2;
      const bombCenterX = bomb.gridX * TILE_SIZE + TILE_SIZE / 2;
      const bombCenterY = bomb.gridY * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.hypot(playerCenterX - bombCenterX, playerCenterY - bombCenterY);
      if (dist < TILE_SIZE / 2) return true;
    }
  }
  
  return false;
}

/**
 * 寻找最近的空地并传送玩家
 * 使用 BFS 从玩家当前位置向外搜索
 */
function teleportToNearestEmpty(player: Player, state: GameState): void {
  const startGx = Math.floor((player.x + PLAYER_SIZE / 2) / TILE_SIZE);
  const startGy = Math.floor((player.y + PLAYER_SIZE / 2) / TILE_SIZE);
  
  // BFS 搜索最近的空地
  const visited = new Set<string>();
  const queue: { gx: number; gy: number }[] = [{ gx: startGx, gy: startGy }];
  visited.add(`${startGx},${startGy}`);
  
  const directions = [
    { dx: 0, dy: -1 }, // 上
    { dx: 0, dy: 1 },  // 下
    { dx: -1, dy: 0 }, // 左
    { dx: 1, dy: 0 },  // 右
  ];
  
  while (queue.length > 0) {
    const { gx, gy } = queue.shift()!;
    
    // 检查这个格子是否是有效的空地
    if (
      gx >= 0 && gx < GRID_W && 
      gy >= 0 && gy < GRID_H &&
      state.grid[gy][gx] === TileType.EMPTY &&
      !state.bombs.some(b => b.gridX === gx && b.gridY === gy)
    ) {
      // 找到了！传送玩家
      const pos = getPixelCoords(gx, gy);
      player.x = pos.x;
      player.y = pos.y;
      return;
    }
    
    // 扩展搜索
    for (const dir of directions) {
      const nx = gx + dir.dx;
      const ny = gy + dir.dy;
      const key = `${nx},${ny}`;
      
      if (!visited.has(key) && nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
        visited.add(key);
        queue.push({ gx: nx, gy: ny });
      }
    }
  }
}

/**
 * 更新单个玩家的移动
 */
export function updatePlayerMovement(
  player: Player,
  input: PlayerInput,
  state: GameState,
  dt: number
): void {
  if (player.state !== PlayerState.NORMAL) return;
  
  // 更新 Ghost 计时器
  const wasGhost = player.ghostTimer > 0;
  if (player.ghostTimer > 0) {
    player.ghostTimer -= dt;
  }
  
  // 幽灵效果刚结束时，检查是否卡在软墙/炸弹里
  if (wasGhost && player.ghostTimer <= 0) {
    if (isPlayerStuck(player, state)) {
      teleportToNearestEmpty(player, state);
    }
  }

  let dx = 0;
  let dy = 0;
  const speed = player.speed;

  if (input.up) dy = -speed;
  if (input.down) dy = speed;
  if (input.left) dx = -speed;
  if (input.right) dx = speed;

  if (dx === 0 && dy === 0) return;

  const ctx: CollisionContext = {
    state,
    canPassSoftWalls: player.ghostTimer > 0,
    canPassBombs: player.ghostTimer > 0,
    canKickBombs: player.canKick,
    currentX: player.x,
    currentY: player.y,
  };

  // 水平移动
  if (dx !== 0) {
    const moveDir = { dx, dy: 0 };
    if (!isBlocked(player.x + dx, player.y, ctx, moveDir)) {
      player.x += dx;
    } else {
      // 尝试角落滑动
      const correction = tryCornerSlide(player, 'x', ctx);
      if (correction !== 0) player.y += correction;
    }
  }

  // 垂直移动（更新 ctx.currentX）
  ctx.currentX = player.x;
  if (dy !== 0) {
    const moveDir = { dx: 0, dy };
    if (!isBlocked(player.x, player.y + dy, ctx, moveDir)) {
      player.y += dy;
    } else {
      // 尝试角落滑动
      const correction = tryCornerSlide(player, 'y', ctx);
      if (correction !== 0) player.x += correction;
    }
  }

  // 更新朝向
  if (dy < 0) player.direction = Direction.UP;
  else if (dy > 0) player.direction = Direction.DOWN;
  else if (dx < 0) player.direction = Direction.LEFT;
  else if (dx > 0) player.direction = Direction.RIGHT;
}

/**
 * 检查敌人移动是否被阻挡
 */
export function isEnemyBlocked(
  nx: number,
  ny: number,
  enemy: Enemy,
  state: GameState
): boolean {
  const ctx: CollisionContext = {
    state,
    canPassSoftWalls: false,
    canPassBombs: false,
    canKickBombs: false,
    currentX: enemy.x,
    currentY: enemy.y,
  };
  
  return isBlocked(nx, ny, ctx);
}

/**
 * 更新敌人移动（仅移动，AI 决策在 EnemyAI 模块）
 */
export function updateEnemyMovement(
  enemy: Enemy,
  state: GameState
): { moved: boolean; hitWall: boolean } {
  let dx = 0;
  let dy = 0;

  switch (enemy.direction) {
    case Direction.UP: dy = -enemy.speed; break;
    case Direction.DOWN: dy = enemy.speed; break;
    case Direction.LEFT: dx = -enemy.speed; break;
    case Direction.RIGHT: dx = enemy.speed; break;
  }

  const nextX = enemy.x + dx;
  const nextY = enemy.y + dy;

  if (!isEnemyBlocked(nextX, nextY, enemy, state)) {
    enemy.x = nextX;
    enemy.y = nextY;
    return { moved: true, hitWall: false };
  }

  return { moved: false, hitWall: true };
}

/**
 * 青蛙跳跃逻辑
 * 可以跳过一格软墙到达空地
 */
export function tryFrogJump(
  enemy: Enemy,
  state: GameState
): boolean {
  if (enemy.type !== EnemyType.FROG) return false;

  const gx = Math.floor((enemy.x + PLAYER_SIZE / 2) / TILE_SIZE);
  const gy = Math.floor((enemy.y + PLAYER_SIZE / 2) / TILE_SIZE);

  let jumpX = 0;
  let jumpY = 0;

  switch (enemy.direction) {
    case Direction.UP: jumpY = -2; break;
    case Direction.DOWN: jumpY = 2; break;
    case Direction.LEFT: jumpX = -2; break;
    case Direction.RIGHT: jumpX = 2; break;
  }

  const targetGx = gx + jumpX;
  const targetGy = gy + jumpY;
  const blockingGx = gx + jumpX / 2;
  const blockingGy = gy + jumpY / 2;

  // 检查跳跃目标是否有效
  if (
    targetGx >= 0 && targetGx < GRID_W &&
    targetGy >= 0 && targetGy < GRID_H &&
    state.grid[targetGy][targetGx] === TileType.EMPTY &&
    state.grid[blockingGy][blockingGx] === TileType.WALL_SOFT
  ) {
    enemy.x = targetGx * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    enemy.y = targetGy * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    return true;
  }

  return false;
}
