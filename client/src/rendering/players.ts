/**
 * Player Renderer
 * 
 * Draws players using the asset system.
 * Supports all player states and effects:
 * - Normal, trapped, dead states
 * - Ghost mode transparency
 * - Invincibility flashing
 * - Shield effect
 * - Direction-based eye movement (for Canvas fallback)
 */

import { Player, PlayerState, Direction } from '../types';
import { PLAYER_SIZE } from '../constants';
import { assetManager, getPlayerAssetKey } from '../assets';
import {
  COLORS,
  EYE_OFFSET_X,
  EYE_OFFSET_Y,
  EYE_RADIUS,
  PUPIL_RADIUS,
  PUPIL_MOVE,
  SHIELD_RADIUS_OFFSET,
  PLAYER_INVINCIBLE_BLINK_SPEED,
} from './constants';
import { shouldFlash } from './primitives';

/**
 * Draw a single player using the asset system
 */
export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, now: number): void {
  // Skip dead players
  if (player.state === PlayerState.DEAD) return;
  
  const cx = player.x + PLAYER_SIZE / 2;
  const cy = player.y + PLAYER_SIZE / 2;
  
  ctx.save();
  
  // Ghost mode: semi-transparent
  if (player.ghostTimer > 0) {
    ctx.globalAlpha = 0.5;
  }
  
  // Invincibility flash
  if (player.invincibleTimer > 0 && shouldFlash(now, PLAYER_INVINCIBLE_BLINK_SPEED)) {
    ctx.globalAlpha = 0.3;
  }
  
  // Try to draw using asset system first
  const assetKey = getPlayerAssetKey(player.id);
  const asset = assetManager.get(assetKey);
  
  if (asset) {
    // Use asset system (SVG body without pupils)
    asset.draw(ctx, cx, cy);
    
    // Draw dynamic pupils on top of SVG (for direction-based eye movement)
    if (player.state !== PlayerState.TRAPPED) {
      drawPlayerPupils(ctx, cx, cy, player.direction);
    }
  } else {
    // Fallback to legacy Canvas rendering
    // Shadow
    ctx.fillStyle = COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(cx, player.y + PLAYER_SIZE, PLAYER_SIZE / 2, PLAYER_SIZE / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body color
    ctx.fillStyle = player.color;
    
    // Body circle
    ctx.beginPath();
    ctx.arc(cx, cy, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.stroke();
    
    // Normal state: draw eyes
    if (player.state !== PlayerState.TRAPPED) {
      drawPlayerEyes(ctx, cx, cy, player.direction);
    }
  }
  
  // Trapped state overlay (works with both asset and Canvas)
  if (player.state === PlayerState.TRAPPED) {
    ctx.fillStyle = COLORS.TRAPPED_BUBBLE;
    ctx.beginPath();
    ctx.arc(cx, cy, PLAYER_SIZE / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.OUTLINE;
    ctx.stroke();
    
    // SOS text
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SOS', cx, cy - 20);
  }
  
  ctx.restore();
  
  // Shield effect (drawn outside save/restore to avoid ghost alpha affecting it)
  if (player.hasShield) {
    drawShield(ctx, cx, cy);
  }
}

/**
 * Draw player eyes with direction-based pupil movement
 */
function drawPlayerEyes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: Direction
): void {
  // Eye whites
  ctx.fillStyle = COLORS.WHITE;
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X, cy - EYE_OFFSET_Y, EYE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X, cy - EYE_OFFSET_Y, EYE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  
  // Draw pupils
  drawPlayerPupils(ctx, cx, cy, direction);
}

/**
 * Draw only the pupils (for use with SVG body that already has eye whites)
 * Pupils move based on player direction
 */
function drawPlayerPupils(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: Direction
): void {
  // Calculate pupil offset based on direction
  const dirX = direction === Direction.RIGHT ? PUPIL_MOVE
    : direction === Direction.LEFT ? -PUPIL_MOVE
    : 0;
  const dirY = direction === Direction.DOWN ? PUPIL_MOVE
    : direction === Direction.UP ? -PUPIL_MOVE
    : 0;
  
  // Pupils
  ctx.fillStyle = COLORS.BLACK;
  ctx.beginPath();
  ctx.arc(cx - EYE_OFFSET_X + dirX, cy - EYE_OFFSET_Y + dirY, PUPIL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + EYE_OFFSET_X + dirX, cy - EYE_OFFSET_Y + dirY, PUPIL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw shield effect around player
 */
function drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = COLORS.SHIELD;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, PLAYER_SIZE / 2 + SHIELD_RADIUS_OFFSET, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw all players
 */
export function drawPlayers(ctx: CanvasRenderingContext2D, players: Player[], now: number): void {
  players.forEach(p => drawPlayer(ctx, p, now));
}
