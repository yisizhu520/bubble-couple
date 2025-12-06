import React, { useRef, useEffect, useCallback } from 'react';
import { OnlineGameState, OnlinePlayer, OnlineBomb, OnlineExplosion, OnlineEnemy, OnlineItem } from '../hooks/useOnlineGame';
import { GRID_W, GRID_H, TILE_SIZE, HEADER_HEIGHT } from '../constants';

interface OnlineGameCanvasProps {
  gameState: OnlineGameState;
  localPlayerId: number | null;
  predictedPosition: { x: number; y: number } | null;
}

const PLAYER_SIZE = 36;
const TileType = {
  EMPTY: 0,
  WALL_HARD: 1,
  WALL_SOFT: 2,
};

const ItemType = {
  NONE: 0,
  RANGE_UP: 1,
  BOMB_UP: 2,
  SPEED_UP: 3,
  KICK: 4,
  GHOST: 5,
  SHIELD: 6,
};

// Interpolation helper
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
  
  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const tile = gameState.grid[y * GRID_W + x] ?? TileType.EMPTY;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        
        if (tile === TileType.EMPTY) {
          // Floor tile
          ctx.fillStyle = (x + y) % 2 === 0 ? '#a8e6cf' : '#88d8b0';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile === TileType.WALL_HARD) {
          // Hard wall
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#2d3748';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#718096';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (tile === TileType.WALL_SOFT) {
          // Soft wall (destructible box)
          ctx.fillStyle = '#a8e6cf';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#d69e2e';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#ecc94b';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          // Cross pattern
          ctx.strokeStyle = '#d69e2e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - 4);
          ctx.moveTo(px + TILE_SIZE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE_SIZE - 4);
          ctx.stroke();
        }
      }
    }
  }, [gameState.grid]);
  
  // Draw items
  const drawItems = useCallback((ctx: CanvasRenderingContext2D) => {
    gameState.items.forEach((item) => {
      const px = item.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = item.gridY * TILE_SIZE + TILE_SIZE / 2;
      const size = 16;
      
      // Item background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Item icon
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      switch (item.itemType) {
        case ItemType.RANGE_UP:
          ctx.fillStyle = '#ef4444';
          ctx.fillText('🔥', px, py);
          break;
        case ItemType.BOMB_UP:
          ctx.fillStyle = '#3b82f6';
          ctx.fillText('💣', px, py);
          break;
        case ItemType.SPEED_UP:
          ctx.fillStyle = '#22c55e';
          ctx.fillText('⚡', px, py);
          break;
        case ItemType.KICK:
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('👟', px, py);
          break;
        case ItemType.GHOST:
          ctx.fillStyle = '#8b5cf6';
          ctx.fillText('👻', px, py);
          break;
        case ItemType.SHIELD:
          ctx.fillStyle = '#06b6d4';
          ctx.fillText('🛡️', px, py);
          break;
      }
    });
  }, [gameState.items]);
  
  // Draw bombs with interpolation
  const drawBombs = useCallback((ctx: CanvasRenderingContext2D) => {
    gameState.bombs.forEach((bomb) => {
      // Use interpolated position for sliding bombs
      const pos = bombPositions.current.get(bomb.id);
      const px = (pos?.x ?? bomb.x) + TILE_SIZE / 2;
      const py = (pos?.y ?? bomb.y) + TILE_SIZE / 2;
      
      // Pulse animation
      const pulse = Math.sin(Date.now() / 100) * 2;
      const radius = 18 + pulse;
      
      // Bomb body
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = '#4a4a6a';
      ctx.beginPath();
      ctx.arc(px - 4, py - 4, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Fuse
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py - radius);
      ctx.lineTo(px + 5, py - radius - 8);
      ctx.stroke();
      
      // Spark
      if (bomb.timer < 1500) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px + 5, py - radius - 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [gameState.bombs]);
  
  // Draw explosions
  const drawExplosions = useCallback((ctx: CanvasRenderingContext2D) => {
    gameState.explosions.forEach((exp) => {
      const px = exp.gridX * TILE_SIZE;
      const py = exp.gridY * TILE_SIZE;
      
      // Explosion gradient
      const gradient = ctx.createRadialGradient(
        px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0,
        px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#fbbf24');
      gradient.addColorStop(0.6, '#f97316');
      gradient.addColorStop(1, '#ef4444');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    });
  }, [gameState.explosions]);
  
  // Draw enemies with interpolation
  const drawEnemies = useCallback((ctx: CanvasRenderingContext2D) => {
    gameState.enemies.forEach((enemy) => {
      // Use interpolated position
      const pos = enemyPositions.current.get(enemy.id);
      const px = (pos?.x ?? enemy.x) + PLAYER_SIZE / 2;
      const py = (pos?.y ?? enemy.y) + PLAYER_SIZE / 2;
      
      // Enemy body color based on type
      const colors: Record<string, string> = {
        BALLOON: '#f87171',
        GHOST: '#c084fc',
        MINION: '#60a5fa',
        FROG: '#4ade80',
        TANK: '#a1a1aa',
        BOSS_SLIME: '#a855f7',
        BOSS_MECHA: '#475569',
      };
      
      const color = colors[enemy.enemyType] || '#f87171';
      const isBoss = enemy.enemyType.startsWith('BOSS');
      const size = isBoss ? 24 : 16;
      
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px - 5, py - 3, 5, 0, Math.PI * 2);
      ctx.arc(px + 5, py - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px - 4, py - 3, 2, 0, Math.PI * 2);
      ctx.arc(px + 6, py - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Health bar for bosses
      if (isBoss) {
        const barWidth = 40;
        const barHeight = 6;
        const healthPercent = enemy.hp / enemy.maxHp;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(px - barWidth / 2 - 1, py + size + 4, barWidth + 2, barHeight + 2);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px - barWidth / 2, py + size + 5, barWidth * healthPercent, barHeight);
      }
    });
  }, [gameState.enemies]);
  
  // Draw players with client prediction for local player
  const drawPlayers = useCallback((ctx: CanvasRenderingContext2D) => {
    gameState.players.forEach((player, sessionId) => {
      if (player.state === 'DEAD') return;
      
      // Use predicted position for local player, interpolated position for others
      let px: number, py: number;
      if (player.id === localPlayerId && predictedPosition) {
        // Local player uses client-side prediction
        px = predictedPosition.x + PLAYER_SIZE / 2;
        py = predictedPosition.y + PLAYER_SIZE / 2;
      } else {
        // Other players use interpolation
        const pos = playerPositions.current.get(sessionId);
        px = (pos?.x ?? player.x) + PLAYER_SIZE / 2;
        py = (pos?.y ?? player.y) + PLAYER_SIZE / 2;
      }
      
      // Ghost effect
      if (player.ghostTimer > 0) {
        ctx.globalAlpha = 0.5;
      }
      
      // Invincibility blink
      if (player.invincibleTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      
      // Body color
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px - 5, py - 3, 5, 0, Math.PI * 2);
      ctx.arc(px + 5, py - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils (direction-based)
      let eyeOffsetX = 0;
      let eyeOffsetY = 0;
      switch (player.direction) {
        case 'UP': eyeOffsetY = -2; break;
        case 'DOWN': eyeOffsetY = 2; break;
        case 'LEFT': eyeOffsetX = -2; break;
        case 'RIGHT': eyeOffsetX = 2; break;
      }
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px - 5 + eyeOffsetX, py - 3 + eyeOffsetY, 2, 0, Math.PI * 2);
      ctx.arc(px + 5 + eyeOffsetX, py - 3 + eyeOffsetY, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Trapped state (bubble)
      if (player.state === 'TRAPPED') {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.stroke();
        
        // Bubble shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(px - 8, py - 8, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Shield indicator
      if (player.hasShield) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Player number indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`P${player.id}`, px, py + 5);
      
      ctx.globalAlpha = 1;
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
    
    // Draw layers
    drawGrid(ctx);
    drawItems(ctx);
    drawBombs(ctx);
    drawExplosions(ctx);
    drawEnemies(ctx);
    drawPlayers(ctx);
    
    // Continue animation
    animationRef.current = requestAnimationFrame(render);
  }, [interpolatePositions, drawGrid, drawItems, drawBombs, drawExplosions, drawEnemies, drawPlayers]);
  
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

