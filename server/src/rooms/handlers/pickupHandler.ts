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
    const isVisiblePost = player.dutchPile.includes(card.id);
    const isTopOfWood = player.postPile.length > 0 && player.postPile[player.postPile.length - 1] === card.id;
    if (!isTopOfBlitz && player.blitzPile.includes(card.id)) {
      console.log('Pickup rejected: only top Blitz card may be picked');
      return;
    }
    if (!isTopOfBlitz && !isVisiblePost && !isTopOfWood) {
      console.log('Pickup ignored: card not from a valid personal pile (blitz top, visible post slot, or top wood)');
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
    } else if (isVisiblePost) {
      const idx = player.dutchPile.indexOf(card.id);
      if (idx !== -1) {
        player.dutchPile[idx] = "";
        player.heldFromVisibleIndex = idx;
      }
      room["repositionDutchPile"](player, client.sessionId);
      player.heldOriginSource = 'postSlot';
    } else if (isTopOfWood) {
      player.postPile.pop();
      card.faceUp = true;
      player.heldOriginSource = 'wood';
    }
    console.log(`Player ${client.sessionId} picked up card ${card.id} from ${isTopOfBlitz ? 'Blitz top' : 'visible Dutch row'}`);
  });
}
