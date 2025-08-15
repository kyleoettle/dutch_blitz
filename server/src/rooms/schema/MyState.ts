import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") heldCard: string = "";
  @type(["string"]) blitzPile: string[] = []; // 10 cards, face-down except top
  @type(["string"]) postPile: string[] = []; // 30 cards, face-down draw pile
  @type(["string"]) dutchPile: string[] = []; // up to 3 cards, face-up
  @type("number") score: number = 0; // for scoring system
}

export class Card extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") pickedUp: boolean = false;
  @type("number") value: number = 1; // 1-10 for Dutch Blitz (not 1-13)
  @type("string") color: string = "red"; // red, green, blue, yellow
  @type("boolean") faceUp: boolean = true; // for visual representation
  @type("string") owner: string = ""; // player sessionId who owns this card
}

export class Pile extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") topCard: number = -1; // card index of top card
  @type(["string"]) cardStack: string[] = []; // array of card IDs in stack order
  @type("string") type: string = "dutch"; // "dutch", "blitz", "post", or "personal"
}

export class MyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Card }) cards = new MapSchema<Card>();
  @type({ map: Pile }) piles = new MapSchema<Pile>();
  @type("string") gameStatus: string = "waiting"; // "waiting", "playing", "finished"
  @type("string") winner: string = ""; // sessionId of winner
}
