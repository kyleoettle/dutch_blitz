import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { WOOD_DRAW_RADIUS } from "../constants";

export function registerDrawWoodHandler(room: MyRoom) {
  room.onMessage("drawWood", (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.state.gameStatus !== "playing") return;
    if (player.reserveCards.length === 0) return; // nothing to draw

    // Find this player's wood indicator pile
    const indicatorId = `wood_indicator_${client.sessionId}`;
    const indicator = room.state.piles.get(indicatorId);
    if (!indicator) return;

    // Require proximity to cycle indicator trio
    const dx = player.x - indicator.x;
    const dy = player.y - indicator.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > WOOD_DRAW_RADIUS) {
      console.log(`Player ${client.sessionId} too far from wood indicator (${dist.toFixed(2)} > ${WOOD_DRAW_RADIUS}).`);
      return;
    }
    
    // Cycle indicator trio - return previous cards to reserve and draw 3 new ones
    const prevStack = [...indicator.cardStack];
    indicator.cardStack = [];
    player.woodPile = []; // will rebuild
    prevStack.forEach(id => {
      const c = room.state.cards.get(id);
      if (c) c.faceUp = false;
      player.reserveCards.push(id);
    });
    let drawn = 0;
    while (drawn < 3 && player.reserveCards.length > 0) {
      const cardId = player.reserveCards.shift()!;
      const card = room.state.cards.get(cardId);
      if (card) {
        card.faceUp = false; // set later; only final pushed becomes faceUp
        card.x = indicator.x;
        card.y = indicator.y;
        indicator.cardStack.push(cardId);
        drawn++;
      }
    }
    // Set only top card faceUp (if any)
  if (indicator.cardStack.length > 0) {
      const topId = indicator.cardStack[indicator.cardStack.length - 1];
      const topCard = room.state.cards.get(topId);
      if (topCard) topCard.faceUp = true;
    }
  // Update player's woodPile to current indicator stack order (copy)
  player.woodPile = [...indicator.cardStack];
  
  // Update wood pile face states to ensure only top card is face up
  (room as any)["layout"].updateWoodPileFaceStates(player);
  
  console.log(`Player ${client.sessionId} cycled wood indicator for ${drawn} card(s). Reserve remaining: ${player.reserveCards.length}`);
  });
}
