import { Client } from "colyseus";
import { Player, Card } from "../schema/MyState";
import { MyRoom } from "../MyRoom";

export function registerPickupHandler(room: MyRoom) {
  room.onMessage("pickup", (client, message: { cardId: string }) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || player.heldCard || room.state.gameStatus !== "playing") {
      console.log('Pickup ignored: invalid player state or game not playing');
      return;
    }
    const card = room.state.cards.get(message.cardId);
    if (!card || card.pickedUp || card.owner !== client.sessionId) {
      console.log('Pickup ignored: invalid card or not owned by player');
      return;
    }
    let cardAlreadyHeld = false;
    room.state.players.forEach((otherPlayer, otherId) => {
      if (otherId !== client.sessionId && otherPlayer.heldCard === card.id) {
        cardAlreadyHeld = true;
      }
    });
    if (cardAlreadyHeld) {
      console.log('Pickup ignored: card is being held by another player');
      return;
    }
    const isTopOfBlitz = player.blitzPile.length > 0 && player.blitzPile[player.blitzPile.length - 1] === card.id;
    const indicator = room.state.piles.get(`wood_indicator_${client.sessionId}`);
    const indicatorTopId = indicator && indicator.cardStack.length > 0 ? indicator.cardStack[indicator.cardStack.length - 1] : undefined;
  const isWoodIndicatorTop = indicatorTopId === card.id && card.faceUp;
  const visibleIndex = player.dutchPile.indexOf(card.id);
  const isTopOfWood = player.postPile.length > 0 && player.postPile[player.postPile.length - 1] === card.id;
    const isVisibleSlotCard = visibleIndex !== -1;

    // Enforce source validity
    if (player.blitzPile.includes(card.id) && !isTopOfBlitz) {
      console.log('Pickup rejected: only top Blitz card may be picked');
      return;
    }
    if (!isTopOfBlitz && !isWoodIndicatorTop && !isVisibleSlotCard && !isTopOfWood) {
      console.log('Pickup ignored: card not a valid source (need top Blitz, visible slot, top Wood Indicator, or top Wood)');
      return;
    }
    card.pickedUp = true;
    player.heldCard = card.id;
    card.x = player.x;
    card.y = player.y;
    player.heldOriginX = player.x;
    player.heldOriginY = player.y;
    if (isTopOfBlitz) {
      player.blitzPile.pop();
      if (player.blitzPile.length > 0) {
        const nextCardId = player.blitzPile[player.blitzPile.length - 1];
        const nextCard = room.state.cards.get(nextCardId);
        if (nextCard) nextCard.faceUp = true;
      }
      player.heldOriginSource = 'blitz';
    } else if (isWoodIndicatorTop) {
      if (indicator) indicator.cardStack.pop();
      player.heldOriginSource = 'woodIndicator';
    } else if (isTopOfWood) {
      player.postPile.pop();
      // stays faceDown while held unless you want visual feedback; we'll keep faceDown
      player.heldOriginSource = 'wood';
    } else if (isVisibleSlotCard) {
      player.heldOriginSource = 'postSlot';
      player.heldFromVisibleIndex = visibleIndex;
      // Remove card placeholder; refill later after place/cancel
      player.dutchPile[visibleIndex] = '';
    }
    console.log(`Player ${client.sessionId} picked up card ${card.id} from ${isTopOfBlitz ? 'Blitz' : isWoodIndicatorTop ? 'WoodIndicator' : isTopOfWood ? 'Wood' : 'VisibleSlot'}${isVisibleSlotCard ? ' idx '+visibleIndex: ''}`);
  });
}
