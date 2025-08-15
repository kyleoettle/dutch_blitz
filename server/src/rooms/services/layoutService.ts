import { Player, Card } from "../schema/MyState";
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
    const positions = this.computeVisibleSlotPositions(playerId, player);
    positions.forEach((pos, idx) => {
      const cardId = player.dutchPile[idx];
      if (cardId && cardId !== "") {
        const card = this.state.cards.get(cardId);
        if (card) { card.x = pos.x; card.y = pos.y; }
      }
    });
  }

  positionPersonalPiles(player: Player, playerId: string, angle: number): void {
    const blitzX = Math.cos(angle) * (PERSONAL_PILE_RADIUS + OUTWARD_OFFSET);
    const blitzY = Math.sin(angle) * (PERSONAL_PILE_RADIUS + OUTWARD_OFFSET);
    player.blitzPile.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) { card.x = blitzX; card.y = blitzY + 0.1 * index; }
    });
    const rightMostX = blitzX - RIGHTMOST_OFFSET;
    const leftMostX = rightMostX - VISIBLE_SPACING * (Math.max(player.dutchPile.length, MAX_VISIBLE_SLOTS) - 1);
    player.dutchPile.forEach((cardId, idx) => {
      const card = this.state.cards.get(cardId);
      if (card) { card.x = leftMostX + idx * VISIBLE_SPACING; card.y = blitzY; }
    });
    const rowCenterX = (leftMostX + rightMostX) / 2;
    player.postPile.forEach((cardId, index) => {
      const card = this.state.cards.get(cardId);
      if (card) { card.x = rowCenterX; card.y = blitzY + WOOD_OFFSET_Y + 0.05 * index; }
    });
  }
}
