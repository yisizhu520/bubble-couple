import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GameMode } from '../types';
import { UseOnlineGameReturn, ConnectionStatus } from '../hooks/useOnlineGame';
import { Wifi, WifiOff, Users, Swords, Heart, Copy, Check, ArrowLeft, Loader2 } from 'lucide-react';

interface LobbyProps {
  onBack: () => void;
  onGameStart: (mode: GameMode) => void;
  onlineGame: UseOnlineGameReturn;
}

type LobbyScreen = 'main' | 'create' | 'join' | 'waiting' | 'game';

const Lobby: React.FC<LobbyProps> = ({ onBack, onGameStart, onlineGame }) => {
  const [screen, setScreen] = useState<LobbyScreen>('main');
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.PVP);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  
  const {
    status,
    error,
    roomCode,
    gameState,
    localPlayerId,
    createRoom,
    joinRoom,
    quickMatch,
    leaveRoom,
    sendReady,
  } = onlineGame;
  
  // Test server connection on mount
  React.useEffect(() => {
    const testConnection = async () => {
      const serverUrl = import.meta.env.VITE_WS_URL 
        ? import.meta.env.VITE_WS_URL.replace(/^ws/, 'http')
        : 'http://localhost:2567';
      
      try {
        const response = await fetch(`${serverUrl}/health`);
        if (response.ok) {
          setServerReachable(true);
          console.log('Server is reachable');
        } else {
          setServerReachable(false);
          console.warn('Server health check failed:', response.status);
        }
      } catch (err) {
        setServerReachable(false);
        console.error('Server connection test failed:', err);
      }
    };
    
    testConnection();
  }, []);
  
  // Copy room code to clipboard
  const copyRoomCode = useCallback(async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomCode]);
  
  // Handle create room
  const handleCreateRoom = useCallback(async (mode: GameMode, isPrivate: boolean) => {
    console.log('handleCreateRoom called:', { mode, isPrivate });
    try {
      setSelectedMode(mode);
      await createRoom(mode, isPrivate);
      console.log('createRoom completed, switching to waiting screen');
      setScreen('waiting');
    } catch (err) {
      console.error('handleCreateRoom error:', err);
    }
  }, [createRoom]);
  
  // Handle join room
  const handleJoinRoom = useCallback(async () => {
    console.log('handleJoinRoom called:', joinCode);
    if (joinCode.trim().length >= 4) {
      try {
        await joinRoom(joinCode.trim().toUpperCase());
        if (status !== 'error') {
          setScreen('waiting');
        }
      } catch (err) {
        console.error('handleJoinRoom error:', err);
      }
    }
  }, [joinCode, joinRoom, status]);
  
  // Handle quick match
  const handleQuickMatch = useCallback(async (mode: GameMode) => {
    console.log('handleQuickMatch called:', mode);
    try {
      setSelectedMode(mode);
      await quickMatch(mode);
      console.log('quickMatch completed, switching to waiting screen');
      setScreen('waiting');
    } catch (err) {
      console.error('handleQuickMatch error:', err);
    }
  }, [quickMatch]);
  
  // Handle back
  const handleBack = useCallback(() => {
    if (screen === 'waiting') {
      leaveRoom();
    }
    if (screen === 'main') {
      onBack();
    } else {
      setScreen('main');
    }
  }, [screen, leaveRoom, onBack]);
  
  // Track if we've already started the game to prevent duplicate calls
  const gameStartedRef = useRef(false);
  
  // Check if game started - use ref to prevent duplicate calls
  useEffect(() => {
    const phase = gameState?.phase;
    if ((phase === 'PLAYING' || phase === 'COUNTDOWN') && !gameStartedRef.current) {
      gameStartedRef.current = true;
      onGameStart(selectedMode);
    }
    // Reset the ref when going back to waiting
    if (phase === 'WAITING' || phase === 'LOBBY') {
      gameStartedRef.current = false;
    }
  }, [gameState?.phase, selectedMode, onGameStart]);
  
  // Status indicator - use useMemo to prevent recreating on each render
  const statusIndicator = useMemo(() => (
    <div className="flex items-center gap-2 text-sm">
      {status === 'connected' ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-600">已连接</span>
        </>
      ) : status === 'connecting' ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
          <span className="text-yellow-600">连接中...</span>
        </>
      ) : serverReachable === false ? (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-red-600">服务器不可达</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">未连接</span>
        </>
      )}
    </div>
  ), [status, serverReachable]);
  
  // Main menu screen - use useMemo
  const mainScreen = useMemo(() => (
    <div className="flex flex-col gap-4 relative z-10">
      <h2 className="text-2xl font-bold text-center mb-4">联机对战</h2>
      
      {/* Quick Match */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          快速匹配
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickMatch(GameMode.PVP)}
            className="flex items-center justify-center gap-2 p-3 bg-red-500 hover:bg-red-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative z-10"
          >
            <Swords className="w-5 h-5" />
            PVP 对战
          </button>
          <button
            onClick={() => handleQuickMatch(GameMode.PVE)}
            className="flex items-center justify-center gap-2 p-3 bg-green-500 hover:bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative z-10"
          >
            <Heart className="w-5 h-5" />
            PVE 合作
          </button>
        </div>
      </div>
      
      {/* Create Room */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">创建房间</h3>
        <button
          onClick={() => setScreen('create')}
          className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative z-10"
        >
          创建私人房间
        </button>
      </div>
      
      {/* Join Room */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">加入房间</h3>
        <button
          onClick={() => setScreen('join')}
          className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative z-10"
        >
          输入房间码
        </button>
      </div>
    </div>
  ), [handleQuickMatch]);
  
  // Create room screen - use useMemo
  const createScreen = useMemo(() => (
    <div className="flex flex-col gap-4 relative z-10">
      <h2 className="text-2xl font-bold text-center mb-4">创建房间</h2>
      
      <p className="text-center text-gray-600 mb-4">
        选择游戏模式
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => handleCreateRoom(GameMode.PVP, true)}
          className="flex items-center justify-center gap-2 p-4 bg-red-500 hover:bg-red-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative z-10"
        >
          <Swords className="w-6 h-6" />
          <div className="text-left">
            <div className="text-lg">PVP 对战</div>
            <div className="text-sm opacity-80">1v1 决斗</div>
          </div>
        </button>
        
        <button
          onClick={() => handleCreateRoom(GameMode.PVE, true)}
          className="flex items-center justify-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative z-10"
        >
          <Heart className="w-6 h-6" />
          <div className="text-left">
            <div className="text-lg">PVE 合作</div>
            <div className="text-sm opacity-80">一起打怪</div>
          </div>
        </button>
      </div>
    </div>
  ), [handleCreateRoom]);
  
  // Join room screen - use useMemo
  const joinScreen = useMemo(() => (
    <div className="flex flex-col gap-4 relative z-10">
      <h2 className="text-2xl font-bold text-center mb-4">加入房间</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">房间码</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="输入4位房间码"
            maxLength={4}
            className="w-full p-3 text-2xl text-center font-mono font-bold tracking-widest border-4 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-500 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <button
          onClick={handleJoinRoom}
          disabled={joinCode.length < 4 || status === 'connecting'}
          className="w-full p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
        >
          {status === 'connecting' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              连接中...
            </span>
          ) : '加入房间'}
        </button>
      </div>
    </div>
  ), [joinCode, error, handleJoinRoom, status]);
  
  // Waiting room screen - use useMemo
  const playerCount = gameState?.players?.size || 0;
  const maxPlayers = 2;
  
  const waitingScreen = useMemo(() => (
    <div className="flex flex-col gap-4 items-center relative z-10">
      <h2 className="text-2xl font-bold text-center">等待玩家</h2>
      
      {/* Room Code */}
        {roomCode && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">房间码</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-mono font-bold tracking-widest bg-yellow-100 px-4 py-2 border-4 border-black">
                {roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="p-2 bg-gray-100 hover:bg-gray-200 border-2 border-black"
                title="复制房间码"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
        
        {/* Player Count */}
        <div className="flex items-center gap-2 text-lg">
          <Users className="w-6 h-6" />
          <span className="font-bold">{playerCount} / {maxPlayers}</span>
          <span className="text-gray-600">玩家</span>
        </div>
        
        {/* Players List */}
        <div className="w-full space-y-2">
          {gameState?.players && Array.from(gameState.players.values()).map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 bg-white border-4 border-black"
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-black"
                style={{ backgroundColor: player.color }}
              />
              <span className="font-bold">
                玩家 {player.id}
                {player.id === localPlayerId && ' (你)'}
              </span>
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: maxPlayers - playerCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 p-3 bg-gray-100 border-4 border-dashed border-gray-300"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-dashed border-gray-400" />
              <span className="text-gray-400">等待加入...</span>
            </div>
          ))}
        </div>
        
        {/* Waiting Animation - only show if not full */}
        {playerCount < maxPlayers && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>等待其他玩家加入...</span>
          </div>
        )}
        
        {/* Ready to start message - show when full */}
        {playerCount >= maxPlayers && (
          <div className="flex items-center gap-2 text-green-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>玩家已就位，游戏即将开始...</span>
          </div>
        )}
        
        {/* Game Mode */}
        <div className="text-sm text-gray-600">
          模式: {selectedMode === GameMode.PVP ? 'PVP 对战' : 'PVE 合作'}
        </div>
      </div>
  ), [roomCode, copied, copyRoomCode, playerCount, gameState?.players, localPlayerId, selectedMode]);
  
  return (
    <div className="absolute inset-0 bg-[#E0E7F1] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-4 border-black bg-white">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border-2 border-black font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        {statusIndicator}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-md mx-auto">
          {screen === 'main' && mainScreen}
          {screen === 'create' && createScreen}
          {screen === 'join' && joinScreen}
          {screen === 'waiting' && waitingScreen}
        </div>
      </div>
      
      {/* Error Toast */}
      {error && screen !== 'join' && (
        <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center pointer-events-none z-20">
          <div className="bg-red-500 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 w-full max-w-md pointer-events-auto">
            {error}
          </div>
        </div>
      )}
      
      {/* Server Connection Warning */}
      {serverReachable === false && (
        <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center pointer-events-none z-20">
          <div className="bg-yellow-500 text-black font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 w-full max-w-md pointer-events-auto">
            ⚠️ 无法连接到游戏服务器。请确保服务器正在运行 (http://localhost:2567)
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;

