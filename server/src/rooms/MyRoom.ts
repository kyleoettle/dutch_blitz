import { Room, Client } from "colyseus";
import { MyState, Player, Card, Pile } from "./schema/MyState";

export class MyRoom extends Room<MyState> {
  maxClients = 8;
  state = new MyState();

  onCreate(options: any) {
    console.log('MyRoom created!');
    console.log('Initial state:', this.state);

    // Initialize sample piles
    for (let i = 0; i < 4; i++) {
      const pile = new Pile();
      pile.id = `pile${i}`;
      pile.x = -6 + i * 4;
      pile.y = 0;
      pile.topCard = -1;
      pile.cardStack = [];
      this.state.piles.set(pile.id, pile);
    }

    // Initialize sample cards with values and colors
    const colors = ["red", "green", "blue", "yellow"];
    for (let i = 0; i < 8; i++) {
      const card = new Card();
      card.id = `card${i}`;
      card.x = -6 + i * 2;
      card.y = 4;
      card.pickedUp = false;
      card.value = (i % 13) + 1; // Values 1-13
      card.color = colors[i % 4]; // Cycle through colors
      this.state.cards.set(card.id, card);
    }

    this.onMessage("move", (client, message) => {
      // Handle player movement
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = message.x;
        player.y = message.y;
      }
    });
    this.onMessage("pickup", (client, message) => {
  // Handle card pickup
  const player = this.state.players.get(client.sessionId);
  if (!player || player.heldCard) {
    console.log('Pickup ignored: player not found or already holding a card');
    return;
  }
  const card = this.state.cards.get(message.cardId);
  if (!card || card.pickedUp) {
    console.log('Pickup ignored: card not found or already picked up');
    return;
  }
  card.pickedUp = true;
  player.heldCard = card.id;
  // Move card to player position, but do NOT change player position
  card.x = player.x;
  card.y = player.y;
  console.log(`Player ${client.sessionId} picked up card ${card.id}. player.heldCard now:`, player.heldCard);
    });
    this.onMessage("drop", (client, message) => {
  console.log('Drop message received:', message);
  const player = this.state.players.get(client.sessionId);
  if (!player || !player.heldCard) {
    console.log('Drop ignored: player not holding a card');
    return;
  }
  const card = this.state.cards.get(player.heldCard);
  if (!card) {
    console.log('Drop ignored: card not found');
    return;
  }
  card.pickedUp = false;
  player.heldCard = "";
  // Do NOT change player.x/y here
  if (message.pileId) {
    const pile = this.state.piles.get(message.pileId);
    if (pile) {
      // Extract card index from id (e.g., 'card3' -> 3)
      const cardIndex = parseInt(card.id.replace('card', ''), 10);
      pile.topCard = isNaN(cardIndex) ? -1 : cardIndex;
      // Add card to pile stack
      pile.cardStack.push(card.id);
      // Position card on pile with better stacking visual
      const stackPosition = pile.cardStack.length - 1;
      const stackOffset = stackPosition * 0.1; // slight horizontal offset
      card.x = pile.x + stackOffset; // X position with fanning
      card.y = pile.y; // Z position (same as pile)
      // We'll handle height in client based on stack position
      console.log(`Player ${client.sessionId} dropped card ${card.id} onto pile ${pile.id}. Stack size: ${pile.cardStack.length}, Position: ${stackPosition}`);
    } else {
      console.log('Drop pileId provided but pile not found:', message.pileId);
      // Return card to player if pile not found
      card.pickedUp = true;
      player.heldCard = card.id;
    }
  } else {
    // Reject ground drops - return card to player
    console.log(`Ground drop rejected for player ${client.sessionId}. Card ${card.id} returned to player.`);
    card.pickedUp = true;
    player.heldCard = card.id;
  }
    });
  }

  onJoin(client: Client, options: any) {
    console.log('Player joined MyRoom:', client.sessionId);
    this.state.players.set(client.sessionId, new Player());
    console.log('Current state:', this.state);
  }

  onLeave(client: Client, consented: boolean) {
    console.log('Player left MyRoom:', client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
