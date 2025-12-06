import React from 'react';
import { GameMode, SoundType } from '../types';
import { HeartHandshake, Swords, RotateCcw, User } from 'lucide-react';
import { audioManager } from '../utils/audio';

interface MenuProps {
  setMode: (mode: GameMode) => void;
  winner: number | null;
  onRestart: () => void;
  gameMode: GameMode;
}

const Menu: React.FC<MenuProps> = ({ setMode, winner, onRestart, gameMode }) => {
  
  const handleModeSelect = (mode: GameMode) => {
    audioManager.init(); // Unlock AudioContext
    audioManager.play(SoundType.CLICK);
    setMode(mode);
  };

  const handleRestartClick = () => {
      audioManager.play(SoundType.CLICK);
      onRestart();
  };

  const handleBackToMenu = () => {
      audioManager.play(SoundType.CLICK);
      audioManager.stopBGM();
      setMode(GameMode.MENU);
  };

  if (gameMode === GameMode.MENU) {
    return (
      <div className="absolute inset-0 bg-[#FFDEE9] bg-gradient-to-br from-[#B5FFFC] to-[#FFDEE9] flex flex-col items-center justify-center p-4 sm:p-8 z-50 overflow-y-auto">
        
        {/* Title Block */}
        <div className="mb-6 sm:mb-10 bg-white border-[3px] sm:border-[4px] border-black p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
             <h1 className="text-3xl sm:text-6xl font-black text-black tracking-tight uppercase font-space">
                Bubble Couple
             </h1>
             <p className="text-black font-bold mt-1 sm:mt-2 text-center text-sm sm:text-lg border-t-2 border-black pt-1 sm:pt-2">
                 Bombs, Bubbles & Betrayal
             </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-12 w-full max-w-md sm:max-w-none">
          {/* Solo Button */}
          <button
            onClick={() => handleModeSelect(GameMode.SOLO)}
            onMouseEnter={() => audioManager.play(SoundType.CLICK)}
            className="group w-full sm:w-44 flex flex-col items-center gap-2 sm:gap-4 bg-[#FFD93D] border-[3px] border-black p-4 sm:p-6 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <User size={36} className="text-black stroke-[2.5px] sm:w-12 sm:h-12" />
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-black text-black uppercase">Solo</h3>
              <p className="text-xs font-bold text-black border-t-2 border-black mt-1 pt-1">单人闯关</p>
            </div>
          </button>

          {/* PVE Button */}
          <button
            onClick={() => handleModeSelect(GameMode.PVE)}
            onMouseEnter={() => audioManager.play(SoundType.CLICK)}
            className="group w-full sm:w-44 flex flex-col items-center gap-2 sm:gap-4 bg-[#4ECDC4] border-[3px] border-black p-4 sm:p-6 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <HeartHandshake size={36} className="text-black stroke-[2.5px] sm:w-12 sm:h-12" />
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-black text-black uppercase">PvE</h3>
              <p className="text-xs font-bold text-black border-t-2 border-black mt-1 pt-1">双人合作</p>
            </div>
          </button>

          {/* PVP Button */}
          <button
            onClick={() => handleModeSelect(GameMode.PVP)}
            onMouseEnter={() => audioManager.play(SoundType.CLICK)}
            className="group w-full sm:w-44 flex flex-col items-center gap-2 sm:gap-4 bg-[#FF6B6B] border-[3px] border-black p-4 sm:p-6 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Swords size={36} className="text-black stroke-[2.5px] sm:w-12 sm:h-12" />
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-black text-black uppercase">PvP</h3>
              <p className="text-xs font-bold text-black border-t-2 border-black mt-1 pt-1">双人对战</p>
            </div>
          </button>
        </div>

        {/* Instructions */}
        <div className="w-full max-w-lg bg-white border-[3px] border-black p-3 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="text-center text-black font-black uppercase text-base sm:text-lg mb-3 sm:mb-4 bg-yellow-300 border-2 border-black inline-block px-2 transform -rotate-1 mx-auto block">How to Play</h4>
            <div className="grid grid-cols-2 gap-4 sm:gap-8 text-xs sm:text-sm">
                <div className="space-y-1 sm:space-y-2">
                    <strong className="block text-black text-sm sm:text-lg bg-blue-300 border-2 border-black text-center mb-1 sm:mb-2 px-1 py-0.5">P1 / Solo</strong>
                    <div className="flex justify-between text-black font-bold"><span className="text-xs">移动</span> <span className="font-mono border border-black bg-gray-100 px-1 text-xs">WASD</span></div>
                    <div className="flex justify-between text-black font-bold"><span className="text-xs">放炸弹</span> <span className="font-mono border border-black bg-gray-100 px-1 text-xs">Space</span></div>
                    <div className="text-[10px] text-gray-600 mt-2 hidden sm:block">支持触屏 / 手柄</div>
                </div>
                <div className="space-y-1 sm:space-y-2">
                    <strong className="block text-black text-sm sm:text-lg bg-red-300 border-2 border-black text-center mb-1 sm:mb-2 px-1 py-0.5">P2</strong>
                    <div className="flex justify-between text-black font-bold"><span className="text-xs">移动</span> <span className="font-mono border border-black bg-gray-100 px-1 text-xs">Arrows</span></div>
                    <div className="flex justify-between text-black font-bold"><span className="text-xs">放炸弹</span> <span className="font-mono border border-black bg-gray-100 px-1 text-xs">Enter</span></div>
                    <div className="text-[10px] text-gray-600 mt-2 hidden sm:block">支持手柄</div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (winner !== null) {
    const isSoloMode = gameMode === GameMode.SOLO;
    const getTitle = () => {
      if (winner === 0) return "GAME OVER";
      if (winner === 12) return "VICTORY!";
      return `P${winner} WINS!`;
    };
    const getSubtitle = () => {
      if (winner === 0) return isSoloMode ? "英雄陨落..." : "You both died...";
      if (winner === 12) return isSoloMode ? "恭喜通关！" : "Mission Accomplished!";
      return "Kneel before the champion!";
    };

    return (
      <div className="absolute inset-0 bg-yellow-300 flex flex-col items-center justify-center p-4 sm:p-8 z-50">
        <div className="bg-white border-[3px] sm:border-[4px] border-black p-6 sm:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center max-w-2xl w-full">
            <h2 className="text-3xl sm:text-6xl font-black mb-3 sm:mb-4 uppercase text-black italic">
                {getTitle()}
            </h2>
            <p className="text-lg sm:text-2xl text-black font-bold mb-6 sm:mb-10 border-b-2 sm:border-b-4 border-black inline-block pb-1 sm:pb-2">
                {getSubtitle()}
            </p>
            
            <div className="flex flex-col gap-3 sm:gap-4 items-center">
                <button 
                    onClick={handleRestartClick}
                    className="flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-[#7FBC8C] border-[3px] border-black text-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg sm:text-xl transition-all w-full sm:w-auto"
                >
                    <RotateCcw className="stroke-[3px] w-5 h-5 sm:w-6 sm:h-6" /> 
                    PLAY AGAIN
                </button>
                
                <button 
                    onClick={handleBackToMenu}
                    className="mt-2 sm:mt-4 font-bold border-b-2 border-black hover:text-gray-600 text-black uppercase tracking-widest text-sm sm:text-base"
                >
                    Back to Menu
                </button>
            </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Menu;