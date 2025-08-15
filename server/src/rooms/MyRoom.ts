import { Room, Client } from "colyseus";
import { MyState, Player, Card, Pile } from "./schema/MyState";

export class MyRoom extends Room<MyState> {
  maxClients = 8;
  state = new MyState();

  // Proximity thresholds (squared distances for efficiency)
  private readonly DUTCH_DROP_RADIUS = 2.0; // units
  private readonly POST_PLACE_RADIUS = 2.0; // units

  private getVisibleSlotPositions(playerId: string, player: Player): { x: number; y: number }[] {
    // Mirrors logic in repositionDutchPile / positionPersonalPiles without mutating state
    const playerIndex = Array.from(this.state.players.keys()).indexOf(playerId);
    const angle = (playerIndex * 2 * Math.PI) / 8;
    const pileRadius = 20;
    const outwardOffset = 4;
    const blitzX = Math.cos(angle) * (pileRadius + outwardOffset);
    const blitzY = Math.sin(angle) * (pileRadius + outwardOffset);
    const visibleSpacing = 3;
    const rightMostX = blitzX - 2.6;
    const leftMostX = rightMostX - visibleSpacing * 2; // 3 slots always
    const slots: { x: number; y: number }[] = [];
    for (let slot = 0; slot < 3; slot++) {
      slots.push({ x: leftMostX + slot * visibleSpacing, y: blitzY });
    }
    return slots;
  }

  // Dutch Blitz card generation functions
  generatePlayerDeck(playerId: string): Card[] {
    const deck: Card[] = [];
    const colors = ["red", "green", "blue", "yellow"];
    
    colors.forEach(color => {
      for (let value = 1; value <= 10; value++) {
        const card = new Card();
        card.id = `${playerId}_${color}_${value}`;
        card.value = value;
        card.color = color;
        card.owner = playerId;
        card.faceUp = false; // start face-down
        deck.push(card);
      }
    });
    
    return this.shuffleDeck(deck);
  }

  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  distributePlayerCards(player: Player, playerId: string): void {
    const deck = this.generatePlayerDeck(playerId);
    
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
    this.fillDutchPile(player);
  }

  fillDutchPile(player: Player): void {
    // Move up to 3 cards from Post Pile to Dutch Pile
    while (player.dutchPile.length < 3 && player.postPile.length > 0) {
      const cardId = player.postPile.shift()!;
      const card = this.state.cards.get(cardId);
      if (card) {
        card.faceUp = true; // make face-up in Dutch Pile
        player.dutchPile.push(cardId);
      }
    }
    
    // If Post Pile is empty and Dutch Pile still needs cards, cycle completed Dutch cards
    if (player.dutchPile.length < 3 && player.postPile.length === 0) {
      this.cycleDutchPile(player);
    }
  }

  cycleDutchPile(player: Player): void {
    // When Post Pile is empty, take the bottom cards from Dutch Pile,
    // flip them face-down, and add them back to Post Pile
    if (player.dutchPile.length <= 1) return; // Keep at least 1 card visible
    
    // Take bottom cards (all except the top one) and move to Post Pile
    const cardsToRecycle = player.dutchPile.splice(0, player.dutchPile.length - 1);
    cardsToRecycle.reverse(); // reverse order for proper cycling
    
    cardsToRecycle.forEach(cardId => {
      const card = this.state.cards.get(cardId);
      if (card) {
        card.faceUp = false; // flip face-down
        player.postPile.push(cardId);
      }
    });
    
    // Now refill Dutch Pile from the newly populated Post Pile
    this.fillDutchPile(player);
  }

  isValidSequenceMove(card: Card, targetPile: Pile): boolean {
    // Empty pile can only accept value 1
    if (targetPile.cardStack.length === 0) {
      return card.value === 1; // first card establishes color
    }
    
    // Get top card of pile
    const topCardId = targetPile.cardStack[targetPile.cardStack.length - 1];
    const topCard = this.state.cards.get(topCardId);
    if (!topCard) return false;
    
    // Color must match pile color (pile.color set when first card placed)
    if (targetPile.color && card.color !== targetPile.color) return false;
    // Must be next in sequence (n+1)
    return card.value === topCard.value + 1;
  }

  checkWinCondition(player: Player): boolean {
    return player.blitzPile.length === 0;
  }

  returnCardToPlayer(player: Player, card: Card): void {
    // Unified restore logic based on original source
    card.pickedUp = false;

    if (player.heldOriginSource === 'postSlot' && player.heldFromVisibleIndex !== -1) {
      // Restore into original visible slot (ensure slot array length)
      const idx = player.heldFromVisibleIndex;
      while (player.dutchPile.length < 3) player.dutchPile.push("");
      if (idx >= 0 && idx < 3) {
        if (player.dutchPile[idx] === "") {
          player.dutchPile[idx] = card.id;
        } else if (!player.dutchPile.includes(card.id)) {
          player.dutchPile[idx] = card.id; // force overwrite to avoid duplication
        }
      } else if (!player.dutchPile.includes(card.id)) {
        // Fallback: put into first empty or push
        const emptyIdx = player.dutchPile.indexOf("");
        if (emptyIdx !== -1) player.dutchPile[emptyIdx] = card.id; else player.dutchPile.push(card.id);
      }
      this.repositionDutchPile(player, card.owner);
    } else if (player.heldOriginSource === 'blitz') {
      // Return to top of blitz pile (face-up)
      player.blitzPile.push(card.id);
      card.faceUp = true;
      this.positionPersonalPiles(player, card.owner, this.getPlayerAngle(card.owner));
    } else if (player.heldOriginSource === 'wood') {
      // Return to top of wood (postPile). Wood pile cards are face-down.
      player.postPile.push(card.id);
      card.faceUp = false;
      this.positionPersonalPiles(player, card.owner, this.getPlayerAngle(card.owner));
    } else {
      // Unknown origin fallback: treat like blitz to avoid losing card
      player.blitzPile.push(card.id);
      card.faceUp = true;
      this.positionPersonalPiles(player, card.owner, this.getPlayerAngle(card.owner));
    }

    // Clear held state
    player.heldCard = "";
    player.heldFromVisibleIndex = -1;
    player.heldOriginSource = "";
    player.heldOriginX = 0;
    player.heldOriginY = 0;
  }

  // Fill placeholder slots ("" entries) in visible dutch row after a successful placement
  fillDutchPlaceholders(player: Player): void {
    // AUTO-FILL DISABLED per new rules: visible Post (dutchPile) slots are only filled
    // when player stands on Wood pile indicator and presses R (drawWood action),
    // or manually moves a Blitz card into an empty slot. Keeping function for backward
    // compatibility but it now does nothing.
  }

  drawFromWood(player: Player): void {
    // Fill empty (placeholder "") slots from wood (postPile) up to 3 visible
    for (let i = 0; i < 3; i++) {
      if (player.dutchPile[i] === "" && player.postPile.length > 0) {
        const cardId = player.postPile.shift()!;
        const card = this.state.cards.get(cardId);
        if (card) { card.faceUp = true; player.dutchPile[i] = cardId; }
      }
    }
  }

  repositionDutchPile(player: Player, playerId: string): void {
    // Reposition visible Dutch pile: maintain 3 fixed slot positions (indices 0..2) so remaining cards don't shift when one is picked up
    const playerCount = Array.from(this.state.players.keys()).indexOf(playerId);
    const angle = (playerCount * 2 * Math.PI) / 8;
  const pileRadius = 20; // further increased for more clearance from central Dutch piles
    // Blitz anchor (same as in positionPersonalPiles)
  // Anchor further outward: base radial + extra outward push for separation
  const outwardOffset = 4; // additional radial distance beyond pileRadius
  const blitzX = Math.cos(angle) * (pileRadius + outwardOffset);
  const blitzY = Math.sin(angle) * (pileRadius + outwardOffset);
    const visibleSpacing = 3;
    const rightMostX = blitzX - 2.6; // fixed anchor near blitz
    const leftMostX = rightMostX - visibleSpacing * 2; // always 3 slots
    for (let slot = 0; slot < 3; slot++) {
      const cardId = player.dutchPile[slot];
      if (cardId && cardId !== "") {
        const card = this.state.cards.get(cardId);
        if (card) {
          card.x = leftMostX + slot * visibleSpacing;
          card.y = blitzY;
        }
      }
    }
  }

  completePile(pile: Pile): void {
    console.log(`Pile ${pile.id} completed with value 10! Removing from play.`);
    
    // Remove all cards from the completed pile
    pile.cardStack.forEach(cardId => {
      this.state.cards.delete(cardId);
    });
    
    // Reset pile
    pile.cardStack = [];
    pile.topCard = -1;
  pile.color = ""; // allow new sequence
  }

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
      this.positionPersonalPiles(player, playerId, this.getPlayerAngle(playerId));
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

  calculateFinalScores(): void {
    this.state.players.forEach((player, playerId) => {
      // Final score = cards placed on Dutch Piles (+1 each) - remaining Blitz cards (-2 each)
      const blitzPenalty = player.blitzPile.length * 2;
      const finalScore = player.score - blitzPenalty;
      player.score = finalScore;
      console.log(`Player ${playerId} final score: ${finalScore} (${player.score + blitzPenalty} placed - ${blitzPenalty} penalty)`);
    });
  }

  onCreate(options: any) {
    console.log('MyRoom created!');
    this.state.gameStatus = "waiting";

    // Initialize shared Dutch Piles (building piles)
    // Previously: x positions were -6, -2, 2, 6 (spacing=4). This felt cramped visually
    // with wider card models (2.4 width). We widen spacing for clearer separation.
    const sharedDutchPileCount = 4;
  const dutchPileSpacing = 5; // was 6 (wide). Closer spacing for more player area -> centers: -7.5, -2.5, 2.5, 7.5
    // Center the row around 0 so layout remains balanced if count changes.
    const dutchStartX = -((sharedDutchPileCount - 1) / 2) * dutchPileSpacing; // e.g. -9
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
      if (distSqPile > this.DUTCH_DROP_RADIUS * this.DUTCH_DROP_RADIUS) {
        console.log(`Drop ignored: too far from target pile (${Math.sqrt(distSqPile).toFixed(2)} > ${this.DUTCH_DROP_RADIUS}). Still holding.`);
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
        this.cycleDutchPile(player);
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
      if (distSqSlot > this.POST_PLACE_RADIUS * this.POST_PLACE_RADIUS) {
        console.log(`placePost ignored: too far from slot ${targetSlot} (${Math.sqrt(distSqSlot).toFixed(2)} > ${this.POST_PLACE_RADIUS}). Still holding.`);
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
    this.positionPersonalPiles(player, client.sessionId, angle);
    
    console.log(`Player ${client.sessionId} cards distributed. Blitz: ${player.blitzPile.length}, Post: ${player.postPile.length}, Dutch: ${player.dutchPile.length}`);
    
    // Start game if we have enough players (2+)
    if (this.state.players.size >= 2 && this.state.gameStatus === "waiting") {
      this.state.gameStatus = "playing";
      console.log("Game started! Players:", this.state.players.size);
    }
  }

  positionPersonalPiles(player: Player, playerId: string, playerAngle: number): void {
  const pileRadius = 20; // match updated radius
  const outwardOffset = 4; // keep consistent with repositionDutchPile
  const blitzX = Math.cos(playerAngle) * (pileRadius + outwardOffset);
  const blitzY = Math.sin(playerAngle) * (pileRadius + outwardOffset);
    const visibleSpacing = 3; // spacing between the 3 visible ("post") cards

    // Layout overview (top-down):
    // [Post Card 1] [Post Card 2] [Post Card 3] [gap] [Blitz Stack]
    //                   [Wood / Draw Stack] (below centered under the 3 cards)

    // Blitz pile (stacked vertically in y axis)
    player.blitzPile.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) {
        card.x = blitzX;
        card.y = blitzY + 0.1 * index; // stack height
      }
    });

    // Right-most visible card positioned left of Blitz with small gap
    const rightMostX = blitzX - 2.6; // card width (2.4) + 0.2 gap
    // Determine starting (left-most) x
    const leftMostX = rightMostX - visibleSpacing * (Math.max(player.dutchPile.length, 3) - 1);
    // Position visible row left-to-right
    player.dutchPile.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) {
        card.x = leftMostX + index * visibleSpacing;
        card.y = blitzY;
      }
    });

    // Wood / draw pile (postPile) centered under visible row
    const rowCenterX = (leftMostX + rightMostX) / 2;
  const woodOffsetY = 4; // moved further below for clearer separation from visible row
    player.postPile.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) {
        card.x = rowCenterX;
        card.y = blitzY + woodOffsetY + 0.05 * index; // stack slightly upward for visibility
      }
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log('Player left MyRoom:', client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
