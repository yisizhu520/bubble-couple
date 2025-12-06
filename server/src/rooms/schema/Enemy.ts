import { Schema, type } from "@colyseus/schema";

export class EnemySchema extends Schema {
  @type("string") id: string = "";
  @type("string") enemyType: string = "BALLOON"; // BALLOON, GHOST, MINION, FROG, TANK, BOSS_SLIME, BOSS_MECHA
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") direction: string = "DOWN";
  @type("number") speed: number = 0.9;
  
  // Combat Stats
  @type("number") hp: number = 1;
  @type("number") maxHp: number = 1;
  
  // AI State (server only, but sync for visual effects)
  @type("number") changeDirTimer: number = 0;
  @type("number") actionTimer: number = 2000;
  @type("number") invincibleTimer: number = 0;

  constructor(id: string = "", enemyType: string = "BALLOON", x: number = 0, y: number = 0) {
    super();
    this.id = id;
    this.enemyType = enemyType;
    this.x = x;
    this.y = y;
    
    // Set stats based on type
    const stats: Record<string, { speed: number; hp: number }> = {
      BALLOON: { speed: 0.9, hp: 1 },
      GHOST: { speed: 1.3, hp: 1 },
      MINION: { speed: 1.2, hp: 1 },
      FROG: { speed: 1.2, hp: 1 },
      TANK: { speed: 0.6, hp: 2 },
      BOSS_SLIME: { speed: 1.7, hp: 4 },
      BOSS_MECHA: { speed: 1.1, hp: 6 },
    };
    
    const typeStats = stats[enemyType] || stats.BALLOON;
    this.speed = typeStats.speed;
    this.hp = typeStats.hp;
    this.maxHp = typeStats.hp;
  }
}

