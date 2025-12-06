import { Schema, type } from "@colyseus/schema";

export class ItemSchema extends Schema {
  @type("string") id: string = "";
  @type("number") gridX: number = 0;
  @type("number") gridY: number = 0;
  @type("number") itemType: number = 0; // 0=NONE, 1=RANGE_UP, 2=BOMB_UP, 3=SPEED_UP, 4=KICK, 5=GHOST, 6=SHIELD

  constructor(id: string = "", gridX: number = 0, gridY: number = 0, itemType: number = 0) {
    super();
    this.id = id;
    this.gridX = gridX;
    this.gridY = gridY;
    this.itemType = itemType;
  }
}

