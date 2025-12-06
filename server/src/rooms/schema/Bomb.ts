import { Schema, type } from "@colyseus/schema";

export class BombSchema extends Schema {
  @type("string") id: string = "";
  @type("number") ownerId: number = 0;
  @type("number") gridX: number = 0;
  @type("number") gridY: number = 0;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") range: number = 1;
  @type("number") timer: number = 3000;

  constructor(id: string = "", ownerId: number = 0, gridX: number = 0, gridY: number = 0, range: number = 1) {
    super();
    this.id = id;
    this.ownerId = ownerId;
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * 48; // TILE_SIZE
    this.y = gridY * 48;
    this.range = range;
    this.timer = 3000; // BOMB_TIMER_MS
  }
}

export class ExplosionSchema extends Schema {
  @type("string") id: string = "";
  @type("number") ownerId: number = 0;
  @type("number") gridX: number = 0;
  @type("number") gridY: number = 0;
  @type("number") timer: number = 600;

  constructor(id: string = "", ownerId: number = 0, gridX: number = 0, gridY: number = 0) {
    super();
    this.id = id;
    this.ownerId = ownerId;
    this.gridX = gridX;
    this.gridY = gridY;
    this.timer = 600; // EXPLOSION_DURATION_MS
  }
}

