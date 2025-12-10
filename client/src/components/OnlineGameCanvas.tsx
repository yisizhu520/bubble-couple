/**
 * OnlineGameCanvas - Canvas renderer for online multiplayer mode
 * 
 * Reuses rendering module from local game mode for consistent visuals.
 * Adds interpolation and client-side prediction for smooth online play.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { OnlineGameState } from '../hooks/useOnlineGame';
import { GRID_W, GRID_H, TILE_SIZE } from '../constants';
import {
  drawFloor,
  drawGridContent,
  drawBombs,
  drawExplosions,
  drawEnemies,
  drawPlayer,
  type PlayerLike,
  type EnemyLike,
  type BombLike,
} from '../rendering';

interface OnlineGameCanvasProps {
  gameState: OnlineGameState;
  localPlayerId: number | null;
  predictedPosition: { x: number; y: number } | null;
}

// Interpolation helper for smooth movement
interface InterpolatedPosition {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

const OnlineGameCanvas: React.FC<OnlineGameCanvasProps> = ({ gameState, localPlayerId, predictedPosition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());
  
  // Interpolation refs for smooth movement
  const playerPositions = useRef<Map<string, InterpolatedPosition>>(new Map());
  const enemyPositions = useRef<Map<string, InterpolatedPosition>>(new Map());
  const bombPositions = useRef<Map<string, InterpolatedPosition>>(new Map());
  
  // Update interpolation targets when state changes
  useEffect(() => {
    // Update player positions
    gameState.players.forEach((player, sessionId) => {
      const pos = playerPositions.current.get(sessionId);
      if (pos) {
        pos.targetX = player.x;
        pos.targetY = player.y;
      } else {
        playerPositions.current.set(sessionId, {
          x: player.x,
          y: player.y,
          targetX: player.x,
          targetY: player.y,
        });
      }
    });
    
    // Clean up disconnected players
    playerPositions.current.forEach((_, sessionId) => {
      if (!gameState.players.has(sessionId)) {
        playerPositions.current.delete(sessionId);
      }
    });
    
    // Update enemy positions
    gameState.enemies.forEach((enemy) => {
      const pos = enemyPositions.current.get(enemy.id);
      if (pos) {
        pos.targetX = enemy.x;
        pos.targetY = enemy.y;
      } else {
        enemyPositions.current.set(enemy.id, {
          x: enemy.x,
          y: enemy.y,
          targetX: enemy.x,
          targetY: enemy.y,
        });
      }
    });
    
    // Clean up dead enemies
    const enemyIds = new Set(gameState.enemies.map(e => e.id));
    enemyPositions.current.forEach((_, id) => {
      if (!enemyIds.has(id)) {
        enemyPositions.current.delete(id);
      }
    });
    
    // Update bomb positions (for kicked bombs)
    gameState.bombs.forEach((bomb) => {
      const pos = bombPositions.current.get(bomb.id);
      if (pos) {
        pos.targetX = bomb.x;
        pos.targetY = bomb.y;
      } else {
        bombPositions.current.set(bomb.id, {
          x: bomb.x,
          y: bomb.y,
          targetX: bomb.x,
          targetY: bomb.y,
        });
      }
    });
    
    // Clean up exploded bombs
    const bombIds = new Set(gameState.bombs.map(b => b.id));
    bombPositions.current.forEach((_, id) => {
      if (!bombIds.has(id)) {
        bombPositions.current.delete(id);
      }
    });
  }, [gameState.players, gameState.enemies, gameState.bombs]);
  
  // Interpolate positions with frame-rate independent lerp
  const interpolatePositions = useCallback((deltaTime: number) => {
    // Lerp factor based on time (smoother across different frame rates)
    // Target: reach 90% of the way in ~100ms
    const lerpFactor = 1 - Math.pow(0.1, deltaTime / 100);
    
    // Interpolate players (except local player who uses prediction)
    playerPositions.current.forEach((pos, sessionId) => {
      pos.x += (pos.targetX - pos.x) * lerpFactor;
      pos.y += (pos.targetY - pos.y) * lerpFactor;
    });
    
    // Interpolate enemies
    enemyPositions.current.forEach((pos) => {
      pos.x += (pos.targetX - pos.x) * lerpFactor;
      pos.y += (pos.targetY - pos.y) * lerpFactor;
    });
    
    // Interpolate bombs
    bombPositions.current.forEach((pos) => {
      pos.x += (pos.targetX - pos.x) * lerpFactor;
      pos.y += (pos.targetY - pos.y) * lerpFactor;
    });
  }, []);
  
  // Flattened grid -> 2D grid for shared renderer (matches local mode)
  const grid2D = useMemo(() => {
    const rows: number[][] = [];
    for (let y = 0; y < GRID_H; y++) {
      const start = y * GRID_W;
      rows.push(gameState.grid.slice(start, start + GRID_W));
    }
    return rows;
  }, [gameState.grid]);

  // Items array -> map keyed by "x,y" (matches local mode visibility rules)
  const itemsMap = useMemo(() => {
    const map: Record<string, number> = {};
    gameState.items.forEach(item => {
      map[`${item.gridX},${item.gridY}`] = item.itemType;
    });
    return map;
  }, [gameState.items]);
  
  // Convert online bombs to interpolated BombLike for rendering
  const getInterpolatedBombs = useCallback((): BombLike[] => {
    return gameState.bombs.map(bomb => {
      const pos = bombPositions.current.get(bomb.id);
      return {
        x: pos?.x ?? bomb.x,
        y: pos?.y ?? bomb.y,
        gridX: bomb.gridX,
        gridY: bomb.gridY,
        timer: bomb.timer,
      };
    });
  }, [gameState.bombs]);
  
  // Convert online enemies to interpolated EnemyLike for rendering
  const getInterpolatedEnemies = useCallback((): EnemyLike[] => {
    return gameState.enemies.map(enemy => {
      const pos = enemyPositions.current.get(enemy.id);
      return {
        x: pos?.x ?? enemy.x,
        y: pos?.y ?? enemy.y,
        enemyType: enemy.enemyType,
        invincibleTimer: 0, // Online enemies don't track this client-side
        hp: enemy.hp,
        maxHp: enemy.maxHp,
      };
    });
  }, [gameState.enemies]);
  
  // Draw players with client prediction for local player
  // Uses shared rendering but with position override for local player
  const renderPlayers = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    gameState.players.forEach((player, sessionId) => {
      // Determine position (predicted for local, interpolated for remote)
      let renderX: number, renderY: number;
      if (player.id === localPlayerId && predictedPosition) {
        renderX = predictedPosition.x;
        renderY = predictedPosition.y;
      } else {
        const pos = playerPositions.current.get(sessionId);
        renderX = pos?.x ?? player.x;
        renderY = pos?.y ?? player.y;
      }
      
      // Create PlayerLike with interpolated position
      const playerLike: PlayerLike = {
        id: player.id,
        x: renderX,
        y: renderY,
        color: player.color,
        state: player.state,
        direction: player.direction,
        ghostTimer: player.ghostTimer,
        invincibleTimer: player.invincibleTimer,
        hasShield: player.hasShield,
      };
      
      drawPlayer(ctx, playerLike, now);
    });
  }, [gameState.players, localPlayerId, predictedPosition]);
  
  // Main render loop with frame-rate independent timing
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate delta time for frame-rate independent interpolation
    const now = performance.now();
    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Interpolate positions with delta time
    interpolatePositions(deltaTime);
    
    // Get interpolated entities
    const interpolatedBombs = getInterpolatedBombs();
    const interpolatedEnemies = getInterpolatedEnemies();
    
    // Draw layers using the same order/logic as local mode
    drawFloor(ctx);
    drawGridContent(ctx, { grid: grid2D, items: itemsMap });
    drawBombs(ctx, interpolatedBombs, now);
    drawExplosions(ctx, gameState.explosions);
    drawEnemies(ctx, interpolatedEnemies, now);
    renderPlayers(ctx, now);
    
    // Continue animation
    animationRef.current = requestAnimationFrame(render);
  }, [interpolatePositions, getInterpolatedBombs, getInterpolatedEnemies, gameState.items, gameState.explosions, renderPlayers, grid2D, itemsMap]);
  
  // Start render loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);
  
  return (
    <canvas
      ref={canvasRef}
      width={GRID_W * TILE_SIZE}
      height={GRID_H * TILE_SIZE}
      className="block"
    />
  );
};

export default OnlineGameCanvas;

