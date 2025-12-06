/**
 * CombatSystem - 战斗交互系统
 * 
 * 职责：伤害判定、玩家状态转换、道具拾取、救援机制
 * 设计原则：所有伤害/治疗都通过此系统，便于统一管理
 */

import { GameState, Player, PlayerState, Enemy, ItemType, SoundType } from '../types';
import { PLAYER_SIZE, TRAPPED_DURATION_MS, INVINCIBLE_DURATION_MS, MAX_SPEED } from '../constants';
import { getGridCoords, checkPlayerCollision } from '../utils/gameUtils';
import { audioManager } from '../utils/audio';

/**
 * 处理玩家受到伤害
 * 统一入口：爆炸、敌人碰撞都走这里
 */
export function damagePlayer(player: Player): void {
  // 护盾吸收
  if (player.hasShield) {
    player.hasShield = false;
    player.invincibleTimer = 1000;
    audioManager.play(SoundType.SHIELD_LOST);
    return;
  }

  if (player.state === PlayerState.NORMAL) {
    // 正常 → 被困
    player.state = PlayerState.TRAPPED;
    player.trappedTimer = TRAPPED_DURATION_MS;
    player.invincibleTimer = 1000;
    audioManager.play(SoundType.TRAPPED);
  } else if (player.state === PlayerState.TRAPPED && player.invincibleTimer <= 0) {
    // 被困再受伤 → 死亡
    player.state = PlayerState.DEAD;
    audioManager.play(SoundType.DIE);
  }
}

/**
 * 检查玩家是否在爆炸范围内
 */
export function checkExplosionDamage(state: GameState, dt: number): void {
  for (const player of state.players) {
    if (player.state === PlayerState.DEAD) continue;
    
    // 更新无敌时间
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
      continue; // 无敌期间不受伤
    }

    // 检查爆炸碰撞
    const pGrid = getGridCoords(player.x, player.y);
    const inExplosion = state.explosions.some(
      e => e.gridX === pGrid.x && e.gridY === pGrid.y
    );

    if (inExplosion) {
      damagePlayer(player);
    }

    // 更新被困计时器
    if (player.state === PlayerState.TRAPPED) {
      player.trappedTimer -= dt;
      if (player.trappedTimer <= 0) {
        player.state = PlayerState.DEAD;
        audioManager.play(SoundType.DIE);
      }
    }
  }
}

/**
 * 处理敌人受到爆炸伤害
 * 返回被击杀的敌人列表
 */
export function checkEnemyExplosionDamage(state: GameState): Enemy[] {
  const killedEnemies: Enemy[] = [];
  const survivingEnemies: Enemy[] = [];

  for (const enemy of state.enemies) {
    if (enemy.invincibleTimer > 0) {
      survivingEnemies.push(enemy);
      continue;
    }

    const eGrid = getGridCoords(enemy.x, enemy.y);
    const explosion = state.explosions.find(
      e => e.gridX === eGrid.x && e.gridY === eGrid.y
    );

    if (explosion) {
      enemy.hp -= 1;
      enemy.invincibleTimer = 500;

      // 记录击杀者得分
      if (explosion.ownerId > 0 && enemy.hp <= 0) {
        const killer = state.players.find(p => p.id === explosion.ownerId);
        if (killer) killer.score += 1;
      }

      if (enemy.hp <= 0) {
        killedEnemies.push(enemy);
        audioManager.play(SoundType.DIE);
      } else {
        audioManager.play(SoundType.ENEMY_HIT);
        survivingEnemies.push(enemy);
      }
    } else {
      survivingEnemies.push(enemy);
    }
  }

  state.enemies = survivingEnemies;
  return killedEnemies;
}

/**
 * 检查玩家与敌人碰撞
 */
export function checkPlayerEnemyCollision(state: GameState): void {
  for (const player of state.players) {
    if (player.state === PlayerState.DEAD) continue;
    if (player.invincibleTimer > 0) continue;

    for (const enemy of state.enemies) {
      if (checkPlayerCollision(player, enemy)) {
        damagePlayer(player);
        break; // 一帧只处理一次伤害
      }
    }
  }
}

/**
 * 检查玩家互救（PVP/PVE 模式下，正常玩家碰到被困玩家可以救援）
 */
export function checkPlayerRescue(state: GameState): void {
  if (state.players.length < 2) return;

  const p1 = state.players[0];
  const p2 = state.players[1];

  if (!checkPlayerCollision(p1, p2)) return;

  // P1 救 P2
  if (p1.state === PlayerState.NORMAL && p2.state === PlayerState.TRAPPED) {
    p2.state = PlayerState.NORMAL;
    p2.invincibleTimer = INVINCIBLE_DURATION_MS;
    audioManager.play(SoundType.RESCUE);
  }
  // P2 救 P1
  else if (p2.state === PlayerState.NORMAL && p1.state === PlayerState.TRAPPED) {
    p1.state = PlayerState.NORMAL;
    p1.invincibleTimer = INVINCIBLE_DURATION_MS;
    audioManager.play(SoundType.RESCUE);
  }
}

/**
 * 处理道具拾取
 */
export function checkItemPickup(state: GameState): void {
  for (const player of state.players) {
    if (player.state !== PlayerState.NORMAL) continue;

    const center = getGridCoords(player.x, player.y);
    const key = `${center.x},${center.y}`;
    const item = state.items[key];

    if (!item) continue;

    // 应用道具效果
    switch (item) {
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
        player.ghostTimer = 10000; // GHOST_DURATION_MS
        break;
      case ItemType.SHIELD:
        player.hasShield = true;
        break;
    }

    audioManager.play(SoundType.ITEM_GET);
    delete state.items[key];
  }
}

/**
 * 综合战斗更新
 */
export function updateCombat(state: GameState, dt: number, hasPVEEnemies: boolean): void {
  // 1. 道具拾取
  checkItemPickup(state);

  // 2. 爆炸伤害 - 玩家
  checkExplosionDamage(state, dt);

  // 3. 爆炸伤害 - 敌人
  if (hasPVEEnemies) {
    checkEnemyExplosionDamage(state);
  }

  // 4. 玩家 vs 敌人碰撞
  if (hasPVEEnemies) {
    checkPlayerEnemyCollision(state);
  }

  // 5. 玩家互救
  checkPlayerRescue(state);
}
