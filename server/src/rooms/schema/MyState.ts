import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") heldCard: string = "";
}

export class Card extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") pickedUp: boolean = false;
  @type("number") value: number = 1; // 1-13 for card values
  @type("string") color: string = "red"; // red, green, blue, yellow
}

export class Pile extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") topCard: number = -1; // card index of top card
  @type(["string"]) cardStack: string[] = []; // array of card IDs in stack order
}

export class MyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Card }) cards = new MapSchema<Card>();
  @type({ map: Pile }) piles = new MapSchema<Pile>();
}
