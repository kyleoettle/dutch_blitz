import { Room, Client } from "colyseus";
import { MyState, Player, Card, Pile } from "./schema/MyState";
import { MAX_PLAYERS, SHARED_DUTCH_PILE_COUNT, DUTCH_PILE_SPACING, DUTCH_DROP_RADIUS, POST_PLACE_RADIUS } from "./constants";
import { DeckRefillService } from "./services/deckRefillService";
import { LayoutService } from "./services/layoutService";
import { RuleService } from "./services/ruleService";
import { ScoringService } from "./services/scoringService";
import { RestoreProximityService } from "./services/restoreProximityService";
import { registerPickupHandler } from "./handlers/pickupHandler";
import { registerDropHandler } from "./handlers/dropHandler";
import { registerCancelHandler } from "./handlers/cancelHandler";
import { registerPlacePostHandler } from "./handlers/placePostHandler";
import { registerDrawWoodHandler } from "./handlers/drawWoodHandler";
import { registerCycleHandler } from "./handlers/cycleHandler";
import { registerRestartHandler } from "./handlers/restartHandler";

export class MyRoom extends Room<MyState> {
  maxClients = MAX_PLAYERS;
  state = new MyState();

  // Services
  private deckRefill!: DeckRefillService;
  private layout!: LayoutService;
  private rules!: RuleService;
  private scoring!: ScoringService;
  private restoreProx!: RestoreProximityService;

  // Public accessor used by external handlers to compute visible slot positions
  public getVisibleSlotPositions(playerId: string, player: Player) {
    return this.layout.computeVisibleSlotPositions(playerId, player);
  }

  distributePlayerCards(player: Player, playerId: string): void {
    const deck = this.deckRefill.generatePlayerDeck(playerId);

    // Blitz Pile: 10 cards (face-down except top)
    for (let i = 0; i < 10; i++) {
      const card = deck[i];
      card.faceUp = true; // all blitz cards start face-up now
      this.state.cards.set(card.id, card);
      player.blitzPile.push(card.id);
    }

    // Post Pile: 30 cards (face-down)
    for (let i = 10; i < 40; i++) {
      const card = deck[i];
      card.faceUp = false;
      this.state.cards.set(card.id, card);
      player.postPile.push(card.id);
    }

    // Dutch Pile: top 3 cards from Post Pile (face-up)
    this.deckRefill.fillDutchPile(player);
  }

  // Removed fillDutchPile / cycleDutchPile (moved to deckRefill service)

  // Delegations
  private isValidSequenceMove(card: Card, targetPile: Pile) { return this.rules.isValidSequenceMove(card, targetPile); }
  private checkWinCondition(player: Player) { return this.rules.checkWinCondition(player); }

  // Return delegated
  private returnCardToPlayer(player: Player, card: Card) { this.restoreProx.returnCardToPlayer(player, card); }

  private drawFromWood(player: Player) { this.deckRefill.drawFromWood(player); }

  private repositionDutchPile(player: Player, playerId: string) { this.layout.repositionVisibleSlots(player, playerId); }

  private completePile(pile: Pile) { this.scoring.completePile(pile); }

  restartGame(): void {
    console.log('Restarting game...');

    // Clear all existing cards
    this.state.cards.clear();

    // Reset game state
    this.state.gameStatus = "playing";
    this.state.winner = "";

    // Reset and redistribute cards for all players
    this.state.players.forEach((player, playerId) => {
      // Clear personal piles
      player.blitzPile = [];
      player.postPile = [];
      player.dutchPile = [];
      player.heldCard = "";
      player.score = 0;

      // Redistribute new cards
      this.distributePlayerCards(player, playerId);
      this.layout.positionPersonalPiles(player, playerId, this.getPlayerAngle(playerId));
    });

    // Reset Dutch Piles
    this.state.piles.forEach((pile, pileId) => {
      if (pile.type === "dutch") {
        pile.cardStack = [];
        pile.topCard = -1;
      }
    });

    console.log('Game restarted successfully');
  }

  getPlayerAngle(playerId: string): number {
    const playerIds = Array.from(this.state.players.keys());
    const playerIndex = playerIds.indexOf(playerId);
    return (playerIndex * 2 * Math.PI) / 8;
  }

  private calculateFinalScores() { this.scoring.calculateFinalScores(); }

  onCreate(options: any) {
    console.log('MyRoom created!');
    this.state.gameStatus = "waiting";

    // Initialize shared Dutch Piles (building piles)
    // Previously: x positions were -6, -2, 2, 6 (spacing=4). This felt cramped visually
    // with wider card models (2.4 width). We widen spacing for clearer separation.
    // Instantiate services now that state exists
    this.deckRefill = new DeckRefillService(this.state);
    this.rules = new RuleService(this.state);
    this.layout = new LayoutService(this.state, (id) => this.getPlayerAngle(id));
    this.scoring = new ScoringService(this.state);
    this.restoreProx = new RestoreProximityService(this.state, (id) => this.getPlayerAngle(id), (p, id) => this.layout.repositionVisibleSlots(p, id), (p, id, angle) => this.layout.positionPersonalPiles(p, id, angle));

    const sharedDutchPileCount = SHARED_DUTCH_PILE_COUNT;
    const dutchPileSpacing = DUTCH_PILE_SPACING;
    const dutchStartX = -((sharedDutchPileCount - 1) / 2) * dutchPileSpacing;
    for (let i = 0; i < sharedDutchPileCount; i++) {
      const pile = new Pile();
      pile.id = `dutch_pile_${i}`;
      pile.x = dutchStartX + i * dutchPileSpacing;
      pile.y = 0;
      pile.type = "dutch";
      pile.topCard = -1;
      pile.cardStack = [];
      this.state.piles.set(pile.id, pile);
    }

    console.log('Dutch Piles initialized, waiting for players...');

    // Basic movement handler (kept inline for simplicity)
    this.onMessage("move", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) { player.x = message.x; player.y = message.y; }
    });

    // Register extracted handlers
    registerPickupHandler(this);
    registerDropHandler(this);
    registerCancelHandler(this);
    registerCycleHandler(this);
    registerDrawWoodHandler(this);
    registerPlacePostHandler(this);
    registerRestartHandler(this);
  }

  onJoin(client: Client, options: any) {
    console.log('Player joined MyRoom:', client.sessionId);

    const player = new Player();

    // Position players around the shared Dutch Piles
    const playerCount = this.state.players.size;
    const angle = (playerCount * 2 * Math.PI) / 8; // distribute up to 8 players in circle
    const radius = 15; // Increased radius to fit on larger board
    player.x = Math.cos(angle) * radius;
    player.y = Math.sin(angle) * radius;

    this.state.players.set(client.sessionId, player);

    // Distribute cards to the new player
    this.distributePlayerCards(player, client.sessionId);

    // Position player's personal piles
    this.layout.positionPersonalPiles(player, client.sessionId, angle);

    console.log(`Player ${client.sessionId} cards distributed. Blitz: ${player.blitzPile.length}, Post: ${player.postPile.length}, Dutch: ${player.dutchPile.length}`);

    // Start game if we have enough players (2+)
    if (this.state.players.size >= 2 && this.state.gameStatus === "waiting") {
      this.state.gameStatus = "playing";
      console.log("Game started! Players:", this.state.players.size);
    }
  }

  positionPersonalPiles(player: Player, playerId: string, playerAngle: number): void {
    this.layout.positionPersonalPiles(player, playerId, playerAngle);
  }

  onLeave(client: Client, consented: boolean) {
    console.log('Player left MyRoom:', client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
