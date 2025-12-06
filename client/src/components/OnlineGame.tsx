import React, { useEffect, useCallback, useRef } from 'react';
import { GameMode } from '../types';
import { UseOnlineGameReturn } from '../hooks/useOnlineGame';
import OnlineGameCanvas from './OnlineGameCanvas';
import { GRID_W, GRID_H, TILE_SIZE, HEADER_HEIGHT } from '../constants';
import { ArrowLeft, Clock, Trophy, Users, Swords, Heart } from 'lucide-react';

interface OnlineGameProps {
  mode: GameMode;
  onExit: () => void;
  onlineGame: UseOnlineGameReturn;
}

const OnlineGame: React.FC<OnlineGameProps> = ({ mode, onExit, onlineGame }) => {
  const { gameState, localPlayerId, predictedPosition, sendInput, placeBomb, leaveRoom } = onlineGame;
  
  // Input state ref
  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let changed = false;
      
      // Player 1 controls (local player)
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (!inputRef.current.up) {
            inputRef.current.up = true;
            changed = true;
          }
          break;
        case 'KeyS':
        case 'ArrowDown':
          if (!inputRef.current.down) {
            inputRef.current.down = true;
            changed = true;
          }
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (!inputRef.current.left) {
            inputRef.current.left = true;
            changed = true;
          }
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (!inputRef.current.right) {
            inputRef.current.right = true;
            changed = true;
          }
          break;
        case 'Space':
        case 'Enter':
          placeBomb();
          break;
      }
      
      if (changed) {
        sendInput({ ...inputRef.current });
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      let changed = false;
      
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (inputRef.current.up) {
            inputRef.current.up = false;
            changed = true;
          }
          break;
        case 'KeyS':
        case 'ArrowDown':
          if (inputRef.current.down) {
            inputRef.current.down = false;
            changed = true;
          }
          break;
        case 'KeyA':
        case 'ArrowLeft':
          if (inputRef.current.left) {
            inputRef.current.left = false;
            changed = true;
          }
          break;
        case 'KeyD':
        case 'ArrowRight':
          if (inputRef.current.right) {
            inputRef.current.right = false;
            changed = true;
          }
          break;
      }
      
      if (changed) {
        sendInput({ ...inputRef.current });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sendInput, placeBomb]);
  
  // Handle exit
  const handleExit = useCallback(() => {
    leaveRoom();
    onExit();
  }, [leaveRoom, onExit]);
  
  // Get local player
  const localPlayer = gameState?.players ? Array.from(gameState.players.values()).find(p => p.id === localPlayerId) : null;
  
  // Get players list
  const players = gameState?.players ? Array.from(gameState.players.values()) : [];
  
  // Render countdown overlay
  const renderCountdown = () => {
    if (gameState?.phase !== 'COUNTDOWN') return null;
    
    return (
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
        <div className="text-8xl font-bold text-white animate-pulse">
          {gameState.countdown > 0 ? gameState.countdown : 'GO!'}
        </div>
      </div>
    );
  };
  
  // Render game over overlay
  const renderGameOver = () => {
    if (gameState?.phase !== 'FINISHED') return null;
    
    let message = '';
    let color = 'text-white';
    
    if (gameState.winner === 0) {
      message = '平局!';
      color = 'text-yellow-400';
    } else if (gameState.winner === 12) {
      message = '胜利! 🎉';
      color = 'text-green-400';
    } else if (gameState.winner === localPlayerId) {
      message = '你赢了! 🏆';
      color = 'text-green-400';
    } else {
      message = '你输了...';
      color = 'text-red-400';
    }
    
    return (
      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
        <div className={`text-5xl font-bold ${color} mb-8`}>
          {message}
        </div>
        <button
          onClick={handleExit}
          className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
        >
          返回大厅
        </button>
      </div>
    );
  };
  
  // Render level clear overlay
  const renderLevelClear = () => {
    if (gameState?.phase !== 'LEVEL_CLEAR') return null;
    
    return (
      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20">
        <div className="text-5xl font-bold text-green-400 mb-4">
          关卡通过! ✨
        </div>
        <div className="text-2xl text-white">
          准备进入第 {gameState.level} 关...
        </div>
      </div>
    );
  };
  
  if (!gameState) {
    return (
      <div className="absolute inset-0 bg-[#E0E7F1] flex items-center justify-center">
        <div className="text-xl">连接中...</div>
      </div>
    );
  }
  
  return (
    <div className="relative flex flex-col">
      {/* HUD */}
      <div
        className="flex items-center justify-between px-4 bg-[#E0E7F1] border-b-4 border-black"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Left: Exit button and mode */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleExit}
            className="flex items-center gap-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 border-2 border-black text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            退出
          </button>
          <div className="flex items-center gap-1 text-sm">
            {mode === GameMode.PVP ? (
              <>
                <Swords className="w-4 h-4 text-red-500" />
                <span>PVP</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 text-green-500" />
                <span>PVE L{gameState.level}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Center: Timer */}
        <div className="flex items-center gap-2 text-xl font-bold">
          <Clock className="w-5 h-5" />
          <span>{Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}</span>
        </div>
        
        {/* Right: Players info */}
        <div className="flex items-center gap-4">
          {players.map(player => (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2 py-1 border-2 border-black ${
                player.id === localPlayerId ? 'bg-yellow-100' : 'bg-white'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full border border-black"
                style={{ backgroundColor: player.color }}
              />
              <span className="font-bold text-sm">P{player.id}</span>
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">{player.score}</span>
              {player.state === 'DEAD' && (
                <span className="text-xs text-red-500">💀</span>
              )}
              {player.state === 'TRAPPED' && (
                <span className="text-xs text-blue-500">🫧</span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Game Canvas */}
      <div className="relative">
        <OnlineGameCanvas 
          gameState={gameState} 
          localPlayerId={localPlayerId} 
          predictedPosition={predictedPosition}
        />
        {renderCountdown()}
        {renderGameOver()}
        {renderLevelClear()}
      </div>
    </div>
  );
};

export default OnlineGame;

