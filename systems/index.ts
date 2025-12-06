/**
 * Systems - 游戏系统模块统一出口
 * 
 * 架构：ECS-lite 风格
 * - 每个 System 处理一个独立关注点
 * - System 接收 GameState 和 dt，修改状态
 * - useGameEngine 作为协调器，按顺序调用各 System
 */

// 输入系统
export { 
  initKeyboardListeners, 
  getInputState, 
  resetInputState,
  type PlayerInput,
  type InputState 
} from './InputSystem';

// 移动系统
export { 
  updatePlayerMovement,
  updateEnemyMovement,
  isEnemyBlocked,
  tryFrogJump 
} from './MovementSystem';

// 炸弹系统
export { 
  tryPlaceBomb,
  updateBombs,
  updateExplosions,
  enemyPlaceBomb 
} from './BombSystem';

// 敌人 AI
export { 
  updateEnemyAI,
  type EnemyAICallbacks 
} from './EnemyAI';

// 战斗系统
export { 
  updateCombat,
  damagePlayer,
  checkExplosionDamage,
  checkEnemyExplosionDamage,
  checkPlayerEnemyCollision,
  checkPlayerRescue,
  checkItemPickup 
} from './CombatSystem';

// 关卡管理
export { 
  initLevel,
  spawnEnemy,
  spawnMinionAtPosition,
  checkBossSpawn,
  checkWinCondition,
  playLevelStartAudio,
  handleLevelClear,
  handleGameOver,
  type WinConditionResult 
} from './LevelManager';
