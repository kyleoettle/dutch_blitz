import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { WOOD_DRAW_RADIUS, MAX_VISIBLE_SLOTS } from "../constants";

export function registerDrawWoodHandler(room: MyRoom) {
  room.onMessage("drawWood", (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.state.gameStatus !== "playing") return;
    if (player.postPile.length === 0) return; // nothing to draw

    // Find this player's wood indicator pile
    const indicatorId = `wood_indicator_${client.sessionId}`;
    const indicator = room.state.piles.get(indicatorId);
    if (!indicator) return;
    // First: fill empty visible (dutch) slots from wood WITHOUT proximity requirement (tests expect this behavior)
    let hasEmpty = false;
    for (let i = 0; i < MAX_VISIBLE_SLOTS; i++) if (player.dutchPile[i] === '') { hasEmpty = true; break; }
    if (hasEmpty) {
      let filledVisible = 0;
      for (let i = 0; i < MAX_VISIBLE_SLOTS; i++) {
        if (player.dutchPile[i] === '' && player.postPile.length > 0) {
          const cardId = player.postPile.shift()!;
          const card = room.state.cards.get(cardId);
          if (card) {
            card.faceUp = true;
            player.dutchPile[i] = cardId;
            filledVisible++;
          }
        }
      }
      if (filledVisible > 0) {
        (room as any)["repositionDutchPile"](player, client.sessionId);
        console.log(`Player ${client.sessionId} drew ${filledVisible} card(s) into visible slots. Wood remaining: ${player.postPile.length}`);
        return;
      }
    }

    // No empty visible slots: require proximity to cycle indicator trio
    const dx = player.x - indicator.x;
    const dy = player.y - indicator.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > WOOD_DRAW_RADIUS) {
      console.log(`Player ${client.sessionId} too far from wood indicator (${dist.toFixed(2)} > ${WOOD_DRAW_RADIUS}).`);
      return;
    }
    // If no visible slots were filled, use indicator trio cycling logic
    const prevStack = [...indicator.cardStack];
    indicator.cardStack = [];
    prevStack.forEach(id => {
      const c = room.state.cards.get(id);
      if (c) c.faceUp = false;
      player.postPile.push(id);
    });
    let drawn = 0;
    while (drawn < 3 && player.postPile.length > 0) {
      const cardId = player.postPile.shift()!;
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
    console.log(`Player ${client.sessionId} cycled wood indicator for ${drawn} card(s). Wood remaining: ${player.postPile.length}`);
  });
}
