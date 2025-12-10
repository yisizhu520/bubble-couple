/**
 * EnemyAI - 敌人行为系统
 * 
 * 职责：敌人 AI 决策、Boss 技能、追踪逻辑
 * 设计原则：每种敌人类型一个行为函数，消除 switch 嵌套
 * 
 * 使用共享模块中的核心 AI 算法，本文件负责：
 * - 将游戏状态适配到共享模块接口
 * - 各类型敌人的具体行为逻辑
 * - 与其他系统（MovementSystem, BombSystem）的集成
 */

import { GameState, Player, PlayerState, Enemy, EnemyType, Direction } from '../types';
import { updateEnemyMovement, isEnemyBlocked, tryFrogJump } from './MovementSystem';
import { enemyPlaceBomb } from './BombSystem';
import {
  AI_CONFIG,
  findNearestTarget,
  randomDirection as sharedRandomDirection,
  randomDirInterval,
  isInDanger as sharedIsInDanger,
  getDodgeDirection as sharedGetDodgeDirection,
  getChaseDirection as sharedGetChaseDirection,
  type DirectionString,
  type AIBombLike,
} from '../shared';

// ============================================================================
// ADAPTER FUNCTIONS - 适配共享模块到本地类型
// ============================================================================

/** 将 DirectionString 转换为 Direction 枚举 */
function toDirection(dir: DirectionString): Direction {
  switch (dir) {
    case 'UP': return Direction.UP;
    case 'DOWN': return Direction.DOWN;
    case 'LEFT': return Direction.LEFT;
    case 'RIGHT': return Direction.RIGHT;
    default: return Direction.NONE;
  }
}

/** 随机方向（返回 Direction 枚举）*/
function randomDirection(): Direction {
  return toDirection(sharedRandomDirection());
}

/** 获取最近的存活玩家 */
function findNearestPlayer(enemy: Enemy, players: Player[]): Player | null {
  return findNearestTarget(enemy, players, (p) => p.state !== PlayerState.DEAD);
}

/** 创建敌人碰撞检测器 */
function createEnemyCollisionChecker(enemy: Enemy, state: GameState) {
  return (nx: number, ny: number) => isEnemyBlocked(nx, ny, enemy, state);
}

/** 检查敌人是否处于危险中 */
function isInDanger(enemy: Enemy, state: GameState): boolean {
  return sharedIsInDanger(enemy, state.bombs as AIBombLike[]);
}

/** 计算躲避方向 */
function getDodgeDirection(enemy: Enemy, state: GameState): Direction | null {
  const dir = sharedGetDodgeDirection(
    enemy,
    state.bombs as AIBombLike[],
    createEnemyCollisionChecker(enemy, state)
  );
  return dir ? toDirection(dir) : null;
}

/** 追踪玩家方向 */
function chaseDirection(enemy: Enemy, target: Player, state: GameState): Direction {
  const dir = sharedGetChaseDirection(
    enemy,
    target,
    createEnemyCollisionChecker(enemy, state)
  );
  return toDirection(dir);
}

// ========== 各类型敌人 AI ==========

/**
 * 气球怪 - 随机移动
 */
function updateBalloon(enemy: Enemy, state: GameState, dt: number): void {
  enemy.changeDirTimer -= dt;
  
  if (enemy.changeDirTimer <= 0) {
    enemy.direction = randomDirection();
    enemy.changeDirTimer = randomDirInterval();
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
    enemy.changeDirTimer = randomDirInterval();
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
