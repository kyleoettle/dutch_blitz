import { Player, Card, Pile } from "../schema/MyState";
import { CANCEL_RADIUS, DUTCH_DROP_RADIUS, POST_PLACE_RADIUS, MAX_VISIBLE_SLOTS } from "../constants";

export class RestoreProximityService {
  constructor(private readonly state: any, private readonly getPlayerAngle: (id: string) => number, private readonly repositionVisible: (player: Player, playerId: string) => void, private readonly positionPersonal: (player: Player, playerId: string, angle: number) => void) {}

  withinCancelRadius(player: Player): boolean {
    const dx = player.x - player.heldOriginX;
    const dy = player.y - player.heldOriginY;
    return (dx*dx + dy*dy) <= CANCEL_RADIUS * CANCEL_RADIUS;
  }

  withinDutchDropRadius(player: Player, pile: Pile): boolean {
    const dx = player.x - pile.x;
    const dy = player.y - pile.y;
    return (dx*dx + dy*dy) <= DUTCH_DROP_RADIUS * DUTCH_DROP_RADIUS;
  }

  withinSlotRadius(player: Player, slotPos: {x:number;y:number}): boolean {
    const dx = player.x - slotPos.x;
    const dy = player.y - slotPos.y;
    return (dx*dx + dy*dy) <= POST_PLACE_RADIUS * POST_PLACE_RADIUS;
  }

  returnCardToPlayer(player: Player, card: Card): void {
    card.pickedUp = false;
    if (player.heldOriginSource === 'postSlot' && player.heldFromVisibleIndex !== -1) {
      const idx = player.heldFromVisibleIndex;
      while (player.dutchPile.length < MAX_VISIBLE_SLOTS) player.dutchPile.push("");
      if (idx >= 0 && idx < MAX_VISIBLE_SLOTS) {
        if (player.dutchPile[idx] === "") {
          player.dutchPile[idx] = card.id;
        } else if (!player.dutchPile.includes(card.id)) {
          player.dutchPile[idx] = card.id;
        }
      } else if (!player.dutchPile.includes(card.id)) {
        const emptyIdx = player.dutchPile.indexOf("");
        if (emptyIdx !== -1) player.dutchPile[emptyIdx] = card.id; else player.dutchPile.push(card.id);
      }
      this.repositionVisible(player, card.owner);
    } else if (player.heldOriginSource === 'blitz') {
  player.blitzPile.push(card.id);
  card.faceUp = true; // keep all blitz faceUp for now (test expectation)
      this.positionPersonal(player, card.owner, this.getPlayerAngle(card.owner));
    } else if (player.heldOriginSource === 'woodIndicator') {
      // Return to top of wood indicator stack
      const indicator = this.state.piles.get(`wood_indicator_${card.owner}`) as Pile | undefined;
      if (indicator) {
        // Previous top (if any) becomes faceDown
        if (indicator.cardStack.length > 0) {
          const prevTopId = indicator.cardStack[indicator.cardStack.length - 1];
          const prevTop = this.state.cards.get(prevTopId);
          if (prevTop) prevTop.faceUp = false;
        }
        indicator.cardStack.push(card.id);
        card.x = indicator.x;
        card.y = indicator.y;
        card.faceUp = true;
      } else {
        // fallback to wood pile bottom
        player.postPile.push(card.id);
        card.faceUp = false;
      }
    } else if (player.heldOriginSource === 'wood') {
      player.postPile.push(card.id);
      card.faceUp = false;
      this.positionPersonal(player, card.owner, this.getPlayerAngle(card.owner));
    } else {
  player.blitzPile.push(card.id);
  card.faceUp = true;
      this.positionPersonal(player, card.owner, this.getPlayerAngle(card.owner));
    }
    player.heldCard = "";
    player.heldFromVisibleIndex = -1;
    player.heldOriginSource = "";
    player.heldOriginX = 0;
    player.heldOriginY = 0;
  }
}
