/**
 * useGameEngine - 游戏引擎 Hook（重构版）
 * 
 * 职责：协调各个 System 模块，管理游戏主循环
 * 设计原则：Hook 只负责协调，业务逻辑在 Systems 中
 * 
 * 模块依赖：
 * - InputSystem: 输入采集
 * - MovementSystem: 移动与碰撞
 * - BombSystem: 炸弹与爆炸
 * - EnemyAI: 敌人行为
 * - CombatSystem: 战斗交互
 * - LevelManager: 关卡管理
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameMode, EnemyType } from '../types';
import { audioManager } from '../utils/audio';

// 导入所有系统
import {
  // 输入
  initKeyboardListeners,
  getInputState,
  // 移动
  updatePlayerMovement,
  // 炸弹
  tryPlaceBomb,
  updateBombs,
  updateExplosions,
  // 敌人
  updateEnemyAI,
  // 战斗
  updateCombat,
  // 关卡
  initLevel,
  spawnMinionAtPosition,
  checkBossSpawn,
  checkWinCondition,
  playLevelStartAudio,
  handleLevelClear,
  handleGameOver,
} from '../systems';

export const useGameEngine = (mode: GameMode, onGameOver: (winner: number | null) => void) => {
  // 游戏状态 Ref（避免 React 渲染开销）
  const gameStateRef = useRef<GameState | null>(null);
  
  // HUD 状态（低频率更新 UI）
  const [hudState, setHudState] = useState<GameState | null>(null);
  
  // 动画帧
  const reqIdRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // ========== 关卡管理 ==========

  const startLevel = useCallback((levelIndex: number) => {
    const existingPlayers = gameStateRef.current?.players;
    gameStateRef.current = initLevel(levelIndex, mode, existingPlayers);
    playLevelStartAudio(levelIndex, mode);
  }, [mode]);

  const initGame = useCallback(() => {
    if (reqIdRef.current) {
      cancelAnimationFrame(reqIdRef.current);
    }
    startLevel(1);
    lastTimeRef.current = 0;
    reqIdRef.current = requestAnimationFrame(update);
  }, [startLevel]);

  const proceedToNextLevel = useCallback(() => {
    const currentLevel = gameStateRef.current?.level || 1;
    startLevel(currentLevel + 1);
  }, [startLevel]);

  // ========== 主游戏循环 ==========

  const update = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const state = gameStateRef.current;
    if (!state || state.gameOver) return;

    // 关卡通关状态，暂停逻辑，等待 UI 交互
    if (state.isLevelClear) {
      setHudState({ ...state });
      reqIdRef.current = requestAnimationFrame(update);
      return;
    }

    // 获取输入
    const input = getInputState();
    const hasPVEEnemies = mode === GameMode.PVE || mode === GameMode.SOLO;

    // 1. 玩家移动
    if (state.players[0]) {
      updatePlayerMovement(state.players[0], input.player1, state, dt);
    }
    if (state.players[1]) {
      updatePlayerMovement(state.players[1], input.player2, state, dt);
    }

    // 2. 玩家放炸弹
    if (input.player1.bomb && state.players[0]) {
      tryPlaceBomb(state.players[0], state);
    }
    if (input.player2.bomb && state.players[1]) {
      tryPlaceBomb(state.players[1], state);
    }

    // 3. 敌人 AI（PVE/SOLO 模式）
    if (hasPVEEnemies) {
      // Boss 生成检查
      checkBossSpawn(state);

      // 敌人 AI 更新
      updateEnemyAI(state, dt, {
        spawnMinion: (s: GameState) => {
          // 找到 Boss 位置
          const boss = s.enemies.find(e => 
            e.type === EnemyType.BOSS_SLIME || e.type === EnemyType.BOSS_MECHA
          );
          if (boss) {
            const minion = spawnMinionAtPosition(boss.x, boss.y, s);
            if (minion) s.enemies.push(minion);
          }
        },
      });
    }

    // 4. 炸弹更新
    const newExplosions = updateBombs(state, dt);
    state.explosions.push(...newExplosions);

    // 5. 爆炸效果更新
    updateExplosions(state, dt);

    // 6. 战斗交互
    updateCombat(state, dt, hasPVEEnemies);

    // 7. 胜负判定
    const result = checkWinCondition(state, mode);
    
    if (result.levelClear) {
      handleLevelClear(state);
    } else if (result.gameOver) {
      handleGameOver(state, result.winner);
      onGameOver(result.winner);
    }

    // 更新 HUD
    setHudState({ ...state });
    reqIdRef.current = requestAnimationFrame(update);
  }, [mode, onGameOver]);

  // ========== 生命周期 ==========

  // 键盘事件监听
  useEffect(() => {
    const cleanup = initKeyboardListeners();
    return cleanup;
  }, []);

  // BGM 管理
  useEffect(() => {
    if (mode === GameMode.MENU) {
      audioManager.stopBGM();
    }
    return () => audioManager.stopBGM();
  }, [mode]);

  // 游戏初始化
  useEffect(() => {
    initGame();
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [mode, initGame]);

  return { gameStateRef, hudState, initGame, proceedToNextLevel };
};
