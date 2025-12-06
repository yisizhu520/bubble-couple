/**
 * Rendering Primitives
 * 
 * Low-level drawing utilities shared across all renderers.
 * These are pure functions that draw basic shapes and effects.
 */

import { COLORS, EYE_OFFSET_X, EYE_OFFSET_Y } from './constants';

/**
 * Draw an elliptical shadow beneath an entity
 */
export function drawShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
): void {
  ctx.fillStyle = COLORS.SHADOW;
  ctx.beginPath();
  ctx.ellipse(cx, cy + size / 2 - 2, size / 2, size / 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a pair of eyes with pupils
 */
export function drawEyes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bob: number,
  eyeRadius = 4,
  pupilRadius = 1.5
): void {
  // Eye whites
  ctx.fillStyle = COLORS.WHITE;
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X, cy - EYE_OFFSET_Y + bob, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X, cy - EYE_OFFSET_Y + bob, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Pupils
  ctx.fillStyle = COLORS.BLACK;
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X, cy - EYE_OFFSET_Y + bob, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X, cy - EYE_OFFSET_Y + bob, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a single cyclops eye
 */
export function drawCyclopsEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bob: number,
  eyeRadius = 8,
  pupilRadius = 3
): void {
  ctx.fillStyle = COLORS.WHITE;
  ctx.beginPath();
  ctx.arc(cx, cy - 4 + bob, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = COLORS.BLACK;
  ctx.beginPath();
  ctx.arc(cx, cy - 4 + bob, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw an HP bar above an entity
 */
export function drawHpBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  offsetY: number,
  width: number,
  height: number,
  hp: number,
  maxHp: number
): void {
  const pct = hp / maxHp;
  const barX = cx - width / 2;
  const barY = cy + offsetY;
  
  // Background
  ctx.fillStyle = COLORS.HP_BG;
  ctx.fillRect(barX, barY, width, height);
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, width, height);
  
  // Fill based on health percentage
  ctx.fillStyle = pct < 0.3 ? COLORS.HP_LOW : COLORS.HP_HIGH;
  ctx.fillRect(barX, barY, width * pct, height);
  
  // Center tick mark
  ctx.beginPath();
  ctx.moveTo(cx, barY);
  ctx.lineTo(cx, barY + height);
  ctx.stroke();
}

/**
 * Check if entity should flash (for invincibility effect)
 */
export function shouldFlash(now: number, blinkSpeed: number): boolean {
  return Math.floor(now / blinkSpeed) % 2 === 0;
}
