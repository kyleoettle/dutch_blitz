import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") heldCard: string = "";
  @type(["string"]) blitzPile: string[] = []; // 10 cards, face-down except top
  @type(["string"]) reserveCards: string[] = []; // 30 face-down reserve cards (was postPile)
  @type(["string"]) postPile: string[] = []; // up to 3 face-up post slot cards (was dutchPile)
  @type(["string"]) woodPile: string[] = []; // cards currently revealed from reserve via draw/cycle (press 'r')
  @type("number") score: number = 0; // for scoring system
  @type("number") heldFromVisibleIndex: number = -1; // index in postPile a card was picked from (for delayed refill)
  @type("number") heldOriginX: number = 0; // original pickup x (for proximity-based return)
  @type("number") heldOriginY: number = 0; // original pickup y
  @type("string") heldOriginSource: string = ""; // 'blitz' | 'postSlot' | 'wood' | 'reserve'
  
  // Pile positions for proximity detection (remain fixed even when cards are picked up)
  @type("number") blitzPileX: number = 0;
  @type("number") blitzPileY: number = 0;
  @type(["number"]) postSlotX: number[] = []; // x coordinates for 3 post slots
  @type(["number"]) postSlotY: number[] = []; // y coordinates for 3 post slots
  @type("number") woodIndicatorX: number = 0;
  @type("number") woodIndicatorY: number = 0;
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
  @type("string") color: string = ""; // color assigned when first card (value 1) placed; required for subsequent cards
}

export class MyState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Card }) cards = new MapSchema<Card>();
  @type({ map: Pile }) piles = new MapSchema<Pile>();
  @type("string") gameStatus: string = "waiting"; // "waiting", "playing", "finished"
  @type("string") winner: string = ""; // sessionId of winner
}
