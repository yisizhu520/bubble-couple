
/**
 * GameCanvas Component
 * 
 * Renders the game state to a canvas at 60 FPS.
 * All rendering logic is delegated to the rendering/ module.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { GameState } from '../types';
import { TILE_SIZE, GRID_W, GRID_H } from '../constants';
import {
  drawFloor,
  drawGridContent,
  drawBombs,
  drawExplosions,
  drawEnemies,
  drawPlayers,
} from '../rendering';

interface GameCanvasProps {
  gameStateRef: React.MutableRefObject<GameState>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameStateRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    const now = Date.now(); // Cache once per frame

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render layers in order (back to front)
    drawFloor(ctx);                           // Layer 1: Floor and grid
    drawGridContent(ctx, state);              // Layer 2: Walls and items
    drawBombs(ctx, state.bombs, now);         // Layer 3: Bombs
    drawExplosions(ctx, state.explosions);    // Layer 4: Explosions
    drawEnemies(ctx, state.enemies, now);     // Layer 5: Enemies
    drawPlayers(ctx, state.players, now);     // Layer 6: Players (on top)

    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(draw);
  }, [gameStateRef]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={GRID_W * TILE_SIZE}
      height={GRID_H * TILE_SIZE}
      className="block bg-white"
    />
  );
};

export default GameCanvas;
