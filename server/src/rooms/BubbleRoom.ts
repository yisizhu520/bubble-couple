import { Room, Client, Delayed } from "colyseus";
import { ArraySchema } from "@colyseus/schema";
import { GameRoomState, PlayerSchema, BombSchema, ExplosionSchema, EnemySchema, ItemSchema } from "./schema/GameState";
import {
  GRID_W, GRID_H, TILE_SIZE, PLAYER_SIZE, TileType, PlayerState,
  BOMB_TIMER_MS, EXPLOSION_DURATION_MS, BOMB_SLIDE_SPEED,
  TRAPPED_DURATION_MS, INVINCIBLE_DURATION_MS, GHOST_DURATION_MS,
  BASE_SPEED, MAX_SPEED, LEVEL_CONFIGS, GAME_DURATION_SEC
} from "../utils/constants";
import {
  generateId, getPixelCoords, getGridCoords, isColliding,
  checkEntityCollision, createInitialGrid, isEntityBlocked,
  spawnEnemy, movePlayer, triggerExplosion, applyItemEffect
} from "../utils/gameLogic";
import {
  AI_CONFIG,
  findNearestTarget,
  randomDirection,
  randomDirInterval,
  isInDanger,
  getDodgeDirection,
  getChaseDirection,
  getSimpleChaseDirection,
  type BombLike,
} from "../shared";

interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface RoomOptions {
  mode?: string;
  isPrivate?: boolean;
}

export class BubbleRoom extends Room<GameRoomState> {
  maxClients = 2;
  
  // Player input states
  private playerInputs = new Map<string, PlayerInput>();
  
  // Timers
  private countdownTimer: Delayed | null = null;
  private gameTimer: Delayed | null = null;

  // Generate 4-character room code
  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  onCreate(options: RoomOptions) {
    // Initialize state in onCreate, not as class property
    this.setState(new GameRoomState());
    
    console.log(`[${this.roomName}] BubbleRoom created with options:`, options);
    console.log(`  Room ID: ${this.roomId}`);
    
    // Set game mode
    this.state.gameMode = options.mode || "PVP";
    this.state.isPrivate = options.isPrivate || false;
    
    // Generate room code for all rooms (used for joining)
    this.state.roomCode = this.generateRoomCode();
    
    // Set metadata so rooms can be found by code
    this.setMetadata({ 
      roomCode: this.state.roomCode,
      gameMode: this.state.gameMode,
      isPrivate: this.state.isPrivate 
    });
    
    // Initialize empty grid (will be populated when game starts)
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      this.state.grid.push(0);
    }
    
    // Set up message handlers
    this.onMessage("input", this.handleInput.bind(this));
    this.onMessage("bomb", this.handleBomb.bind(this));
    this.onMessage("ready", this.handleReady.bind(this));
    
    // Set up game loop (60 FPS)
    this.setSimulationInterval((dt) => this.update(dt), 1000 / 60);
    
    // Set patch rate
    this.setPatchRate(50); // 20 updates per second to clients
  }

  onJoin(client: Client, options: any) {
    console.log(`[${this.roomName}] ${client.sessionId} joined room ${this.roomId}`);
    console.log(`  Options:`, options);
    console.log(`  Current players: ${this.state.players.size}/${this.maxClients}`);
    
    // Determine player number
    const playerNumber = this.state.players.size + 1;
    
    // Create player at spawn position
    const spawnPos = playerNumber === 1
      ? getPixelCoords(1, 1)
      : getPixelCoords(GRID_W - 2, GRID_H - 2);
    
    const player = new PlayerSchema(
      playerNumber,
      spawnPos.x,
      spawnPos.y,
      playerNumber === 1 ? "#3b82f6" : "#ef4444"
    );
    player.direction = playerNumber === 1 ? "DOWN" : "UP";
    
    this.state.players.set(client.sessionId, player);
    
    // Initialize input state
    this.playerInputs.set(client.sessionId, {
      up: false,
      down: false,
      left: false,
      right: false,
    });
    
    // Check if room is full
    if (this.state.players.size >= this.maxClients) {
      this.lock();
      
      // Auto-start when 2 players join (both PVP and PVE modes)
      this.startCountdown();
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`${client.sessionId} left room ${this.roomId}`);
    
    // Remove player
    this.state.players.delete(client.sessionId);
    this.playerInputs.delete(client.sessionId);
    
    // If game is in progress, other player wins
    if (this.state.phase === "PLAYING") {
      const remainingPlayers = Array.from(this.state.players.values());
      if (remainingPlayers.length === 1) {
        this.state.winner = remainingPlayers[0].id;
        this.state.phase = "FINISHED";
      } else if (remainingPlayers.length === 0) {
        this.state.phase = "FINISHED";
      }
    }
    
    // Unlock room if not full
    if (this.state.players.size < this.maxClients) {
      this.unlock();
    }
  }

  onDispose() {
    console.log("BubbleRoom disposing...");
    if (this.countdownTimer) this.countdownTimer.clear();
    if (this.gameTimer) this.gameTimer.clear();
  }

  // Handle player input
  private handleInput(client: Client, data: PlayerInput) {
    if (this.state.phase !== "PLAYING") return;
    
    const input = this.playerInputs.get(client.sessionId);
    if (input) {
      input.up = data.up;
      input.down = data.down;
      input.left = data.left;
      input.right = data.right;
    }
  }

  // Handle bomb placement
  private handleBomb(client: Client) {
    if (this.state.phase !== "PLAYING") return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player || player.state !== PlayerState.NORMAL) return;
    
    if (player.activeBombs >= player.maxBombs) return;
    
    const gridCoords = getGridCoords(player.x, player.y);
    
    // Check if bomb already exists at this position
    const exists = this.state.bombs.some(
      b => b.gridX === gridCoords.x && b.gridY === gridCoords.y
    );
    if (exists) return;
    
    // Create bomb
    const bomb = new BombSchema(
      generateId(),
      player.id,
      gridCoords.x,
      gridCoords.y,
      player.bombRange
    );
    
    this.state.bombs.push(bomb);
    player.activeBombs++;
  }

  // Handle player ready
  private handleReady(client: Client) {
    if (this.state.phase !== "WAITING") return;

    // For PVE mode, can start with single player
    if (this.state.gameMode === "PVE" && this.state.players.size >= 1) {
      this.startCountdown();
    }
  }

  // Reset all player stats to base values
  private resetAllPlayers() {
    this.state.players.forEach((player) => {
      player.speed = BASE_SPEED;
      player.bombRange = 1;
      player.maxBombs = 1;
      player.activeBombs = 0;
      player.canKick = false;
      player.hasShield = false;
      player.ghostTimer = 0;
      player.trappedTimer = 0;
      player.invincibleTimer = 0;
      player.score = 0; // Also reset score for new game
    });
  }

  // Start countdown
  private startCountdown() {
    if (this.state.phase !== "WAITING" && this.state.phase !== "FINISHED") return;

    // Reset player stats when starting countdown after game over
    if (this.state.phase === "FINISHED") {
      this.resetAllPlayers();
    }

    this.state.phase = "COUNTDOWN";
    this.state.countdown = 3;

    // Initialize game map
    this.initializeGame();

    // Countdown timer
    this.countdownTimer = this.clock.setInterval(() => {
      this.state.countdown--;

      if (this.state.countdown <= 0) {
        this.countdownTimer?.clear();
        this.startGame();
      }
    }, 1000);
  }

  // Initialize game state
  private initializeGame() {
    const levelConfig = LEVEL_CONFIGS[this.state.level - 1] || LEVEL_CONFIGS[0];
    
    // Create grid and items
    const { grid, items } = createInitialGrid(levelConfig.wallDensity);
    
    // Copy grid to state (clear + push to ensure patches are sent)
    this.state.grid.clear();
    grid.forEach((tile) => {
      this.state.grid.push(tile ?? 0);
    });
    
    // Add items
    this.state.items.clear();
    items.forEach(item => this.state.items.push(item));
    
    // Reset players to spawn positions
    let playerIndex = 0;
    this.state.players.forEach((player, sessionId) => {
      const spawnPos = playerIndex === 0
        ? getPixelCoords(1, 1)
        : getPixelCoords(GRID_W - 2, GRID_H - 2);
      
      player.x = spawnPos.x;
      player.y = spawnPos.y;
      player.state = PlayerState.NORMAL;
      player.direction = playerIndex === 0 ? "DOWN" : "UP";
      player.speed = BASE_SPEED;
      player.bombRange = 1;
      player.maxBombs = 1;
      player.activeBombs = 0;
      player.canKick = false;
      player.hasShield = false;
      player.ghostTimer = 0;
      player.trappedTimer = 0;
      player.invincibleTimer = 0;
      
      playerIndex++;
    });
    
    // Clear bombs and explosions
    this.state.bombs.clear();
    this.state.explosions.clear();
    
    // Spawn enemies for PVE mode
    this.state.enemies.clear();
    if (this.state.gameMode === "PVE") {
      levelConfig.enemies.forEach((enemyType, idx) => {
        const enemy = spawnEnemy(this.state.grid, this.state.enemies, enemyType, `init-${idx}`);
        if (enemy) {
          this.state.enemies.push(enemy);
        }
      });
    }
    
    this.state.bossSpawned = false;
  }

  // Start the game
  private startGame() {
    this.state.phase = "PLAYING";
    this.state.timeLeft = GAME_DURATION_SEC;
    
    // Game timer (1 second intervals)
    this.gameTimer = this.clock.setInterval(() => {
      if (this.state.phase !== "PLAYING") return;
      
      this.state.timeLeft--;
      
      if (this.state.timeLeft <= 0) {
        this.endGame(0); // Draw on timeout
      }
    }, 1000);
  }

  // Main game update loop
  // dt is in milliseconds, target is 60 FPS (16.67ms per frame)
  private update(dt: number) {
    if (this.state.phase !== "PLAYING") return;
    
    // Normalize dt to handle frame rate variations
    // timeFactor = 1.0 at 60 FPS, higher if frame took longer
    const targetFrameTime = 1000 / 60; // 16.67ms
    const timeFactor = dt / targetFrameTime;
    
    // Update players
    this.updatePlayers(dt, timeFactor);
    
    // Update bombs
    this.updateBombs(dt, timeFactor);
    
    // Update explosions
    this.updateExplosions(dt);
    
    // Update enemies (PVE only)
    if (this.state.gameMode === "PVE") {
      this.updateEnemies(dt, timeFactor);
    }
    
    // Check collisions
    this.checkCollisions(dt);
    
    // Check game over conditions
    this.checkGameOver();
  }

  // Update player positions and states
  private updatePlayers(dt: number, timeFactor: number) {
    this.state.players.forEach((player, sessionId) => {
      if (player.state === PlayerState.DEAD) return;
      
      // Update timers
      if (player.ghostTimer > 0) player.ghostTimer -= dt;
      if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
      
      if (player.state === PlayerState.TRAPPED) {
        player.trappedTimer -= dt;
        if (player.trappedTimer <= 0) {
          player.state = PlayerState.DEAD;
        }
        return;
      }
      
      // Get input
      const input = this.playerInputs.get(sessionId);
      if (!input) return;
      
      // Calculate movement with time factor for frame-rate independence
      const effectiveSpeed = player.speed * timeFactor;
      let dx = 0;
      let dy = 0;
      if (input.up) dy = -effectiveSpeed;
      if (input.down) dy = effectiveSpeed;
      if (input.left) dx = -effectiveSpeed;
      if (input.right) dx = effectiveSpeed;
      
      if (dx !== 0 || dy !== 0) {
        const result = movePlayer(player, dx, dy, this.state.grid, this.state.bombs, player.x, player.y);
        player.x = result.x;
        player.y = result.y;
        player.direction = result.direction;
        
        // Check for item pickup
        this.checkItemPickup(player);
      }
    });
  }

  // Check if player picks up item
  private checkItemPickup(player: PlayerSchema) {
    const gridCoords = getGridCoords(player.x, player.y);
    
    const itemIndex = this.state.items.findIndex(
      item => item.gridX === gridCoords.x && item.gridY === gridCoords.y
    );
    
    if (itemIndex !== -1) {
      const item = this.state.items[itemIndex];
      if (item) {
        applyItemEffect(player, item.itemType);
        this.state.items.splice(itemIndex, 1);
      }
    }
  }

  // Update bombs
  private updateBombs(dt: number, timeFactor: number) {
    const explodedBombs: BombSchema[] = [];
    
    this.state.bombs.forEach(bomb => {
      // Update bomb sliding with time factor
      if (bomb.vx !== 0 || bomb.vy !== 0) {
        const nextX = bomb.x + bomb.vx * timeFactor;
        const nextY = bomb.y + bomb.vy * timeFactor;
        const centerX = nextX + TILE_SIZE / 2;
        const centerY = nextY + TILE_SIZE / 2;
        const gx = Math.floor(centerX / TILE_SIZE);
        const gy = Math.floor(centerY / TILE_SIZE);
        
        let blocked = false;
        if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) blocked = true;
        else if (this.state.grid[gy * GRID_W + gx] !== TileType.EMPTY) blocked = true;
        else {
          const otherBomb = this.state.bombs.find(
            b => b !== bomb && b.gridX === gx && b.gridY === gy
          );
          if (otherBomb) blocked = true;
        }
        
        if (blocked) {
          bomb.vx = 0;
          bomb.vy = 0;
          bomb.x = bomb.gridX * TILE_SIZE;
          bomb.y = bomb.gridY * TILE_SIZE;
        } else {
          bomb.x = nextX;
          bomb.y = nextY;
          bomb.gridX = gx;
          bomb.gridY = gy;
        }
      }
      
      // Update timer
      bomb.timer -= dt;
      if (bomb.timer <= 0) {
        explodedBombs.push(bomb);
      }
    });
    
    // Process explosions
    const newExplosions: ExplosionSchema[] = [];
    explodedBombs.forEach(bomb => {
      const index = this.state.bombs.indexOf(bomb);
      if (index !== -1) {
        this.state.bombs.splice(index, 1);
        
        // Decrement owner's active bomb count
        this.state.players.forEach(player => {
          if (player.id === bomb.ownerId) {
            player.activeBombs = Math.max(0, player.activeBombs - 1);
          }
        });
        
        triggerExplosion(bomb, this.state, newExplosions);
      }
    });
    
    // Add new explosions
    newExplosions.forEach(exp => this.state.explosions.push(exp));
  }

  // Update explosions
  private updateExplosions(dt: number) {
    const toRemove: number[] = [];
    
    this.state.explosions.forEach((explosion, index) => {
      explosion.timer -= dt;
      if (explosion.timer <= 0) {
        toRemove.push(index);
      }
    });
    
    // Remove expired explosions (reverse order)
    toRemove.reverse().forEach(index => {
      this.state.explosions.splice(index, 1);
    });
  }

  // Update enemies (PVE mode)
  private updateEnemies(dt: number, timeFactor: number) {
    const levelConfig = LEVEL_CONFIGS[this.state.level - 1] || LEVEL_CONFIGS[0];
    
    // Spawn boss if all enemies cleared
    if (this.state.enemies.length === 0 && !this.state.bossSpawned && levelConfig.boss) {
      this.state.bossSpawned = true;
      const boss = spawnEnemy(this.state.grid, this.state.enemies, levelConfig.boss, "boss");
      if (boss) {
        this.state.enemies.push(boss);
      }
    }
    
    // Create collision checker for enemies (closure captures state)
    const createCollisionChecker = (enemy: EnemySchema) => {
      return (nx: number, ny: number) => 
        isEntityBlocked(nx, ny, this.state.grid, this.state.bombs, false);
    };
    
    // Convert bombs to BombLike interface
    const bombs: BombLike[] = [];
    this.state.bombs.forEach(b => {
      bombs.push({
        gridX: b.gridX,
        gridY: b.gridY,
        range: b.range,
        timer: b.timer,
      });
    });
    
    this.state.enemies.forEach(enemy => {
      if (enemy.invincibleTimer > 0) enemy.invincibleTimer -= dt;
      
      enemy.changeDirTimer -= dt;
      enemy.actionTimer -= dt;
      
      // Find nearest player using shared module
      const players = Array.from(this.state.players.values());
      const targetPlayer = findNearestTarget(
        enemy,
        players,
        (p) => p.state !== PlayerState.DEAD
      );
      
      // Boss abilities
      if (enemy.actionTimer <= 0) {
        if (enemy.enemyType === "BOSS_SLIME" && this.state.enemies.length < AI_CONFIG.MAX_MINIONS) {
          const minion = spawnEnemy(this.state.grid, this.state.enemies, "MINION", "minion");
          if (minion) {
            minion.x = enemy.x;
            minion.y = enemy.y;
            this.state.enemies.push(minion);
          }
          enemy.actionTimer = AI_CONFIG.BOSS_SLIME_SPAWN_COOLDOWN;
        } else if (enemy.enemyType === "BOSS_MECHA" && !isInDanger(enemy, bombs)) {
          const gx = Math.floor((enemy.x + PLAYER_SIZE / 2) / TILE_SIZE);
          const gy = Math.floor((enemy.y + PLAYER_SIZE / 2) / TILE_SIZE);
          const exists = this.state.bombs.some(b => b.gridX === gx && b.gridY === gy);
          if (!exists) {
            const bomb = new BombSchema(
              `megabomb-${Date.now()}`,
              0,
              gx,
              gy,
              AI_CONFIG.BOSS_MECHA_BOMB_RANGE
            );
            bomb.timer = AI_CONFIG.BOSS_MECHA_BOMB_TIMER;
            this.state.bombs.push(bomb);
          }
          enemy.actionTimer = AI_CONFIG.BOSS_MECHA_BOMB_COOLDOWN;
        }
      }
      
      // Movement AI using shared module
      const isChaser = ["GHOST", "TANK", "MINION", "BOSS_SLIME", "BOSS_MECHA"].includes(enemy.enemyType);
      const collisionChecker = createCollisionChecker(enemy);
      
      // BOSS_MECHA priority: dodge bombs first
      if (enemy.enemyType === "BOSS_MECHA" && enemy.changeDirTimer <= 0) {
        const dodgeDir = getDodgeDirection(enemy, bombs, collisionChecker);
        if (dodgeDir) {
          enemy.direction = dodgeDir;
          enemy.changeDirTimer = 50; // Quick re-evaluate when dodging
        } else if (targetPlayer) {
          enemy.direction = getChaseDirection(enemy, targetPlayer, collisionChecker);
          enemy.changeDirTimer = AI_CONFIG.CHASE_RECALC_INTERVAL;
        }
      }
      // Other chasers: use smart chase with obstacle avoidance
      else if (isChaser && targetPlayer && enemy.changeDirTimer <= 0) {
        enemy.direction = getChaseDirection(enemy, targetPlayer, collisionChecker);
        enemy.changeDirTimer = AI_CONFIG.CHASE_RECALC_INTERVAL;
      }
      // Random movement for non-chasers (BALLOON, FROG)
      else if (enemy.changeDirTimer <= 0) {
        enemy.direction = randomDirection();
        enemy.changeDirTimer = randomDirInterval();
      }
      
      // Move enemy with time factor
      let dx = 0;
      let dy = 0;
      const effectiveSpeed = enemy.speed * timeFactor;
      switch (enemy.direction) {
        case "UP": dy = -effectiveSpeed; break;
        case "DOWN": dy = effectiveSpeed; break;
        case "LEFT": dx = -effectiveSpeed; break;
        case "RIGHT": dx = effectiveSpeed; break;
      }
      
      const nextX = enemy.x + dx;
      const nextY = enemy.y + dy;
      
      if (!isEntityBlocked(nextX, nextY, this.state.grid, this.state.bombs, false)) {
        enemy.x = nextX;
        enemy.y = nextY;
      } else {
        // Hit wall - trigger direction change immediately
        enemy.changeDirTimer = 0;
      }
    });
  }

  // Check collisions
  private checkCollisions(dt: number) {
    // Player vs Explosion
    this.state.players.forEach(player => {
      if (player.state === PlayerState.DEAD || player.invincibleTimer > 0) return;
      
      const gridCoords = getGridCoords(player.x, player.y);
      const hitExplosion = this.state.explosions.some(
        exp => exp.gridX === gridCoords.x && exp.gridY === gridCoords.y
      );
      
      if (hitExplosion) {
        this.damagePlayer(player);
      }
    });
    
    // Player vs Enemy (PVE)
    if (this.state.gameMode === "PVE") {
      this.state.players.forEach(player => {
        if (player.state === PlayerState.DEAD || player.invincibleTimer > 0) return;
        
        const hitEnemy = this.state.enemies.some(enemy =>
          checkEntityCollision(player.x, player.y, enemy.x, enemy.y)
        );
        
        if (hitEnemy) {
          this.damagePlayer(player);
        }
      });
      
      // Enemy vs Explosion
      const enemiesToRemove: number[] = [];
      this.state.enemies.forEach((enemy, index) => {
        if (enemy.invincibleTimer > 0) return;
        
        const gridCoords = getGridCoords(enemy.x, enemy.y);
        const explosion = this.state.explosions.find(
          exp => exp.gridX === gridCoords.x && exp.gridY === gridCoords.y
        );
        
        if (explosion) {
          enemy.hp--;
          enemy.invincibleTimer = 500;
          
          if (enemy.hp <= 0) {
            // Award score to explosion owner
            if (explosion.ownerId > 0) {
              this.state.players.forEach(player => {
                if (player.id === explosion.ownerId) {
                  player.score++;
                }
              });
            }
            enemiesToRemove.push(index);
          }
        }
      });
      
      enemiesToRemove.reverse().forEach(index => {
        this.state.enemies.splice(index, 1);
      });
    }
    
    // Player vs Player rescue (co-op)
    const players = Array.from(this.state.players.values());
    if (players.length === 2) {
      const [p1, p2] = players;
      if (checkEntityCollision(p1.x, p1.y, p2.x, p2.y)) {
        if (p1.state === PlayerState.NORMAL && p2.state === PlayerState.TRAPPED) {
          p2.state = PlayerState.NORMAL;
          p2.invincibleTimer = INVINCIBLE_DURATION_MS;
        } else if (p2.state === PlayerState.NORMAL && p1.state === PlayerState.TRAPPED) {
          p1.state = PlayerState.NORMAL;
          p1.invincibleTimer = INVINCIBLE_DURATION_MS;
        }
      }
    }
  }

  // Damage player
  private damagePlayer(player: PlayerSchema) {
    if (player.hasShield) {
      player.hasShield = false;
      player.invincibleTimer = 1000;
      return;
    }
    
    if (player.state === PlayerState.NORMAL) {
      player.state = PlayerState.TRAPPED;
      player.trappedTimer = TRAPPED_DURATION_MS;
      player.invincibleTimer = 1000;
    } else if (player.state === PlayerState.TRAPPED && player.invincibleTimer <= 0) {
      player.state = PlayerState.DEAD;
    }
  }

  // Check game over conditions
  private checkGameOver() {
    const players = Array.from(this.state.players.values());
    const alivePlayers = players.filter(p => p.state !== PlayerState.DEAD);
    const trappedPlayers = players.filter(p => p.state === PlayerState.TRAPPED);
    
    if (this.state.gameMode === "PVE") {
      const levelConfig = LEVEL_CONFIGS[this.state.level - 1] || LEVEL_CONFIGS[0];
      const allEnemiesDead = this.state.enemies.length === 0;
      const bossConditionMet = !levelConfig.boss || this.state.bossSpawned;
      
      if (allEnemiesDead && bossConditionMet) {
        if (this.state.level >= LEVEL_CONFIGS.length) {
          this.endGame(12); // PVE Win
        } else {
          // Level clear - advance to next level
          this.state.phase = "LEVEL_CLEAR";
          this.state.level++;
          
          // Auto restart after delay
          this.clock.setTimeout(() => {
            this.initializeGame();
            this.state.phase = "PLAYING";
          }, 3000);
        }
      } else if (alivePlayers.length === 0) {
        this.endGame(0); // All dead
      }
    } else {
      // PVP mode
      if (alivePlayers.length === 0) {
        this.endGame(0); // Draw
      } else if (alivePlayers.length === 1 && trappedPlayers.length === 0) {
        this.endGame(alivePlayers[0].id);
      }
    }
  }

  // End game
  private endGame(winner: number) {
    this.state.phase = "FINISHED";
    this.state.winner = winner;
    
    if (this.gameTimer) {
      this.gameTimer.clear();
      this.gameTimer = null;
    }
  }
}

