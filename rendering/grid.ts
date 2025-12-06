/**
 * Grid Renderer
 * 
 * Draws the game floor, walls, and item pickups.
 */

import { GameState, TileType, ItemType } from '../types';
import { TILE_SIZE, GRID_W, GRID_H } from '../constants';
import { COLORS, WALL_INSET, ITEM_RADIUS, ITEM_COLORS, ITEM_ICONS } from './constants';

/**
 * Draw floor background with checkerboard pattern and grid lines
 */
export function drawFloor(ctx: CanvasRenderingContext2D): void {
  // Base floor color
  ctx.fillStyle = COLORS.FLOOR_PRIMARY;
  ctx.fillRect(0, 0, GRID_W * TILE_SIZE, GRID_H * TILE_SIZE);
  
  // Checkerboard pattern for visual clarity
  ctx.fillStyle = COLORS.FLOOR_SECONDARY;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
  
  // Grid lines
  ctx.strokeStyle = COLORS.GRID_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID_W; x++) {
    ctx.moveTo(x * TILE_SIZE, 0);
    ctx.lineTo(x * TILE_SIZE, GRID_H * TILE_SIZE);
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.moveTo(0, y * TILE_SIZE);
    ctx.lineTo(GRID_W * TILE_SIZE, y * TILE_SIZE);
  }
  ctx.stroke();
}

/**
 * Draw a hard (indestructible) wall
 */
export function drawHardWall(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  // Main block
  ctx.fillStyle = COLORS.WALL_HARD;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  
  // Border
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
  
  // Diagonal cross hatch for visual distinction
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
  ctx.stroke();
}

/**
 * Draw a soft (destructible) wall
 */
export function drawSoftWall(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  // Outer box
  ctx.fillStyle = COLORS.WALL_SOFT_OUTER;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
  
  // Inner highlight
  const inset = WALL_INSET;
  ctx.fillStyle = COLORS.WALL_SOFT_INNER;
  ctx.fillRect(px + inset, py + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
  ctx.strokeRect(px + inset, py + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
}

/**
 * Draw an item pickup
 */
export function drawItem(ctx: CanvasRenderingContext2D, px: number, py: number, type: ItemType): void {
  const color = ITEM_COLORS[type] || COLORS.WHITE;
  const icon = ITEM_ICONS[type] || '';
  
  const centerX = px + TILE_SIZE / 2;
  const centerY = py + TILE_SIZE / 2;
  
  // Circle background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, ITEM_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Emoji icon
  ctx.fillStyle = COLORS.WHITE;
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, centerX, centerY);
}

/**
 * Draw all grid content: walls and items
 */
export function drawGridContent(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const tile = state.grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      
      // Items are only visible on empty tiles
      const key = `${x},${y}`;
      const itemType = state.items[key];
      if (itemType && tile === TileType.EMPTY) {
        drawItem(ctx, px, py, itemType);
      }
      
      // Draw walls on top
      if (tile === TileType.WALL_HARD) {
        drawHardWall(ctx, px, py);
      } else if (tile === TileType.WALL_SOFT) {
        drawSoftWall(ctx, px, py);
      }
    }
  }
}
