import { useState, useCallback, useRef, useEffect } from 'react';
import { Client, Room } from 'colyseus.js';
import { GameMode } from '../types';
import { TILE_SIZE } from '../constants';
import { createGridAccessorFlat, predictMove, type BombAccessor } from '../shared';

// Server URL - uses environment variable or defaults to localhost
// Colyseus client needs HTTP URL, it will automatically use WebSocket
const SERVER_URL = import.meta.env.VITE_WS_URL 
  ? import.meta.env.VITE_WS_URL.replace(/^ws/, 'http')
  : 'http://localhost:2567';

// Room state types (mirrors server schema)
export interface OnlinePlayer {
  id: number;
  x: number;
  y: number;
  color: string;
  state: string;
  direction: string;
  speed: number;
  bombRange: number;
  maxBombs: number;
  activeBombs: number;
  score: number;
  canKick: boolean;
  hasShield: boolean;
  ghostTimer: number;
  trappedTimer: number;
  invincibleTimer: number;
}

export interface OnlineBomb {
  id: string;
  ownerId: number;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  range: number;
  timer: number;
}

export interface OnlineExplosion {
  id: string;
  ownerId: number;
  gridX: number;
  gridY: number;
  timer: number;
}

export interface OnlineEnemy {
  id: string;
  enemyType: string;
  x: number;
  y: number;
  direction: string;
  speed: number;
  hp: number;
  maxHp: number;
}

export interface OnlineItem {
  id: string;
  gridX: number;
  gridY: number;
  itemType: number;
}

export interface OnlineGameState {
  phase: string;
  gameMode: string;
  roomCode: string;
  isPrivate: boolean;
  countdown: number;
  timeLeft: number;
  level: number;
  winner: number;
  players: Map<string, OnlinePlayer>;
  bombs: OnlineBomb[];
  explosions: OnlineExplosion[];
  enemies: OnlineEnemy[];
  items: OnlineItem[];
  grid: number[];
  bossSpawned: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface UseOnlineGameReturn {
  // Connection state
  status: ConnectionStatus;
  error: string | null;
  roomCode: string | null;
  sessionId: string | null;
  
  // Game state
  gameState: OnlineGameState | null;
  localPlayerId: number | null;
  
  // Client prediction state
  predictedPosition: { x: number; y: number } | null;
  
  // Actions
  createRoom: (mode: GameMode, isPrivate: boolean) => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
  quickMatch: (mode: GameMode) => Promise<void>;
  leaveRoom: () => void;
  sendInput: (input: PlayerInput) => void;
  placeBomb: () => void;
  sendReady: () => void;
}

export function useOnlineGame(): UseOnlineGameReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<OnlineGameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<number | null>(null);
  const [predictedPosition, setPredictedPosition] = useState<{ x: number; y: number } | null>(null);
  
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);
  const lastInputRef = useRef<PlayerInput>({ up: false, down: false, left: false, right: false });
  
  // Client prediction state
  const predictionRef = useRef<{
    x: number;
    y: number;
    speed: number;
    ghostTimer: number;
  } | null>(null);
  const predictionLoopRef = useRef<number | null>(null);
  
  // Reconnection state
  const reconnectAttemptRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRoomInfoRef = useRef<{
    roomId: string;
    roomName: string;
    mode: string;
  } | null>(null);
  
  // Convert OnlineBombs to BombAccessor for shared collision module
  const getBombAccessors = useCallback((bombs: OnlineBomb[]): BombAccessor[] => {
    return bombs.map(b => ({ gridX: b.gridX, gridY: b.gridY }));
  }, []);
  
  // Client prediction loop using shared movement module
  useEffect(() => {
    if (!gameState || gameState.phase !== 'PLAYING' || !predictionRef.current) {
      return;
    }
    
    const runPrediction = () => {
      const input = lastInputRef.current;
      const pred = predictionRef.current;
      
      if (!pred || !gameState) return;
      
      let dx = 0;
      let dy = 0;
      if (input.up) dy = -pred.speed;
      if (input.down) dy = pred.speed;
      if (input.left) dx = -pred.speed;
      if (input.right) dx = pred.speed;
      
      if (dx !== 0 || dy !== 0) {
        // Use shared predictMove from shared/movement.ts
        const grid = createGridAccessorFlat(gameState.grid);
        const bombs = getBombAccessors(gameState.bombs);
        const newPos = predictMove(
          pred.x, 
          pred.y, 
          dx, 
          dy, 
          pred.speed,
          grid,
          bombs,
          pred.ghostTimer > 0
        );
        pred.x = newPos.x;
        pred.y = newPos.y;
        setPredictedPosition({ x: newPos.x, y: newPos.y });
      }
      
      predictionLoopRef.current = requestAnimationFrame(runPrediction);
    };
    
    predictionLoopRef.current = requestAnimationFrame(runPrediction);
    
    return () => {
      if (predictionLoopRef.current) {
        cancelAnimationFrame(predictionLoopRef.current);
      }
    };
  }, [gameState, getBombAccessors]);
  
  // Initialize client
  useEffect(() => {
    console.log('Initializing Colyseus client with URL:', SERVER_URL);
    clientRef.current = new Client(SERVER_URL);
    
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  // Reconnect function
  const attemptReconnect = useCallback(async () => {
    if (!clientRef.current || !lastRoomInfoRef.current) {
      return;
    }
    
    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      setError('连接已断开，无法重连');
      setStatus('error');
      lastRoomInfoRef.current = null;
      reconnectAttemptRef.current = 0;
      return;
    }
    
    reconnectAttemptRef.current++;
    const attempt = reconnectAttemptRef.current;
    console.log(`Reconnection attempt ${attempt}/${maxReconnectAttempts}`);
    setStatus('connecting');
    setError(`正在重连... (${attempt}/${maxReconnectAttempts})`);
    
    try {
      const { roomId } = lastRoomInfoRef.current;
      const room = await clientRef.current.reconnect(roomId, sessionId || '');
      
      console.log('Reconnected successfully');
      roomRef.current = room;
      setSessionId(room.sessionId);
      setStatus('connected');
      setError(null);
      reconnectAttemptRef.current = 0;
      
      // Re-setup listeners (need to call setupRoomListeners from parent scope)
      room.onStateChange((state: any) => {
        const converted = convertState(state);
        setGameState(converted);
        
        const player = converted.players.get(room.sessionId);
        if (player) {
          setLocalPlayerId(player.id);
        }
      });
      
      room.onLeave((code: number) => {
        handleRoomLeave(code);
      });
      
      room.onError((code: number, message?: string) => {
        console.error('Room error:', code, message);
        setError(message || '房间发生错误');
        setStatus('error');
      });
      
    } catch (err) {
      console.error('Reconnection failed:', err);
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, reconnectAttemptRef.current - 1) * 1000;
      console.log(`Retrying in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, delay);
    }
  }, [sessionId]);
  
  // Handle room leave
  const handleRoomLeave = useCallback((code: number) => {
    console.log('Left room with code:', code);
    roomRef.current = null;
    
    // Code 1000 = normal closure (user left intentionally)
    // Code 1006 = abnormal closure (network issue)
    // Code 4000+ = custom codes from server
    
    if (code === 1000 || code >= 4000) {
      // User left intentionally or game ended normally
      setStatus('disconnected');
      setRoomCode(null);
      setSessionId(null);
      setGameState(null);
      setLocalPlayerId(null);
      lastRoomInfoRef.current = null;
      reconnectAttemptRef.current = 0;
    } else if (lastRoomInfoRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
      // Unexpected disconnect, try to reconnect
      console.log('Unexpected disconnect, attempting reconnection...');
      setStatus('connecting');
      setError('连接中断，正在重连...');
      
      // Start reconnection after a short delay
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, 1000);
    } else {
      // No room info or max attempts reached
      setStatus('disconnected');
      setRoomCode(null);
      setSessionId(null);
      setGameState(null);
      setLocalPlayerId(null);
    }
  }, [attemptReconnect]);
  
  // Convert schema state to plain object
  const convertState = useCallback((state: any): OnlineGameState => {
    const players = new Map<string, OnlinePlayer>();
    state.players.forEach((player: any, key: string) => {
      players.set(key, {
        id: player.id,
        x: player.x,
        y: player.y,
        color: player.color,
        state: player.state,
        direction: player.direction,
        speed: player.speed,
        bombRange: player.bombRange,
        maxBombs: player.maxBombs,
        activeBombs: player.activeBombs,
        score: player.score,
        canKick: player.canKick,
        hasShield: player.hasShield,
        ghostTimer: player.ghostTimer,
        trappedTimer: player.trappedTimer,
        invincibleTimer: player.invincibleTimer,
      });
    });
    
    return {
      phase: state.phase,
      gameMode: state.gameMode,
      roomCode: state.roomCode,
      isPrivate: state.isPrivate,
      countdown: state.countdown,
      timeLeft: state.timeLeft,
      level: state.level,
      winner: state.winner,
      players,
      bombs: Array.from(state.bombs || []),
      explosions: Array.from(state.explosions || []),
      enemies: Array.from(state.enemies || []),
      items: Array.from(state.items || []),
      grid: Array.from(state.grid || []),
      bossSpawned: state.bossSpawned,
    };
  }, []);
  
  // Set up room listeners
  const setupRoomListeners = useCallback((room: Room) => {
    room.onStateChange((state) => {
      const converted = convertState(state);
      setGameState(converted);
      
      // Update local player ID and sync prediction with server state
      const player = converted.players.get(room.sessionId);
      if (player) {
        setLocalPlayerId(player.id);
        
        // Server reconciliation: update prediction to match server state
        // with smooth interpolation to avoid jitter
        if (predictionRef.current) {
          const serverX = player.x;
          const serverY = player.y;
          const predX = predictionRef.current.x;
          const predY = predictionRef.current.y;
          
          // If prediction is too far from server, snap to server position
          const diff = Math.hypot(serverX - predX, serverY - predY);
          if (diff > TILE_SIZE) {
            // Large discrepancy, snap to server
            predictionRef.current.x = serverX;
            predictionRef.current.y = serverY;
          } else if (diff > 2) {
            // Small discrepancy, blend towards server
            predictionRef.current.x = predX + (serverX - predX) * 0.3;
            predictionRef.current.y = predY + (serverY - predY) * 0.3;
          }
          
          // Update player stats from server
          predictionRef.current.speed = player.speed;
          predictionRef.current.ghostTimer = player.ghostTimer;
        } else {
          // Initialize prediction
          predictionRef.current = {
            x: player.x,
            y: player.y,
            speed: player.speed,
            ghostTimer: player.ghostTimer,
          };
        }
        
        setPredictedPosition({ x: predictionRef.current.x, y: predictionRef.current.y });
      }
    });
    
    room.onLeave((code) => {
      handleRoomLeave(code);
    });
    
    room.onError((code, message) => {
      console.error('Room error:', code, message);
      setError(message || '房间发生错误');
      setStatus('error');
    });
  }, [convertState, handleRoomLeave]);
  
  // Create a new room
  const createRoom = useCallback(async (mode: GameMode, isPrivate: boolean) => {
    if (!clientRef.current) {
      console.error('Client not initialized');
      return;
    }
    
    setStatus('connecting');
    setError(null);
    
    try {
      const roomName = mode === GameMode.PVP ? 'bubble_pvp' : 'bubble_pve';
      console.log('Creating room:', roomName, { mode: mode === GameMode.PVP ? 'PVP' : 'PVE', isPrivate });
      const room = await clientRef.current.create(roomName, {
        mode: mode === GameMode.PVP ? 'PVP' : 'PVE',
        isPrivate,
      });
      console.log('Room created successfully:', room.roomId);
      
      roomRef.current = room;
      setSessionId(room.sessionId);
      setStatus('connected');
      
      // Save room info for potential reconnection
      lastRoomInfoRef.current = {
        roomId: room.roomId,
        roomName: roomName,
        mode: mode === GameMode.PVP ? 'PVP' : 'PVE',
      };
      reconnectAttemptRef.current = 0;
      
      // Room code will be set from state
      setupRoomListeners(room);
      
      // Wait for initial state
      room.onStateChange.once((state) => {
        setRoomCode(state.roomCode || room.roomId.substring(0, 4).toUpperCase());
      });
    } catch (err: any) {
      console.error('Failed to create room:', err);
      const errorMessage = err.message || err.toString() || '创建房间失败';
      setError(errorMessage);
      setStatus('error');
    }
  }, [setupRoomListeners]);
  
  // Join room by code
  const joinRoom = useCallback(async (code: string) => {
    if (!clientRef.current) return;
    
    setStatus('connecting');
    setError(null);
    
    const normalizedCode = code.trim().toUpperCase();
    
    try {
      // Try to find room by code in all room types
      const roomTypes = ['bubble_pvp', 'bubble_pve'];
      let targetRoom: { roomId: string } | undefined;
      
      for (const roomType of roomTypes) {
        try {
          const rooms = await clientRef.current.getAvailableRooms(roomType);
          targetRoom = rooms.find(r => 
            r.metadata?.roomCode === normalizedCode
          );
          if (targetRoom) break;
        } catch (e) {
          // Room type might not exist, continue
        }
      }
      
      let room: Room;
      let roomName = '';
      if (targetRoom) {
        room = await clientRef.current.joinById(targetRoom.roomId);
      } else {
        // Try joining by room ID directly as fallback
        try {
          room = await clientRef.current.joinById(normalizedCode);
        } catch (e) {
          throw new Error(`找不到房间代码为 ${normalizedCode} 的房间`);
        }
      }
      
      roomRef.current = room;
      setSessionId(room.sessionId);
      setRoomCode(normalizedCode);
      setStatus('connected');
      
      // Save room info for potential reconnection
      lastRoomInfoRef.current = {
        roomId: room.roomId,
        roomName: roomName || room.name,
        mode: '',
      };
      reconnectAttemptRef.current = 0;
      
      setupRoomListeners(room);
    } catch (err: any) {
      console.error('Failed to join room:', err);
      const errorMessage = err.message || err.toString() || '加入房间失败，请检查房间代码';
      setError(errorMessage);
      setStatus('error');
    }
  }, [setupRoomListeners]);
  
  // Quick match - join or create public room
  const quickMatch = useCallback(async (mode: GameMode) => {
    if (!clientRef.current) {
      console.error('Client not initialized');
      return;
    }
    
    setStatus('connecting');
    setError(null);
    
    try {
      const roomName = mode === GameMode.PVP ? 'bubble_pvp' : 'bubble_pve';
      console.log('Quick matching room:', roomName, { mode: mode === GameMode.PVP ? 'PVP' : 'PVE' });
      const room = await clientRef.current.joinOrCreate(roomName, {
        mode: mode === GameMode.PVP ? 'PVP' : 'PVE',
        isPrivate: false,
      });
      console.log('Room joined/created successfully:', room.roomId);
      
      roomRef.current = room;
      setSessionId(room.sessionId);
      setStatus('connected');
      
      // Save room info for potential reconnection
      lastRoomInfoRef.current = {
        roomId: room.roomId,
        roomName: roomName,
        mode: mode === GameMode.PVP ? 'PVP' : 'PVE',
      };
      reconnectAttemptRef.current = 0;
      
      setupRoomListeners(room);
    } catch (err: any) {
      console.error('Failed to quick match:', err);
      const errorMessage = err.message || err.toString() || '匹配失败';
      setError(errorMessage);
      setStatus('error');
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        serverUrl: SERVER_URL,
      });
    }
  }, [setupRoomListeners]);
  
  // Leave current room (intentional)
  const leaveRoom = useCallback(() => {
    // Clear reconnection state first to prevent auto-reconnect
    lastRoomInfoRef.current = null;
    reconnectAttemptRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }
    // Clear prediction state
    predictionRef.current = null;
    setPredictedPosition(null);
    if (predictionLoopRef.current) {
      cancelAnimationFrame(predictionLoopRef.current);
      predictionLoopRef.current = null;
    }
    
    setStatus('disconnected');
    setRoomCode(null);
    setSessionId(null);
    setGameState(null);
    setLocalPlayerId(null);
    setError(null);
  }, []);
  
  // Send input to server
  const sendInput = useCallback((input: PlayerInput) => {
    if (!roomRef.current) return;
    
    // Only send if input changed
    const last = lastInputRef.current;
    if (
      input.up !== last.up ||
      input.down !== last.down ||
      input.left !== last.left ||
      input.right !== last.right
    ) {
      roomRef.current.send('input', input);
      lastInputRef.current = { ...input };
    }
  }, []);
  
  // Place bomb
  const placeBomb = useCallback(() => {
    if (!roomRef.current) return;
    roomRef.current.send('bomb');
  }, []);
  
  // Send ready signal
  const sendReady = useCallback(() => {
    if (!roomRef.current) return;
    roomRef.current.send('ready');
  }, []);
  
  return {
    status,
    error,
    roomCode,
    sessionId,
    gameState,
    localPlayerId,
    predictedPosition,
    createRoom,
    joinRoom,
    quickMatch,
    leaveRoom,
    sendInput,
    placeBomb,
    sendReady,
  };
}

