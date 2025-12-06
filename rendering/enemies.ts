/**
 * Enemy Renderer
 * 
 * Draws all enemy types using a strategy pattern (lookup table).
 * Each enemy type has its own renderer function.
 */

import { Enemy, EnemyType } from '../types';
import { PLAYER_SIZE } from '../constants';
import {
  COLORS,
  ENEMY_COLORS,
  BOSS_SCALE,
  EYE_OFFSET_X,
  EYE_OFFSET_Y,
  HP_BAR_WIDTH,
  HP_BAR_HEIGHT,
  HP_BAR_OFFSET,
  BOB_SPEED,
  BOB_AMPLITUDE,
  INVINCIBLE_BLINK_SPEED,
} from './constants';
import { drawShadow, drawEyes, drawCyclopsEye, drawHpBar, shouldFlash } from './primitives';

// ============================================================================
// ENEMY RENDERER TYPE
// ============================================================================

type EnemyRenderer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, bob: number) => void;

// ============================================================================
// INDIVIDUAL ENEMY RENDERERS
// ============================================================================

const renderBalloon: EnemyRenderer = (ctx, cx, cy, bob) => {
  ctx.fillStyle = ENEMY_COLORS[EnemyType.BALLOON];
  ctx.beginPath();
  ctx.arc(cx, cy + bob, PLAYER_SIZE / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawEyes(ctx, cx, cy, bob);
};

const renderGhost: EnemyRenderer = (ctx, cx, cy, bob) => {
  ctx.fillStyle = ENEMY_COLORS[EnemyType.GHOST];
  ctx.beginPath();
  // Top dome
  ctx.arc(cx, cy - 4 + bob, PLAYER_SIZE / 2 - 2, Math.PI, 0);
  // Bottom wavy edge
  ctx.lineTo(cx + PLAYER_SIZE / 2 - 2, cy + PLAYER_SIZE / 2);
  ctx.lineTo(cx, cy + PLAYER_SIZE / 2 - 4);
  ctx.lineTo(cx - PLAYER_SIZE / 2 + 2, cy + PLAYER_SIZE / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Smaller eyes for ghost
  ctx.fillStyle = COLORS.WHITE;
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X, cy - EYE_OFFSET_Y + bob, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X, cy - EYE_OFFSET_Y + bob, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const renderMinion: EnemyRenderer = (ctx, cx, cy, bob) => {
  ctx.fillStyle = ENEMY_COLORS[EnemyType.MINION];
  ctx.beginPath();
  ctx.arc(cx, cy + bob, PLAYER_SIZE / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawCyclopsEye(ctx, cx, cy, bob);
};

const renderFrog: EnemyRenderer = (ctx, cx, cy, bob) => {
  // Body (ellipse)
  ctx.fillStyle = ENEMY_COLORS[EnemyType.FROG];
  ctx.beginPath();
  ctx.ellipse(cx, cy + bob, PLAYER_SIZE / 2, PLAYER_SIZE / 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Bulging eyes on top
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 12 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 8, cy - 12 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const renderTank: EnemyRenderer = (ctx, cx, cy, bob) => {
  // Square body
  ctx.fillStyle = ENEMY_COLORS[EnemyType.TANK];
  ctx.fillRect(cx - PLAYER_SIZE / 2, cy - PLAYER_SIZE / 2 + bob, PLAYER_SIZE, PLAYER_SIZE);
  ctx.strokeRect(cx - PLAYER_SIZE / 2, cy - PLAYER_SIZE / 2 + bob, PLAYER_SIZE, PLAYER_SIZE);
  
  // Treads on sides
  ctx.fillStyle = COLORS.BLACK;
  ctx.fillRect(cx - PLAYER_SIZE / 2 - 4, cy - PLAYER_SIZE / 2 + bob, 6, PLAYER_SIZE);
  ctx.fillRect(cx + PLAYER_SIZE / 2 - 2, cy - PLAYER_SIZE / 2 + bob, 6, PLAYER_SIZE);
};

const renderBossSlime: EnemyRenderer = (ctx, cx, cy, bob) => {
  const sz = PLAYER_SIZE * BOSS_SCALE;
  
  // Large circular body
  ctx.fillStyle = ENEMY_COLORS[EnemyType.BOSS_SLIME];
  ctx.beginPath();
  ctx.arc(cx, cy + bob, sz / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Crown
  ctx.fillStyle = COLORS.BOSS_CROWN;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - sz / 2 + bob);
  ctx.lineTo(cx - 6, cy - sz / 2 - 14 + bob);
  ctx.lineTo(cx, cy - sz / 2 + bob);
  ctx.lineTo(cx + 6, cy - sz / 2 - 14 + bob);
  ctx.lineTo(cx + 12, cy - sz / 2 + bob);
  ctx.fill();
  ctx.stroke();
};

const renderBossMecha: EnemyRenderer = (ctx, cx, cy, bob) => {
  const sz = PLAYER_SIZE * BOSS_SCALE;
  
  // Square body
  ctx.fillStyle = ENEMY_COLORS[EnemyType.BOSS_MECHA];
  ctx.fillRect(cx - sz / 2, cy - sz / 2 + bob, sz, sz);
  ctx.strokeRect(cx - sz / 2, cy - sz / 2 + bob, sz, sz);
  
  // Visor
  ctx.fillStyle = COLORS.MECHA_VISOR;
  ctx.fillRect(cx - sz / 2 + 4, cy - 8 + bob, sz - 8, 8);
  ctx.strokeRect(cx - sz / 2 + 4, cy - 8 + bob, sz - 8, 8);
};

// ============================================================================
// RENDERER LOOKUP TABLE
// ============================================================================

const ENEMY_RENDERERS: Record<EnemyType, EnemyRenderer> = {
  [EnemyType.BALLOON]: renderBalloon,
  [EnemyType.GHOST]: renderGhost,
  [EnemyType.MINION]: renderMinion,
  [EnemyType.FROG]: renderFrog,
  [EnemyType.TANK]: renderTank,
  [EnemyType.BOSS_SLIME]: renderBossSlime,
  [EnemyType.BOSS_MECHA]: renderBossMecha,
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Draw a single enemy
 */
export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, now: number): void {
  const cx = enemy.x + PLAYER_SIZE / 2;
  const cy = enemy.y + PLAYER_SIZE / 2;
  const bob = Math.sin(now / BOB_SPEED) * BOB_AMPLITUDE;
  
  // Invincibility flash effect
  if (enemy.invincibleTimer > 0 && shouldFlash(now, INVINCIBLE_BLINK_SPEED)) {
    ctx.globalAlpha = 0.5;
  }
  
  // Shadow beneath enemy
  drawShadow(ctx, cx, cy, PLAYER_SIZE);
  
  // Common stroke settings for all enemies
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.OUTLINE;
  
  // Render specific enemy type
  const renderer = ENEMY_RENDERERS[enemy.type];
  if (renderer) {
    renderer(ctx, cx, cy, bob);
  }
  
  // Reset alpha
  ctx.globalAlpha = 1.0;
  
  // HP bar for multi-HP enemies
  if (enemy.maxHp > 1) {
    drawHpBar(
      ctx,
      cx,
      cy,
      -PLAYER_SIZE / 2 - HP_BAR_OFFSET + bob,
      HP_BAR_WIDTH,
      HP_BAR_HEIGHT,
      enemy.hp,
      enemy.maxHp
    );
  }
}

/**
 * Draw all enemies
 */
export function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[], now: number): void {
  enemies.forEach(e => drawEnemy(ctx, e, now));
}
