/**
 * Effects Renderer
 * 
 * Draws bombs and explosions with animations.
 */

import { Bomb, Explosion } from '../types';
import { TILE_SIZE } from '../constants';
import {
  COLORS,
  BOMB_PADDING,
  BOMB_SHINE_RATIO,
  BOMB_FUSE_LENGTH,
  SPARK_RADIUS,
  EXPLOSION_INSET,
  BOMB_PULSE_SPEED,
  BOMB_PULSE_AMPLITUDE,
  SPARK_BLINK_SPEED,
} from './constants';

/**
 * Draw a single bomb with pulsing animation
 */
export function drawBomb(ctx: CanvasRenderingContext2D, bomb: Bomb, now: number): void {
  const scale = 1 + Math.sin(now / BOMB_PULSE_SPEED) * BOMB_PULSE_AMPLITUDE;
  const centerX = bomb.x + TILE_SIZE / 2;
  const centerY = bomb.y + TILE_SIZE / 2;
  const radius = (TILE_SIZE / 2 - BOMB_PADDING) * scale;
  
  // Shadow
  ctx.fillStyle = COLORS.SHADOW;
  ctx.beginPath();
  ctx.ellipse(centerX + 4, centerY + 4, radius, radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Main body
  ctx.fillStyle = COLORS.BOMB_BODY;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Shine highlight
  ctx.fillStyle = COLORS.WHITE;
  ctx.beginPath();
  ctx.arc(
    centerX - radius * BOMB_SHINE_RATIO,
    centerY - radius * BOMB_SHINE_RATIO,
    radius * 0.25,
    0, Math.PI * 2
  );
  ctx.fill();
  
  // Fuse
  ctx.strokeStyle = COLORS.BOMB_FUSE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX + 6, centerY - radius - BOMB_FUSE_LENGTH);
  ctx.stroke();
  
  // Spark (alternating color for blinking effect)
  const sparkColor = Math.floor(now / SPARK_BLINK_SPEED) % 2 === 0
    ? COLORS.BOMB_SPARK_A
    : COLORS.BOMB_SPARK_B;
  ctx.fillStyle = sparkColor;
  ctx.beginPath();
  ctx.arc(centerX + 6, centerY - radius - BOMB_FUSE_LENGTH, SPARK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw all bombs
 */
export function drawBombs(ctx: CanvasRenderingContext2D, bombs: Bomb[], now: number): void {
  bombs.forEach(bomb => drawBomb(ctx, bomb, now));
}

/**
 * Draw a single explosion
 */
export function drawExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion): void {
  const px = explosion.gridX * TILE_SIZE;
  const py = explosion.gridY * TILE_SIZE;
  
  // Outer red
  ctx.fillStyle = COLORS.EXPLOSION_OUTER;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  
  // Inner yellow core
  ctx.fillStyle = COLORS.EXPLOSION_INNER;
  ctx.fillRect(
    px + EXPLOSION_INSET,
    py + EXPLOSION_INSET,
    TILE_SIZE - EXPLOSION_INSET * 2,
    TILE_SIZE - EXPLOSION_INSET * 2
  );
  
  // Border
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
}

/**
 * Draw all explosions
 */
export function drawExplosions(ctx: CanvasRenderingContext2D, explosions: Explosion[]): void {
  explosions.forEach(e => drawExplosion(ctx, e));
}
