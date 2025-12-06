import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { PlayerSchema } from "./Player";
import { BombSchema, ExplosionSchema } from "./Bomb";
import { EnemySchema } from "./Enemy";
import { ItemSchema } from "./Item";

export class GameRoomState extends Schema {
  // Room phase: WAITING, COUNTDOWN, PLAYING, LEVEL_CLEAR, FINISHED
  @type("string") phase: string = "WAITING";
  
  // Game mode: PVP, PVE
  @type("string") gameMode: string = "PVP";
  
  // Room info
  @type("string") roomCode: string = "";
  @type("boolean") isPrivate: boolean = false;
  
  // Game countdown (3, 2, 1...)
  @type("number") countdown: number = 3;
  
  // Game timer
  @type("number") timeLeft: number = 180;
  
  // Level (for PVE)
  @type("number") level: number = 1;
  
  // Winner (0 = draw/none, 1 = player1, 2 = player2, 12 = PVE win)
  @type("number") winner: number = 0;
  
  // Players map (sessionId -> Player)
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  
  // Game entities
  @type([BombSchema]) bombs = new ArraySchema<BombSchema>();
  @type([ExplosionSchema]) explosions = new ArraySchema<ExplosionSchema>();
  @type([EnemySchema]) enemies = new ArraySchema<EnemySchema>();
  @type([ItemSchema]) items = new ArraySchema<ItemSchema>();
  
  // Grid data (flattened 2D array: GRID_W * GRID_H)
  // 0 = EMPTY, 1 = WALL_HARD, 2 = WALL_SOFT
  @type(["number"]) grid = new ArraySchema<number>();
  
  // Boss spawned flag
  @type("boolean") bossSpawned: boolean = false;
}

// Re-export all schemas for convenience
export { PlayerSchema } from "./Player";
export { BombSchema, ExplosionSchema } from "./Bomb";
export { EnemySchema } from "./Enemy";
export { ItemSchema } from "./Item";

