import { Room, Client } from "colyseus";
import { MyState, Player, Card, Pile } from "./schema/MyState";
import { MAX_PLAYERS, SHARED_DUTCH_PILE_COUNT, DUTCH_PILE_SPACING, DUTCH_DROP_RADIUS, POST_PLACE_RADIUS } from "./constants";
import { DeckRefillService } from "./services/deckRefillService";
import { LayoutService } from "./services/layoutService";
import { RuleService } from "./services/ruleService";
import { ScoringService } from "./services/scoringService";
import { RestoreProximityService } from "./services/restoreProximityService";

export class MyRoom extends Room<MyState> {
  maxClients = MAX_PLAYERS;
  state = new MyState();

  // Services
  private deckRefill!: DeckRefillService;
  private layout!: LayoutService;
  private rules!: RuleService;
  private scoring!: ScoringService;
  private restoreProx!: RestoreProximityService;

  // Delegated helper for visible slot positions via layout service
  private getVisibleSlotPositions(playerId: string, player: Player) {
    return this.layout.computeVisibleSlotPositions(playerId, player);
  }

  // Dutch Blitz card generation functions
  // Legacy deck generation now delegated (kept for backward compatibility if needed)
  private generatePlayerDeck(playerId: string) { return this.deckRefill.generatePlayerDeck(playerId); }

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

  // Fill placeholder slots ("" entries) in visible dutch row after a successful placement
  fillDutchPlaceholders(player: Player): void {
    // AUTO-FILL DISABLED per new rules: visible Post (dutchPile) slots are only filled
    // when player stands on Wood pile indicator and presses R (drawWood action),
    // or manually moves a Blitz card into an empty slot. Keeping function for backward
    // compatibility but it now does nothing.
  }

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
  this.restoreProx = new RestoreProximityService(this.state, (id)=>this.getPlayerAngle(id), (p, id)=>this.layout.repositionVisibleSlots(p, id), (p, id, angle)=>this.layout.positionPersonalPiles(p, id, angle));

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

    this.onMessage("move", (client, message) => {
      // Handle player movement
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = message.x;
        player.y = message.y;
      }
    });
    this.onMessage("pickup", (client, message) => {
      // Handle card pickup with Dutch Blitz rules
      const player = this.state.players.get(client.sessionId);
      if (!player || player.heldCard || this.state.gameStatus !== "playing") {
        console.log('Pickup ignored: invalid player state or game not playing');
        return;
      }
      
      const card = this.state.cards.get(message.cardId);
      if (!card || card.pickedUp || card.owner !== client.sessionId) {
        console.log('Pickup ignored: invalid card or not owned by player');
        return;
      }
      
      // Prevent conflicts: check if another player is already holding this card
      let cardAlreadyHeld = false;
      this.state.players.forEach((otherPlayer, otherId) => {
        if (otherId !== client.sessionId && otherPlayer.heldCard === card.id) {
          cardAlreadyHeld = true;
        }
      });
      
      if (cardAlreadyHeld) {
        console.log('Pickup ignored: card is being held by another player');
        return;
      }
      
  // Valid sources: top of Blitz, ANY visible Post slot card (dutchPile array), or top Wood (postPile) card
  const isTopOfBlitz = player.blitzPile.length > 0 && player.blitzPile[player.blitzPile.length - 1] === card.id;
  const isVisiblePost = player.dutchPile.includes(card.id);
  const isTopOfWood = player.postPile.length > 0 && player.postPile[player.postPile.length - 1] === card.id; // top wood is last (stacked)
      // If card is in blitz pile but not top, reject explicitly (defensive against client hover picking deeper cards)
      if (!isTopOfBlitz && player.blitzPile.includes(card.id)) {
        console.log('Pickup rejected: only top Blitz card may be picked');
        return;
      }
      if (!isTopOfBlitz && !isVisiblePost && !isTopOfWood) {
        console.log('Pickup ignored: card not from a valid personal pile (blitz top, visible post slot, or top wood)');
        return;
      }
      
      // Valid pickup
      card.pickedUp = true;
      player.heldCard = card.id;
      card.x = player.x;
      card.y = player.y;
  // Record origin location for proximity-based return
  player.heldOriginX = player.x;
  player.heldOriginY = player.y;
      
      // Remove from source pile
      if (isTopOfBlitz) {
        player.blitzPile.pop();
        // Reveal next Blitz card if any
        if (player.blitzPile.length > 0) {
          const nextCardId = player.blitzPile[player.blitzPile.length - 1];
          const nextCard = this.state.cards.get(nextCardId);
          if (nextCard) nextCard.faceUp = true;
        }
        player.heldOriginSource = 'blitz';
      } else if (isVisiblePost) {
        // Remove specific card from visible row but keep slot placeholder
        const idx = player.dutchPile.indexOf(card.id);
        if (idx !== -1) {
          player.dutchPile[idx] = ""; // placeholder
          player.heldFromVisibleIndex = idx;
        }
        this.repositionDutchPile(player, client.sessionId);
        player.heldOriginSource = 'postSlot';
      } else if (isTopOfWood) {
        // Remove from wood (postPile) top
        player.postPile.pop();
        card.faceUp = true;
        player.heldOriginSource = 'wood';
      }
      
      console.log(`Player ${client.sessionId} picked up card ${card.id} from ${isTopOfBlitz ? 'Blitz top' : 'visible Dutch row'}`);
    });
    this.onMessage("drop", (client, message) => {
      console.log('Drop message received:', message);
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.heldCard || this.state.gameStatus !== "playing") {
        console.log('Drop ignored: invalid player state or game not playing');
        return;
      }
      
      const card = this.state.cards.get(player.heldCard);
      if (!card) {
        console.log('Drop ignored: held card not found');
        return;
      }
      
      // If targeting a Dutch pile (shared) follow sequence rules; else ignore (keep holding)
      if (!message.pileId || !message.pileId.startsWith('dutch_pile_')) {
        console.log('Drop ignored: no valid dutch_pile_ id specified; still holding card.');
        return; // do NOT return card; player keeps holding
      }
      
      const pile = this.state.piles.get(message.pileId);
      if (!pile) {
        console.log('Drop ignored: pile not found');
        return;
      }

      // Proximity gating: require player near target pile center
      const dxPile = player.x - pile.x;
      const dyPile = player.y - pile.y;
      const distSqPile = dxPile * dxPile + dyPile * dyPile;
      if (distSqPile > DUTCH_DROP_RADIUS * DUTCH_DROP_RADIUS) {
        console.log(`Drop ignored: too far from target pile (${Math.sqrt(distSqPile).toFixed(2)} > ${DUTCH_DROP_RADIUS}). Still holding.`);
        return;
      }
      
      // Validate sequence + color move
      if (!this.isValidSequenceMove(card, pile)) {
        console.log(`Drop rejected (rules): invalid sequence/color. Card ${card.color} ${card.value} cannot be placed. Still holding.`);
        return; // keep holding for another attempt
      }
      
      // Valid drop
      card.pickedUp = false;
      player.heldCard = "";
      // If card came from visible row, leave its slot empty (manual refills now)
      if (player.heldFromVisibleIndex !== -1) {
        this.repositionDutchPile(player, client.sessionId);
        player.heldFromVisibleIndex = -1;
      }
      
      // Add to pile
      pile.cardStack.push(card.id);
      const stackPosition = pile.cardStack.length - 1;
      const stackOffset = stackPosition * 0.1;
      card.x = pile.x + stackOffset;
      card.y = pile.y;
      
      // Assign pile color if first card
      if (pile.cardStack.length === 1) {
        pile.color = card.color;
      }
      // Update player score (+1 for each card placed on Dutch Pile)
      player.score += 1;
      
      console.log(`Player ${client.sessionId} successfully placed card ${card.id} (${card.color} ${card.value}) on ${pile.id}. Score: ${player.score}`);
      
      // Check for pile completion (value 10)
      if (card.value === 10) {
        this.completePile(pile);
      }
      
      // Check win condition
      if (this.checkWinCondition(player)) {
        this.state.gameStatus = "finished";
        this.state.winner = client.sessionId;
        
        // Calculate final scores for all players
        this.calculateFinalScores();
        
        console.log(`Player ${client.sessionId} wins!`);
        this.broadcast("gameWon", { winner: client.sessionId });
      }
    });

    this.onMessage("cancel", (client, message) => {
      // Cancel holding a card: restore to original source (visible slot or blitz top)
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.heldCard) return;
      const card = this.state.cards.get(player.heldCard);
      if (!card) return;
      // Proximity requirement: must be near original pickup location to return card
      const dx = player.x - player.heldOriginX;
      const dy = player.y - player.heldOriginY;
      const distSq = dx*dx + dy*dy;
      const maxReturnDistSq = 1.5 * 1.5; // radius 1.5 units
      if (distSq > maxReturnDistSq) {
        console.log(`Cancel ignored: player too far from pickup origin (${Math.sqrt(distSq).toFixed(2)} > 1.5)`);
        return; // keep holding card
      }
  this.returnCardToPlayer(player, card);
  console.log(`Player ${client.sessionId} canceled pickup; card ${card.id} restored (origin: ${player.heldOriginSource}).`);
    });

    this.onMessage("cycle", (client, message) => {
      // Handle manual Dutch Pile cycling (click on Post Pile)
      const player = this.state.players.get(client.sessionId);
      if (!player || this.state.gameStatus !== "playing") {
        console.log('Cycle ignored: invalid player state or game not playing');
        return;
      }
      
      // Only allow cycling if Post Pile has cards or Dutch Pile has more than 1 card
      if (player.postPile.length > 0 || player.dutchPile.length > 1) {
  this.deckRefill.cycleDutchPile(player);
        this.repositionDutchPile(player, client.sessionId);
        console.log(`Player ${client.sessionId} cycled Dutch Pile. Post: ${player.postPile.length}, Dutch: ${player.dutchPile.length}`);
      }
    });

    // New: draw from wood pile into empty visible Post slots (R near wood pile indicator)
    this.onMessage("drawWood", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || this.state.gameStatus !== "playing") return;
      // Require at least one empty slot and at least one wood card
      if (!player.dutchPile.includes("") || player.postPile.length === 0) {
        console.log(`drawWood ignored: no empty slot or no wood cards. Slots: ${player.dutchPile}, wood: ${player.postPile.length}`);
        return;
      }
      this.drawFromWood(player);
      this.repositionDutchPile(player, client.sessionId);
      console.log(`Player ${client.sessionId} drew from wood. Wood remaining: ${player.postPile.length}`);
    });

    // New: place held Blitz card into first empty visible Post slot
    this.onMessage("placePost", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.heldCard || this.state.gameStatus !== "playing") return;
      const card = this.state.cards.get(player.heldCard);
      if (!card) return;
      // Determine target slot (optional index supplied)
      let targetSlot = typeof message?.slot === 'number' ? message.slot : player.dutchPile.indexOf("");
      if (targetSlot < 0 || targetSlot > 2) {
        console.log('placePost ignored: invalid slot index');
        return;
      }
      // Ensure slot exists
      while (player.dutchPile.length < 3) player.dutchPile.push("");
      if (player.dutchPile[targetSlot] !== "") {
        console.log('placePost ignored: slot not empty');
        return;
      }
      // Proximity gating: verify player is near the target slot position
      const slotPositions = this.getVisibleSlotPositions(client.sessionId, player);
      const slotPos = slotPositions[targetSlot];
      const dxSlot = player.x - slotPos.x;
      const dySlot = player.y - slotPos.y;
      const distSqSlot = dxSlot * dxSlot + dySlot * dySlot;
      if (distSqSlot > POST_PLACE_RADIUS * POST_PLACE_RADIUS) {
        console.log(`placePost ignored: too far from slot ${targetSlot} (${Math.sqrt(distSqSlot).toFixed(2)} > ${POST_PLACE_RADIUS}). Still holding.`);
        return; // keep holding
      }
      // Place card regardless of origin (blitz, postSlot relocation, or wood)
      player.dutchPile[targetSlot] = card.id;
      card.pickedUp = false;
      player.heldCard = "";
      player.heldFromVisibleIndex = -1;
      player.heldOriginSource = "";
      this.repositionDutchPile(player, client.sessionId);
      console.log(`Player ${client.sessionId} placed card ${card.id} into Post slot ${targetSlot}`);
    });

    this.onMessage("restart", (client, message) => {
      // Handle game restart (only if game is finished)
      if (this.state.gameStatus === "finished") {
        this.restartGame();
        console.log('Game restarted by player:', client.sessionId);
      }
    });
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
