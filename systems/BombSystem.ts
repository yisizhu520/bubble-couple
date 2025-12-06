/**
 * BombSystem - 炸弹与爆炸系统
 * 
 * 职责：炸弹放置、滑动物理、爆炸传播、连锁反应
 * 设计原则：爆炸是纯数据变换，不涉及伤害判定
 */

import { GameState, Player, PlayerState, Bomb, Explosion, TileType, SoundType } from '../types';
import { GRID_W, GRID_H, TILE_SIZE, PLAYER_SIZE, BOMB_TIMER_MS, EXPLOSION_DURATION_MS } from '../constants';
import { getGridCoords } from '../utils/gameUtils';
import { isColliding } from '../utils/gameUtils';
import { audioManager } from '../utils/audio';

/**
 * 尝试放置炸弹
 */
export function tryPlaceBomb(player: Player, state: GameState): boolean {
  if (player.state !== PlayerState.NORMAL) return false;
  if (player.activeBombs >= player.maxBombs) return false;

  const gridCoords = getGridCoords(player.x, player.y);
  
  // 检查该位置是否已有炸弹
  const exists = state.bombs.some(
    b => b.gridX === gridCoords.x && b.gridY === gridCoords.y
  );
  
  if (exists) return false;

  state.bombs.push({
    id: Math.random().toString(36),
    ownerId: player.id,
    gridX: gridCoords.x,
    gridY: gridCoords.y,
    x: gridCoords.x * TILE_SIZE,
    y: gridCoords.y * TILE_SIZE,
    vx: 0,
    vy: 0,
    range: player.bombRange,
    timer: BOMB_TIMER_MS,
  });

  player.activeBombs++;
  audioManager.play(SoundType.BOMB_PLACE);
  return true;
}

/**
 * 更新炸弹滑动物理
 */
export function updateBombPhysics(bomb: Bomb, state: GameState): void {
  if (bomb.vx === 0 && bomb.vy === 0) return;

  const nextX = bomb.x + bomb.vx;
  const nextY = bomb.y + bomb.vy;
  const centerX = nextX + TILE_SIZE / 2;
  const centerY = nextY + TILE_SIZE / 2;
  const gx = Math.floor(centerX / TILE_SIZE);
  const gy = Math.floor(centerY / TILE_SIZE);

  let blocked = false;

  // 边界检查
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) {
    blocked = true;
  }
  // 墙壁检查
  else if (state.grid[gy][gx] !== TileType.EMPTY) {
    blocked = true;
  }
  // 其他炸弹碰撞
  else if (state.bombs.find(ob => ob !== bomb && ob.gridX === gx && ob.gridY === gy)) {
    blocked = true;
  }
  // 玩家碰撞
  else if (state.players.some(p => isColliding(p.x, p.y, gx, gy))) {
    blocked = true;
  }
  // 敌人碰撞
  else if (state.enemies.some(e => isColliding(e.x, e.y, gx, gy))) {
    blocked = true;
  }

  if (blocked) {
    bomb.vx = 0;
    bomb.vy = 0;
    bomb.x = bomb.gridX * TILE_SIZE;
    bomb.y = bomb.gridY * TILE_SIZE;
  } else {
    bomb.x = nextX;
    bomb.y = nextY;
    bomb.gridX = gx;
    bomb.gridY = gy;
  }
}

/**
 * 触发单个炸弹爆炸
 * 递归处理连锁反应
 */
function triggerExplosion(
  bomb: Bomb,
  state: GameState,
  explosions: Explosion[],
  processedBombs: Set<string>
): void {
  // 防止重复处理
  if (processedBombs.has(bomb.id)) return;
  processedBombs.add(bomb.id);

  // 减少玩家活跃炸弹计数
  if (bomb.ownerId > 0) {
    const owner = state.players.find(p => p.id === bomb.ownerId);
    if (owner) owner.activeBombs = Math.max(0, owner.activeBombs - 1);
  }

  // 中心爆炸
  explosions.push({
    id: Math.random().toString(),
    ownerId: bomb.ownerId,
    gridX: bomb.gridX,
    gridY: bomb.gridY,
    timer: EXPLOSION_DURATION_MS,
  });

  // 四个方向传播
  const directions = [
    { dx: 0, dy: -1 },  // 上
    { dx: 0, dy: 1 },   // 下
    { dx: -1, dy: 0 },  // 左
    { dx: 1, dy: 0 },   // 右
  ];

  directions.forEach(dir => {
    for (let i = 1; i <= bomb.range; i++) {
      const tx = bomb.gridX + dir.dx * i;
      const ty = bomb.gridY + dir.dy * i;

      // 边界检查
      if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) break;
      
      // 硬墙阻挡
      if (state.grid[ty][tx] === TileType.WALL_HARD) break;

      // 软墙：炸毁并停止（软墙吸收爆炸，不产生伤害区域）
      if (state.grid[ty][tx] === TileType.WALL_SOFT) {
        state.grid[ty][tx] = TileType.EMPTY;
        // 注意：不在软墙位置添加爆炸效果
        // 软墙作为挡板吸收了爆炸，后面的敌人不会被炸死
        break;
      }

      // 连锁引爆其他炸弹
      const hitBombIndex = state.bombs.findIndex(
        b => b.gridX === tx && b.gridY === ty && !processedBombs.has(b.id)
      );
      
      if (hitBombIndex !== -1) {
        const hitBomb = state.bombs[hitBombIndex];
        state.bombs.splice(hitBombIndex, 1);
        triggerExplosion(hitBomb, state, explosions, processedBombs);
      }

      // 正常传播
      explosions.push({
        id: Math.random().toString(),
        ownerId: bomb.ownerId,
        gridX: tx,
        gridY: ty,
        timer: EXPLOSION_DURATION_MS,
      });
    }
  });
}

/**
 * 更新所有炸弹状态
 * 返回新产生的爆炸列表
 */
export function updateBombs(state: GameState, dt: number): Explosion[] {
  const newExplosions: Explosion[] = [];
  const processedBombs = new Set<string>();

  // 更新炸弹物理
  state.bombs.forEach(b => updateBombPhysics(b, state));

  // 更新计时器
  state.bombs.forEach(b => {
    b.timer -= dt;
  });

  // 收集到期炸弹
  const explodedBombs = state.bombs.filter(b => b.timer <= 0);
  state.bombs = state.bombs.filter(b => b.timer > 0);

  // 处理爆炸
  explodedBombs.forEach(bomb => {
    triggerExplosion(bomb, state, newExplosions, processedBombs);
  });

  // 播放音效
  if (newExplosions.length > 0) {
    audioManager.play(SoundType.EXPLOSION);
  }

  return newExplosions;
}

/**
 * 更新爆炸效果计时器
 */
export function updateExplosions(state: GameState, dt: number): void {
  state.explosions = state.explosions.filter(e => {
    e.timer -= dt;
    return e.timer > 0;
  });
}

/**
 * 敌人/Boss 放置炸弹
 */
export function enemyPlaceBomb(
  x: number, 
  y: number, 
  range: number, 
  timer: number, 
  state: GameState
): boolean {
  const gx = Math.floor((x + PLAYER_SIZE / 2) / TILE_SIZE);
  const gy = Math.floor((y + PLAYER_SIZE / 2) / TILE_SIZE);

  const exists = state.bombs.some(b => b.gridX === gx && b.gridY === gy);
  if (exists) return false;

  state.bombs.push({
    id: `enemy-bomb-${Date.now()}`,
    ownerId: 0, // 0 = 敌人/中立
    gridX: gx,
    gridY: gy,
    x: gx * TILE_SIZE,
    y: gy * TILE_SIZE,
    vx: 0,
    vy: 0,
    range,
    timer,
  });

  audioManager.play(SoundType.BOMB_PLACE);
  return true;
}
