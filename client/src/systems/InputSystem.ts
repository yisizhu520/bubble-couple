/**
 * InputSystem - 输入采集系统
 * 
 * 职责：统一管理键盘和手柄输入，提供规范化的输入状态
 * 设计原则：输入系统只负责采集，不负责响应
 */

import { CONTROLS, GAMEPAD_CONFIG } from '../constants';

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  bomb: boolean;
}

export interface InputState {
  player1: PlayerInput;
  player2: PlayerInput;
}

// 键盘状态（由事件驱动更新）
const keyboardState = new Set<string>();

// 手柄状态（每帧轮询）
interface GamepadState extends PlayerInput {
  lastBombState: boolean;
}

const gamepadStates: { [index: number]: GamepadState } = {
  [GAMEPAD_CONFIG.P1_INDEX]: { up: false, down: false, left: false, right: false, bomb: false, lastBombState: false },
  [GAMEPAD_CONFIG.P2_INDEX]: { up: false, down: false, left: false, right: false, bomb: false, lastBombState: false },
};

// 炸弹按键边缘检测（只在按下瞬间触发）
const bombEdgeState = {
  p1: { pressed: false, triggered: false },
  p2: { pressed: false, triggered: false },
};

/**
 * 初始化键盘事件监听
 */
export function initKeyboardListeners(): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    keyboardState.add(e.code);
    
    // 炸弹边缘检测
    if (e.code === CONTROLS.P1.BOMB && !bombEdgeState.p1.pressed) {
      bombEdgeState.p1.pressed = true;
      bombEdgeState.p1.triggered = true;
    }
    if ((e.code === CONTROLS.P2.BOMB || e.code === 'Numpad0') && !bombEdgeState.p2.pressed) {
      bombEdgeState.p2.pressed = true;
      bombEdgeState.p2.triggered = true;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keyboardState.delete(e.code);
    
    if (e.code === CONTROLS.P1.BOMB) {
      bombEdgeState.p1.pressed = false;
    }
    if (e.code === CONTROLS.P2.BOMB || e.code === 'Numpad0') {
      bombEdgeState.p2.pressed = false;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}

/**
 * 轮询手柄状态
 */
function pollGamepads(): void {
  const AXIS_THRESHOLD = 0.5;
  const BUTTON_A = 0;
  const BUTTON_B = 1;

  [GAMEPAD_CONFIG.P1_INDEX, GAMEPAD_CONFIG.P2_INDEX].forEach((index) => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[index];

    if (gamepad?.connected) {
      const state = gamepadStates[index];
      
      // 模拟摇杆 + D-Pad
      const leftStickX = gamepad.axes[0] || 0;
      const leftStickY = gamepad.axes[1] || 0;
      const dpadUp = gamepad.buttons[12]?.pressed || false;
      const dpadDown = gamepad.buttons[13]?.pressed || false;
      const dpadLeft = gamepad.buttons[14]?.pressed || false;
      const dpadRight = gamepad.buttons[15]?.pressed || false;

      state.up = dpadUp || leftStickY < -AXIS_THRESHOLD;
      state.down = dpadDown || leftStickY > AXIS_THRESHOLD;
      state.left = dpadLeft || leftStickX < -AXIS_THRESHOLD;
      state.right = dpadRight || leftStickX > AXIS_THRESHOLD;

      // A/B 按钮放炸弹（边缘检测）
      const bombButton = gamepad.buttons[BUTTON_A]?.pressed || gamepad.buttons[BUTTON_B]?.pressed || false;
      state.bomb = bombButton && !state.lastBombState;
      state.lastBombState = bombButton;
    } else {
      // 手柄断开，重置状态
      const state = gamepadStates[index];
      state.up = state.down = state.left = state.right = state.bomb = false;
      state.lastBombState = false;
    }
  });
}

/**
 * 获取当前帧的输入状态
 * 合并键盘和手柄输入
 */
export function getInputState(): InputState {
  pollGamepads();

  const p1Gamepad = gamepadStates[GAMEPAD_CONFIG.P1_INDEX];
  const p2Gamepad = gamepadStates[GAMEPAD_CONFIG.P2_INDEX];

  const input: InputState = {
    player1: {
      up: keyboardState.has(CONTROLS.P1.UP) || p1Gamepad.up,
      down: keyboardState.has(CONTROLS.P1.DOWN) || p1Gamepad.down,
      left: keyboardState.has(CONTROLS.P1.LEFT) || p1Gamepad.left,
      right: keyboardState.has(CONTROLS.P1.RIGHT) || p1Gamepad.right,
      bomb: bombEdgeState.p1.triggered || p1Gamepad.bomb,
    },
    player2: {
      up: keyboardState.has(CONTROLS.P2.UP) || p2Gamepad.up,
      down: keyboardState.has(CONTROLS.P2.DOWN) || p2Gamepad.down,
      left: keyboardState.has(CONTROLS.P2.LEFT) || p2Gamepad.left,
      right: keyboardState.has(CONTROLS.P2.RIGHT) || p2Gamepad.right,
      bomb: bombEdgeState.p2.triggered || p2Gamepad.bomb,
    },
  };

  // 重置边缘触发状态（一帧一次）
  bombEdgeState.p1.triggered = false;
  bombEdgeState.p2.triggered = false;

  return input;
}

/**
 * 重置所有输入状态
 */
export function resetInputState(): void {
  keyboardState.clear();
  bombEdgeState.p1.pressed = bombEdgeState.p1.triggered = false;
  bombEdgeState.p2.pressed = bombEdgeState.p2.triggered = false;
}
