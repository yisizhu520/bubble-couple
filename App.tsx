
import React, { useState, useEffect, useCallback } from 'react';
import { GameMode } from './types';
import { useGameEngine } from './hooks/useGameEngine';
import { useOnlineGame } from './hooks/useOnlineGame';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Menu from './components/Menu';
import TouchControls from './components/TouchControls';
import Lobby from './components/Lobby';
import OnlineGame from './components/OnlineGame';
import { GRID_W, GRID_H, TILE_SIZE, HEADER_HEIGHT } from './constants';

type AppScreen = 'menu' | 'local-game' | 'online-lobby' | 'online-game';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [mode, setMode] = useState<GameMode>(GameMode.MENU);
  const [onlineMode, setOnlineMode] = useState<GameMode>(GameMode.PVP);
  const [winner, setWinner] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scale, setScale] = useState(1);

  // Online game hook - lifted to App level to persist across screens
  const onlineGame = useOnlineGame();


  // Calculate explicit dimensions
  const gameWidth = GRID_W * TILE_SIZE;
  const gameHeight = GRID_H * TILE_SIZE;
  const totalHeight = gameHeight + HEADER_HEIGHT;

  useEffect(() => {
    const checkMobile = () => {
      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      return hasTouchSupport && isSmallScreen;
    };

    const calculateScale = () => {
      const mobile = checkMobile();
      
      // Calculate available space with padding
      // Account for borders (8px total) and shadow (12px) on desktop
      const horizontalPadding = mobile ? 16 : 80; // 16 on mobile, 80 on desktop (padding + shadow + borders)
      const verticalPadding = mobile ? 24 : 80; // Same for height
      
      const availableWidth = window.innerWidth - horizontalPadding;
      const availableHeight = window.innerHeight - verticalPadding;
      
      // Calculate scale for both dimensions
      // On mobile, HUD is separate but still uses same scale, so use totalHeight for both
      const scaleX = availableWidth / gameWidth;
      const scaleY = availableHeight / totalHeight;
      
      // Use the smaller scale to ensure game fits completely without clipping
      // Cap at 1 to avoid unnecessary upscaling
      const newScale = Math.min(1, scaleX, scaleY);
      setScale(newScale);
      
      return mobile;
    };
    
    const handleResize = () => {
      setIsMobile(calculateScale());
    };
    
    setIsMobile(calculateScale());
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [gameWidth, totalHeight]);

  const handleGameOver = (winningId: number | null) => {
    setWinner(winningId);
  };

  const { gameStateRef, hudState, initGame, proceedToNextLevel } = useGameEngine(mode, handleGameOver);

  const handleRestart = () => {
    setWinner(null);
    initGame();
  };

  const handleModeSelect = (newMode: GameMode) => {
    setMode(newMode);
    setWinner(null);
    setScreen('local-game');
  };

  const handleExit = () => {
    setMode(GameMode.MENU);
    setWinner(null);
    setScreen('menu');
  };

  const handleOnlineClick = useCallback(() => {
    setScreen('online-lobby');
  }, []);

  const handleLobbyBack = useCallback(() => {
    setScreen('menu');
  }, []);

  const handleOnlineGameStart = useCallback((gameMode: GameMode) => {
    setOnlineMode(gameMode);
    setScreen('online-game');
  }, []);

  const handleOnlineGameExit = useCallback(() => {
    setScreen('online-lobby');
  }, []);

  // Calculate the scaled dimensions for the container wrapper
  const scaledWidth = gameWidth * scale;
  const scaledHeight = (isMobile ? gameHeight : totalHeight) * scale;

  // Render online lobby
  if (screen === 'online-lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E7F1]">
        {/* Wrapper div with scaled dimensions for proper layout and hit detection */}
        <div 
          className="relative"
          style={{ 
            width: gameWidth * scale, 
            height: totalHeight * scale,
          }}
        >
          <div 
            className="relative bg-white border-[3px] sm:border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            style={{ 
              width: gameWidth, 
              height: totalHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <Lobby 
              onBack={handleLobbyBack} 
              onGameStart={handleOnlineGameStart}
              onlineGame={onlineGame}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render online game
  if (screen === 'online-game') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E7F1]">
        {/* Wrapper div with scaled dimensions for proper layout and hit detection */}
        <div 
          className="relative"
          style={{ 
            width: gameWidth * scale, 
            height: totalHeight * scale,
          }}
        >
          <div 
            className="relative bg-white border-[3px] sm:border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            style={{ 
              width: gameWidth, 
              height: totalHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <OnlineGame 
              mode={onlineMode}
              onExit={handleOnlineGameExit}
              onlineGame={onlineGame}
            />
          </div>
        </div>
      </div>
    );
  }

  // Local game or menu
  const showLocalGame = screen === 'local-game' || (screen === 'menu' && mode !== GameMode.MENU);
  const showMenu = screen === 'menu' && mode === GameMode.MENU;

  return (
    <div className={`min-h-screen flex flex-col items-center select-none overflow-hidden ${isMobile ? 'justify-start pt-2' : 'justify-center'}`}>
      {/* Mobile HUD - Fixed at top, full width */}
      {isMobile && showLocalGame && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#E0E7F1]" style={{ height: HEADER_HEIGHT * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: gameWidth }}>
            <HUD hudState={hudState} onNextLevel={proceedToNextLevel} onExit={handleExit} />
          </div>
        </div>
      )}
      
      {/* 
        Main Console Container Wrapper
        This wrapper provides the scaled dimensions for proper layout
      */}
      <div 
        className="relative"
        style={{ 
          width: scaledWidth, 
          height: scaledHeight,
          marginTop: isMobile && showLocalGame ? HEADER_HEIGHT * scale + 4 : 0,
        }}
      >
        {/* 
          Main Console Container
          Neobrutalist Style: Thick borders, hard shadow, no rounded corners (or slight)
          The actual game content that gets scaled on mobile
        */}
        <div 
          className="bg-white border-[3px] sm:border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col"
          style={{ 
            width: gameWidth, 
            height: isMobile ? gameHeight : totalHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* HUD Layer - Only show in container on desktop */}
          {!isMobile && showLocalGame && (
             <HUD hudState={hudState} onNextLevel={proceedToNextLevel} onExit={handleExit} />
          )}
          
          {/* Game Canvas Layer */}
          {showLocalGame && (
             <div className={`relative flex-1 bg-white ${!isMobile ? 'border-t-[4px] border-black' : ''}`}>
               <GameCanvas gameStateRef={gameStateRef} />
             </div>
          )}
          
          {/* Menu & Overlay Layer */}
          {(showMenu || winner !== null) && (
              <Menu 
                  setMode={handleModeSelect} 
                  winner={winner} 
                  onRestart={handleRestart}
                  gameMode={mode}
                  onOnline={handleOnlineClick}
              />
          )}
        </div>
      </div>
      
      {/* Touch Controls for Mobile - Only show during gameplay */}
      {showLocalGame && winner === null && (
        <TouchControls playerId={1} />
      )}
    </div>
  );
};

export default App;
