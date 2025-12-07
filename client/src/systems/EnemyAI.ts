/**
 * EnemyAI - 敌人行为系统
 * 
 * 职责：敌人 AI 决策、Boss 技能、追踪逻辑
 * 设计原则：每种敌人类型一个行为函数，消除 switch 嵌套
 */

import { GameState, Player, PlayerState, Enemy, EnemyType, Direction, SoundType, Bomb } from '../types';
import { PLAYER_SIZE, TILE_SIZE, GRID_W, GRID_H } from '../constants';
import { updateEnemyMovement, isEnemyBlocked, tryFrogJump } from './MovementSystem';
import { enemyPlaceBomb } from './BombSystem';
import { audioManager } from '../utils/audio';
import { getGridCoords } from '../utils/gameUtils';

// AI 行为配置
const AI_CONFIG = {
  RANDOM_DIR_INTERVAL: { min: 2000, max: 4000 },
  CHASE_RECALC_INTERVAL: 100,  // 追踪敌人更频繁重新计算方向
  CHASE_STUCK_ESCAPE_TIME: 300, // 撞墙后尝试随机方向的时间
  BOSS_SLIME_SPAWN_COOLDOWN: 4000,
  BOSS_MECHA_BOMB_COOLDOWN: 5000,
  BOSS_MECHA_BOMB_RANGE: 5,
  BOSS_MECHA_BOMB_TIMER: 4000,
  BOSS_MECHA_DODGE_THRESHOLD: 2000, // 炸弹剩余时间低于此值时开始躲避
  MAX_MINIONS: 8,
};

/**
 * 获取最近的存活玩家
 */
function findNearestPlayer(enemy: Enemy, players: Player[]): Player | null {
  let nearest: Player | null = null;
  let minDist = Infinity;

  for (const p of players) {
    if (p.state === PlayerState.DEAD) continue;
    
    const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }

  return nearest;
}

/**
 * 随机方向决策
 */
function randomDirection(): Direction {
  const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

/**
 * 检查某个格子是否在炸弹爆炸范围内
 * 返回危险等级（0=安全，数值越高越危险）
 */
function getDangerLevel(gridX: number, gridY: number, bombs: Bomb[]): number {
  let maxDanger = 0;
  
  for (const bomb of bombs) {
    // 中心点
    if (bomb.gridX === gridX && bomb.gridY === gridY) {
      // 即将爆炸的炸弹更危险
      const danger = AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD - bomb.timer + 1000;
      maxDanger = Math.max(maxDanger, danger);
      continue;
    }
    
    // 十字范围检查
    // 水平方向
    if (bomb.gridY === gridY && Math.abs(bomb.gridX - gridX) <= bomb.range) {
      const danger = AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD - bomb.timer + 1000;
      maxDanger = Math.max(maxDanger, danger);
    }
    // 垂直方向
    if (bomb.gridX === gridX && Math.abs(bomb.gridY - gridY) <= bomb.range) {
      const danger = AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD - bomb.timer + 1000;
      maxDanger = Math.max(maxDanger, danger);
    }
  }
  
  return maxDanger;
}

/**
 * 检查敌人当前位置是否危险
 */
function isInDanger(enemy: Enemy, state: GameState): boolean {
  const grid = getGridCoords(enemy.x, enemy.y);
  
  for (const bomb of state.bombs) {
    // 只关注即将爆炸的炸弹
    if (bomb.timer > AI_CONFIG.BOSS_MECHA_DODGE_THRESHOLD) continue;
    
    // 中心点
    if (bomb.gridX === grid.x && bomb.gridY === grid.y) return true;
    
    // 十字范围
    if (bomb.gridY === grid.y && Math.abs(bomb.gridX - grid.x) <= bomb.range) return true;
    if (bomb.gridX === grid.x && Math.abs(bomb.gridY - grid.y) <= bomb.range) return true;
  }
  
  return false;
}

/**
 * 计算躲避炸弹的最佳方向
 * 选择能让敌人远离危险区域的方向
 */
function getDodgeDirection(enemy: Enemy, state: GameState): Direction | null {
  const currentGrid = getGridCoords(enemy.x, enemy.y);
  const currentDanger = getDangerLevel(currentGrid.x, currentGrid.y, state.bombs);
  
  if (currentDanger <= 0) return null; // 当前位置安全
  
  type DirInfo = { dir: Direction; danger: number; blocked: boolean };
  const directions: DirInfo[] = [
    { dir: Direction.UP, danger: 0, blocked: false },
    { dir: Direction.DOWN, danger: 0, blocked: false },
    { dir: Direction.LEFT, danger: 0, blocked: false },
    { dir: Direction.RIGHT, danger: 0, blocked: false },
  ];
  
  // 计算每个方向移动后的危险程度
  for (const d of directions) {
    let targetGridX = currentGrid.x;
    let targetGridY = currentGrid.y;
    let dx = 0, dy = 0;
    
    switch (d.dir) {
      case Direction.UP: 
        dy = -enemy.speed; 
        targetGridY = currentGrid.y - 1;
        break;
      case Direction.DOWN: 
        dy = enemy.speed; 
        targetGridY = currentGrid.y + 1;
        break;
      case Direction.LEFT: 
        dx = -enemy.speed; 
        targetGridX = currentGrid.x - 1;
        break;
      case Direction.RIGHT: 
        dx = enemy.speed; 
        targetGridX = currentGrid.x + 1;
        break;
    }
    
    // 检查该方向是否被阻挡
    d.blocked = isEnemyBlocked(enemy.x + dx, enemy.y + dy, enemy, state);
    
    // 检查目标格子的危险程度
    if (!d.blocked && targetGridX >= 0 && targetGridX < GRID_W && 
        targetGridY >= 0 && targetGridY < GRID_H) {
      d.danger = getDangerLevel(targetGridX, targetGridY, state.bombs);
    } else {
      d.danger = Infinity; // 被阻挡或出界视为极度危险
    }
  }
  
  // 按危险程度排序（低危险优先），同等危险下优先未阻挡的
  directions.sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    return a.danger - b.danger;
  });
  
  const best = directions[0];
  
  // 只有当最佳方向比当前位置更安全时才躲避
  if (!best.blocked && best.danger < currentDanger) {
    return best.dir;
  }
  
  // 如果没有更安全的方向，尝试任意未阻挡方向逃离
  const unblocked = directions.filter(d => !d.blocked);
  if (unblocked.length > 0) {
    return unblocked[0].dir;
  }
  
  return null;
}

/**
 * 追踪玩家方向决策（带智能避障）
 * 优先选择能接近玩家且不被阻挡的方向
 */
function chaseDirection(enemy: Enemy, target: Player, state: GameState): Direction {
  const diffX = target.x - enemy.x;
  const diffY = target.y - enemy.y;
  
  // 计算所有可能方向的优先级
  type DirInfo = { dir: Direction; priority: number; blocked: boolean };
  const directions: DirInfo[] = [
    { dir: Direction.UP, priority: diffY < 0 ? Math.abs(diffY) : -1, blocked: false },
    { dir: Direction.DOWN, priority: diffY > 0 ? Math.abs(diffY) : -1, blocked: false },
    { dir: Direction.LEFT, priority: diffX < 0 ? Math.abs(diffX) : -1, blocked: false },
    { dir: Direction.RIGHT, priority: diffX > 0 ? Math.abs(diffX) : -1, blocked: false },
  ];
  
  // 检查每个方向是否被阻挡
  for (const d of directions) {
    let dx = 0, dy = 0;
    switch (d.dir) {
      case Direction.UP: dy = -enemy.speed; break;
      case Direction.DOWN: dy = enemy.speed; break;
      case Direction.LEFT: dx = -enemy.speed; break;
      case Direction.RIGHT: dx = enemy.speed; break;
    }
    d.blocked = isEnemyBlocked(enemy.x + dx, enemy.y + dy, enemy, state);
  }
  
  // 排序：优先选择 priority 高且不被阻挡的方向
  directions.sort((a, b) => {
    // 未阻挡的优先
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    // 同等阻挡状态下，priority 高的优先
    return b.priority - a.priority;
  });
  
  // 如果最佳方向被阻挡，尝试垂直/水平切换
  const best = directions[0];
  if (best.blocked) {
    // 所有好方向都被阻挡，尝试随机一个未阻挡的
    const unblocked = directions.filter(d => !d.blocked);
    if (unblocked.length > 0) {
      return unblocked[Math.floor(Math.random() * unblocked.length)].dir;
    }
  }
  
  return best.dir;
}

// ========== 各类型敌人 AI ==========

/**
 * 气球怪 - 随机移动
 */
function updateBalloon(enemy: Enemy, state: GameState, dt: number): void {
  enemy.changeDirTimer -= dt;
  
  if (enemy.changeDirTimer <= 0) {
    enemy.direction = randomDirection();
    enemy.changeDirTimer = AI_CONFIG.RANDOM_DIR_INTERVAL.min + 
      Math.random() * (AI_CONFIG.RANDOM_DIR_INTERVAL.max - AI_CONFIG.RANDOM_DIR_INTERVAL.min);
  }

  const result = updateEnemyMovement(enemy, state);
  if (result.hitWall) {
    // 撞墙立即换向
    enemy.direction = randomDirection();
  }
}

/**
 * 幽灵 - 追踪玩家
 */
function updateGhost(enemy: Enemy, state: GameState, dt: number): void {
  enemy.changeDirTimer -= dt;
  
  const target = findNearestPlayer(enemy, state.players);
  
  if (enemy.changeDirTimer <= 0) {
    if (target) {
      enemy.direction = chaseDirection(enemy, target, state);
    } else {
      enemy.direction = randomDirection();
    }
    enemy.changeDirTimer = AI_CONFIG.CHASE_RECALC_INTERVAL;
  }

  const result = updateEnemyMovement(enemy, state);
  if (result.hitWall) {
    // 撞墙后短暂尝试随机方向避障
    enemy.direction = randomDirection();
    enemy.changeDirTimer = AI_CONFIG.CHASE_STUCK_ESCAPE_TIME;
  }
}

/**
 * 小兵 - 快速追踪
 */
function updateMinion(enemy: Enemy, state: GameState, dt: number): void {
  // 与 Ghost 相同逻辑
  updateGhost(enemy, state, dt);
}

/**
 * 青蛙 - 可跳过软墙
 */
function updateFrog(enemy: Enemy, state: GameState, dt: number): void {
  enemy.changeDirTimer -= dt;
  
  if (enemy.changeDirTimer <= 0) {
    enemy.direction = randomDirection();
    enemy.changeDirTimer = AI_CONFIG.RANDOM_DIR_INTERVAL.min + 
      Math.random() * (AI_CONFIG.RANDOM_DIR_INTERVAL.max - AI_CONFIG.RANDOM_DIR_INTERVAL.min);
  }

  // 先检查是否被阻挡
  let dx = 0, dy = 0;
  switch (enemy.direction) {
    case Direction.UP: dy = -enemy.speed; break;
    case Direction.DOWN: dy = enemy.speed; break;
    case Direction.LEFT: dx = -enemy.speed; break;
    case Direction.RIGHT: dx = enemy.speed; break;
  }

  const nextX = enemy.x + dx;
  const nextY = enemy.y + dy;

  if (isEnemyBlocked(nextX, nextY, enemy, state)) {
    // 尝试跳跃
    if (tryFrogJump(enemy, state)) {
      enemy.changeDirTimer = 1000; // 跳跃后短暂冷却
    } else {
      // 无法跳跃，立即换向
      enemy.direction = randomDirection();
    }
  } else {
    updateEnemyMovement(enemy, state);
  }
}

/**
 * 坦克 - 缓慢追踪
 */
function updateTank(enemy: Enemy, state: GameState, dt: number): void {
  // 与 Ghost 相同逻辑
  updateGhost(enemy, state, dt);
}

/**
 * Boss: 史莱姆 - 追踪 + 召唤小兵
 */
function updateBossSlime(
  enemy: Enemy, 
  state: GameState, 
  dt: number,
  spawnMinion: (state: GameState) => void
): void {
  enemy.changeDirTimer -= dt;
  enemy.actionTimer -= dt;

  // 追踪玩家
  const target = findNearestPlayer(enemy, state.players);
  if (enemy.changeDirTimer <= 0) {
    if (target) {
      enemy.direction = chaseDirection(enemy, target, state);
    } else {
      enemy.direction = randomDirection();
    }
    enemy.changeDirTimer = AI_CONFIG.CHASE_RECALC_INTERVAL;
  }

  // 技能：召唤小兵
  if (enemy.actionTimer <= 0) {
    if (state.enemies.length < AI_CONFIG.MAX_MINIONS) {
      spawnMinion(state);
    }
    enemy.actionTimer = AI_CONFIG.BOSS_SLIME_SPAWN_COOLDOWN;
  }

  const result = updateEnemyMovement(enemy, state);
  if (result.hitWall) {
    // 撞墙后短暂尝试随机方向避障
    enemy.direction = randomDirection();
    enemy.changeDirTimer = AI_CONFIG.CHASE_STUCK_ESCAPE_TIME;
  }
}

/**
 * Boss: 机甲 - 追踪 + 放置大型炸弹 + 智能躲避炸弹
 */
function updateBossMecha(enemy: Enemy, state: GameState, dt: number): void {
  enemy.changeDirTimer -= dt;
  enemy.actionTimer -= dt;

  // 优先级1: 躲避炸弹（生存本能）
  const dodgeDir = getDodgeDirection(enemy, state);
  if (dodgeDir !== null) {
    enemy.direction = dodgeDir;
    enemy.changeDirTimer = 50; // 躲避时快速重新评估
    updateEnemyMovement(enemy, state);
    return; // 躲避时不放炸弹，不追踪
  }

  // 优先级2: 追踪玩家
  const target = findNearestPlayer(enemy, state.players);
  if (enemy.changeDirTimer <= 0) {
    if (target) {
      enemy.direction = chaseDirection(enemy, target, state);
    } else {
      enemy.direction = randomDirection();
    }
    enemy.changeDirTimer = AI_CONFIG.CHASE_RECALC_INTERVAL;
  }

  // 技能：放置大型炸弹（只有安全时才放）
  if (enemy.actionTimer <= 0 && !isInDanger(enemy, state)) {
    enemyPlaceBomb(
      enemy.x, 
      enemy.y, 
      AI_CONFIG.BOSS_MECHA_BOMB_RANGE, 
      AI_CONFIG.BOSS_MECHA_BOMB_TIMER, 
      state
    );
    enemy.actionTimer = AI_CONFIG.BOSS_MECHA_BOMB_COOLDOWN;
  }

  const result = updateEnemyMovement(enemy, state);
  if (result.hitWall) {
    // 撞墙后短暂尝试随机方向避障
    enemy.direction = randomDirection();
    enemy.changeDirTimer = AI_CONFIG.CHASE_STUCK_ESCAPE_TIME;
  }
}

// ========== 主更新函数 ==========

export interface EnemyAICallbacks {
  spawnMinion: (state: GameState) => void;
}

/**
 * 更新所有敌人 AI
 */
export function updateEnemyAI(
  state: GameState, 
  dt: number,
  callbacks: EnemyAICallbacks
): void {
  for (const enemy of state.enemies) {
    // 更新无敌计时器
    if (enemy.invincibleTimer > 0) {
      enemy.invincibleTimer -= dt;
    }

    // 根据类型分发到对应 AI
    switch (enemy.type) {
      case EnemyType.BALLOON:
        updateBalloon(enemy, state, dt);
        break;
      case EnemyType.GHOST:
        updateGhost(enemy, state, dt);
        break;
      case EnemyType.MINION:
        updateMinion(enemy, state, dt);
        break;
      case EnemyType.FROG:
        updateFrog(enemy, state, dt);
        break;
      case EnemyType.TANK:
        updateTank(enemy, state, dt);
        break;
      case EnemyType.BOSS_SLIME:
        updateBossSlime(enemy, state, dt, callbacks.spawnMinion);
        break;
      case EnemyType.BOSS_MECHA:
        updateBossMecha(enemy, state, dt);
        break;
    }
  }
}
