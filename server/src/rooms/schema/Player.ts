import { Schema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("number") id: number = 0;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") color: string = "#3b82f6";
  @type("string") state: string = "NORMAL"; // NORMAL, TRAPPED, DEAD
  @type("string") direction: string = "DOWN"; // UP, DOWN, LEFT, RIGHT
  
  // Stats
  @type("number") speed: number = 1;
  @type("number") bombRange: number = 1;
  @type("number") maxBombs: number = 1;
  @type("number") activeBombs: number = 0;
  @type("number") score: number = 0;
  
  // Abilities
  @type("boolean") canKick: boolean = false;
  @type("boolean") hasShield: boolean = false;
  @type("number") ghostTimer: number = 0;
  
  // State timers
  @type("number") trappedTimer: number = 0;
  @type("number") invincibleTimer: number = 0;

  constructor(id: number = 0, x: number = 0, y: number = 0, color: string = "#3b82f6") {
    super();
    this.id = id;
    this.x = x;
    this.y = y;
    this.color = color;
  }
}

