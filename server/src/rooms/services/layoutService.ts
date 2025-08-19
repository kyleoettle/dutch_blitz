import { Player, Card, Pile } from "../schema/MyState";
import { PERSONAL_PILE_RADIUS, OUTWARD_OFFSET, VISIBLE_SPACING, RIGHTMOST_OFFSET, WOOD_OFFSET_Y, MAX_VISIBLE_SLOTS } from "../constants";

export class LayoutService {
  constructor(private readonly state: any, private readonly getPlayerAngle: (id: string) => number) {}

  computeVisibleSlotPositions(playerId: string, player: Player): { x: number; y: number }[] {
    const playerIndex = Array.from(this.state.players.keys()).indexOf(playerId);
    const angle = (playerIndex * 2 * Math.PI) / 8;
    const blitzX = Math.cos(angle) * (PERSONAL_PILE_RADIUS + OUTWARD_OFFSET);
    const blitzY = Math.sin(angle) * (PERSONAL_PILE_RADIUS + OUTWARD_OFFSET);
    const rightMostX = blitzX - RIGHTMOST_OFFSET;
    const leftMostX = rightMostX - VISIBLE_SPACING * (MAX_VISIBLE_SLOTS - 1);
    return Array.from({length: MAX_VISIBLE_SLOTS}, (_, i) => ({ x: leftMostX + i * VISIBLE_SPACING, y: blitzY }));
  }

  repositionVisibleSlots(player: Player, playerId: string): void {
    // Use stored slot positions instead of recalculating
    for (let idx = 0; idx < player.postPile.length; idx++) {
      const cardId = player.postPile[idx];
      if (cardId && cardId !== "") {
        const card = this.state.cards.get(cardId);
        if (card && idx < player.postSlotX.length && idx < player.postSlotY.length) {
          card.x = player.postSlotX[idx];
          card.y = player.postSlotY[idx];
        }
      }
    }
  }

  positionPersonalPiles(player: Player, playerId: string, angle: number): void {
    const blitzX = Math.cos(angle) * (PERSONAL_PILE_RADIUS + OUTWARD_OFFSET);
    const blitzY = Math.sin(angle) * (PERSONAL_PILE_RADIUS + OUTWARD_OFFSET);
    
    // Store blitz pile position for proximity detection
    player.blitzPileX = blitzX;
    player.blitzPileY = blitzY;
    
    // Stack Blitz pile cards at identical coordinates (only top should be interactable/visible overlap)
    player.blitzPile.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) { card.x = blitzX; card.y = blitzY; }
    });
    const rightMostX = blitzX - RIGHTMOST_OFFSET;
    const leftMostX = rightMostX - VISIBLE_SPACING * (Math.max(player.postPile.length, MAX_VISIBLE_SLOTS) - 1);
    
    // Store post slot positions for proximity detection
    player.postSlotX = [];
    player.postSlotY = [];
    for (let i = 0; i < MAX_VISIBLE_SLOTS; i++) {
      const slotX = leftMostX + i * VISIBLE_SPACING;
      const slotY = blitzY;
      player.postSlotX.push(slotX);
      player.postSlotY.push(slotY);
    }
    
    player.postPile.forEach((cardId, idx) => {
      const card = this.state.cards.get(cardId);
      if (card && idx < player.postSlotX.length && idx < player.postSlotY.length) {
        card.x = player.postSlotX[idx];
        card.y = player.postSlotY[idx];
      }
    });
    const rowCenterX = (leftMostX + rightMostX) / 2;
    // Hide face-down reserve cards: keep off-board since they're not individually positioned
    player.reserveCards.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) { card.x = 9999; card.y = 9999; }
    });
  }

  updateWoodPileFaceStates(player: Player): void {
    // Set all wood pile cards to face down first
    player.woodPile.forEach(cardId => {
      const card = this.state.cards.get(cardId);
      if (card) card.faceUp = false;
    });
    
    // Set only the top card (last in array) to face up
    if (player.woodPile.length > 0) {
      const topCardId = player.woodPile[player.woodPile.length - 1];
      const topCard = this.state.cards.get(topCardId);
      if (topCard) topCard.faceUp = true;
    }
  }

  updateWoodIndicator(playerId: string, player: Player): void {
    const slots = this.computeVisibleSlotPositions(playerId, player);
    if (!slots || slots.length === 0) return;
    const centerX = (slots[0].x + slots[slots.length - 1].x) / 2;
    const centerY = slots[0].y + WOOD_OFFSET_Y;
    
    // Store wood indicator position for proximity detection
    player.woodIndicatorX = centerX;
    player.woodIndicatorY = centerY;
    
    const indicatorId = `wood_indicator_${playerId}`;
    let indicator = this.state.piles.get(indicatorId) as Pile | undefined;
    if (!indicator) {
      indicator = new Pile();
      indicator.id = indicatorId;
      indicator.type = "wood_indicator";
      indicator.topCard = -1;
      indicator.cardStack = [];
      this.state.piles.set(indicator.id, indicator);
    }
    indicator.x = centerX;
    indicator.y = centerY;
  }
}
