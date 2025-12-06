/**
 * LevelManager - 关卡管理系统
 * 
 * 职责：关卡初始化、敌人生成、胜负判定、关卡进度
 * 设计原则：关卡是数据，不是代码逻辑
 */

import { 
  GameState, Player, PlayerState, Enemy, EnemyType, 
  TileType, Direction, GameMode, SoundType, MusicTheme 
} from '../types';
import { 
  GRID_W, GRID_H, TILE_SIZE, BASE_SPEED, PLAYER_SIZE,
  LEVEL_CONFIGS, ENEMY_STATS, LevelConfig
} from '../constants';
import { createInitialGrid, getPixelCoords } from '../utils/gameUtils';
import { audioManager } from '../utils/audio';

/**
 * 生成敌人在有效位置
 */
export function spawnEnemy(
  grid: TileType[][],
  existingEnemies: Enemy[],
  type: EnemyType,
  idPrefix: string
): Enemy | null {
  const MAX_ATTEMPTS = 100;

  for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
    const ex = Math.floor(Math.random() * GRID_W);
    const ey = Math.floor(Math.random() * GRID_H);

    // 检查是否为空地
    if (grid[ey][ex] !== TileType.EMPTY) continue;

    // 避开玩家出生点
    if ((ex < 5 && ey < 5) || (ex > GRID_W - 5 && ey > GRID_H - 5)) continue;

    // 避开已有敌人
    const tooClose = existingEnemies.some(
      e => Math.abs(e.x - ex * TILE_SIZE) < TILE_SIZE && 
           Math.abs(e.y - ey * TILE_SIZE) < TILE_SIZE
    );
    if (tooClose) continue;

    const startPos = getPixelCoords(ex, ey);
    const stats = ENEMY_STATS[type];

    return {
      id: `${idPrefix}-${Date.now()}-${attempts}`,
      type,
      x: startPos.x,
      y: startPos.y,
      direction: Direction.DOWN,
      speed: stats.speed,
      hp: stats.hp,
      maxHp: stats.hp,
      changeDirTimer: 0,
      actionTimer: 2000,
      invincibleTimer: 0,
    };
  }

  return null;
}

/**
 * 在指定位置生成敌人（Boss 召唤小兵用）
 */
export function spawnMinionAtPosition(
  x: number,
  y: number,
  state: GameState
): Enemy | null {
  const stats = ENEMY_STATS[EnemyType.MINION];

  return {
    id: `minion-${Date.now()}`,
    type: EnemyType.MINION,
    x,
    y,
    direction: Direction.DOWN,
    speed: stats.speed,
    hp: stats.hp,
    maxHp: stats.hp,
    changeDirTimer: 0,
    actionTimer: 1000,
    invincibleTimer: 0,
  };
}

/**
 * 创建玩家
 */
function createPlayer(
  id: number,
  x: number,
  y: number,
  color: string,
  existingScore: number = 0
): Player {
  return {
    id,
    x,
    y,
    color,
    state: PlayerState.NORMAL,
    direction: id === 1 ? Direction.DOWN : Direction.UP,
    speed: BASE_SPEED,
    maxBombs: 1,
    bombRange: 1,
    activeBombs: 0,
    score: existingScore,
    trappedTimer: 0,
    invincibleTimer: 0,
    canKick: false,
    hasShield: false,
    ghostTimer: 0,
  };
}

/**
 * 初始化关卡
 */
export function initLevel(
  levelIndex: number,
  mode: GameMode,
  existingPlayers?: Player[]
): GameState {
  const config = LEVEL_CONFIGS[levelIndex - 1] || LEVEL_CONFIGS[0];
  const { grid, items } = createInitialGrid(config.wallDensity);

  // 玩家出生点
  const p1Start = getPixelCoords(1, 1);
  const p2Start = getPixelCoords(GRID_W - 2, GRID_H - 2);

  // 保留分数
  const p1Score = existingPlayers?.find(p => p.id === 1)?.score || 0;
  const p2Score = existingPlayers?.find(p => p.id === 2)?.score || 0;

  // 创建玩家
  const players: Player[] = [
    createPlayer(1, p1Start.x, p1Start.y, '#3b82f6', p1Score),
  ];

  // 双人模式添加玩家2
  if (mode === GameMode.PVE || mode === GameMode.PVP) {
    players.push(
      createPlayer(2, p2Start.x, p2Start.y, '#ef4444', p2Score)
    );
  }

  // 生成敌人（PVE/SOLO 模式）
  const enemies: Enemy[] = [];
  if (mode === GameMode.PVE || mode === GameMode.SOLO) {
    config.enemies.forEach((type, idx) => {
      const enemy = spawnEnemy(grid, enemies, type, `init-${idx}`);
      if (enemy) enemies.push(enemy);
    });
  }

  return {
    grid,
    items,
    players,
    enemies,
    bombs: [],
    explosions: [],
    timeLeft: 180,
    gameOver: false,
    winner: null,
    bossSpawned: false,
    level: levelIndex,
    isLevelClear: false,
  };
}

/**
 * 检查是否需要生成 Boss
 */
export function checkBossSpawn(state: GameState): boolean {
  const config = LEVEL_CONFIGS[state.level - 1] || LEVEL_CONFIGS[0];

  // Boss 生成条件：所有普通敌人清除，且该关有 Boss，且尚未生成
  if (state.enemies.length === 0 && !state.bossSpawned && config.boss) {
    const boss = spawnEnemy(state.grid, state.enemies, config.boss, 'boss');
    if (boss) {
      state.enemies.push(boss);
      state.bossSpawned = true;
      audioManager.play(SoundType.BOSS_SPAWN);
      audioManager.playBGM(MusicTheme.BOSS);
      return true;
    }
  }

  return false;
}

export interface WinConditionResult {
  gameOver: boolean;
  winner: number | null;
  levelClear: boolean;
}

/**
 * 检查游戏胜负条件
 */
export function checkWinCondition(state: GameState, mode: GameMode): WinConditionResult {
  const activePlayers = state.players.filter(p => p.state !== PlayerState.DEAD);
  const trappedPlayers = state.players.filter(p => p.state === PlayerState.TRAPPED);

  // PVE / SOLO 模式
  if (mode === GameMode.PVE || mode === GameMode.SOLO) {
    const config = LEVEL_CONFIGS[state.level - 1] || LEVEL_CONFIGS[0];
    const allEnemiesDead = state.enemies.length === 0;
    const bossConditionMet = !config.boss || state.bossSpawned;

    // 胜利：所有敌人（包括 Boss）被消灭
    if (allEnemiesDead && bossConditionMet && !state.gameOver) {
      if (state.level >= LEVEL_CONFIGS.length) {
        // 最终关卡通关
        return { gameOver: true, winner: 12, levelClear: false };
      } else if (!state.isLevelClear) {
        // 当前关卡通关，进入下一关
        return { gameOver: false, winner: null, levelClear: true };
      }
    }

    // 失败：所有玩家死亡
    if (activePlayers.length === 0) {
      return { gameOver: true, winner: 0, levelClear: false };
    }
  }

  // PVP 模式
  if (mode === GameMode.PVP) {
    // 平局：同时死亡
    if (activePlayers.length === 0) {
      return { gameOver: true, winner: 0, levelClear: false };
    }

    // 胜利：只剩一人存活（非被困状态）
    if (activePlayers.length === 1 && trappedPlayers.length === 0) {
      return { gameOver: true, winner: activePlayers[0].id, levelClear: false };
    }
  }

  return { gameOver: false, winner: null, levelClear: false };
}

/**
 * 播放关卡开始音效和音乐
 */
export function playLevelStartAudio(levelIndex: number, mode: GameMode): void {
  if (levelIndex === 1) {
    audioManager.play(SoundType.GAME_START);
  } else {
    audioManager.play(SoundType.RESCUE);
  }

  if (mode === GameMode.PVP) {
    audioManager.playBGM(MusicTheme.PVP);
  } else {
    audioManager.playBGM(MusicTheme.PVE);
  }
}

/**
 * 处理关卡通关
 */
export function handleLevelClear(state: GameState): void {
  state.isLevelClear = true;
  audioManager.play(SoundType.LEVEL_CLEAR);
  audioManager.stopBGM();
}

/**
 * 处理游戏结束
 */
export function handleGameOver(state: GameState, winner: number | null): void {
  state.gameOver = true;
  state.winner = winner;
  audioManager.stopBGM();
  audioManager.play(SoundType.GAME_OVER);
}
