import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { Pile, Card } from "../schema/MyState";
import { DUTCH_DROP_RADIUS, WOOD_DRAW_RADIUS } from "../constants";

export function registerDropHandler(room: MyRoom) {
  room.onMessage("drop", (client: Client, message: { pileId: string }) => {
    console.log('Drop message received:', message);
    const player = room.state.players.get(client.sessionId);
    if (!player || !player.heldCard || room.state.gameStatus !== "playing") {
      console.log('Drop ignored: invalid player state or game not playing');
      return;
    }
    const card = room.state.cards.get(player.heldCard);
    if (!card) {
      console.log('Drop ignored: held card not found');
      return;
    }
    // Wood indicator drop-back support
    if (message.pileId && message.pileId.startsWith('wood_indicator_')) {
      const indicator = room.state.piles.get(message.pileId) as Pile | undefined;
      if (!indicator) { console.log('Drop ignored: wood indicator not found'); return; }
      // Proximity check for consistency with draw radius
      const dxW = player.x - indicator.x; const dyW = player.y - indicator.y;
      const distW = Math.sqrt(dxW*dxW + dyW*dyW);
      if (distW > WOOD_DRAW_RADIUS) { console.log('Drop ignored: too far from wood indicator'); return; }
      // Only allow if held card originated from wood or woodIndicator
      if (player.heldOriginSource !== 'wood' && player.heldOriginSource !== 'woodIndicator') {
        console.log('Drop ignored: held card not from wood source'); return; }
      // Make previous top faceDown
      if (indicator.cardStack.length > 0) {
        const prevTopId = indicator.cardStack[indicator.cardStack.length - 1];
        const prevTop = room.state.cards.get(prevTopId);
        if (prevTop) prevTop.faceUp = false;
      }
      indicator.cardStack.push(card.id);
      card.x = indicator.x; card.y = indicator.y; card.faceUp = true; card.pickedUp = false;
      player.heldCard = '';
      player.heldOriginSource = '';
      console.log(`Player ${client.sessionId} returned card ${card.id} to wood indicator.`);
      return;
    }
    if (!message.pileId || !message.pileId.startsWith('dutch_pile_')) {
      console.log('Drop ignored: no valid dutch_pile_ id specified; still holding card.');
      return;
    }
    const pile = room.state.piles.get(message.pileId);
    if (!pile) {
      console.log('Drop ignored: pile not found');
      return;
    }
    const dxPile = player.x - pile.x;
    const dyPile = player.y - pile.y;
    const distSqPile = dxPile * dxPile + dyPile * dyPile;
    if (distSqPile > DUTCH_DROP_RADIUS * DUTCH_DROP_RADIUS) {
      console.log(`Drop ignored: too far from target pile (${Math.sqrt(distSqPile).toFixed(2)} > ${DUTCH_DROP_RADIUS}). Still holding.`);
      return;
    }
    if (!room["isValidSequenceMove"](card as Card, pile as Pile)) {
      console.log(`Drop rejected (rules): invalid sequence/color. Card ${(card as Card).color} ${(card as Card).value} cannot be placed. Still holding.`);
      return;
    }
    card.pickedUp = false;
    player.heldCard = "";
    if (player.heldFromVisibleIndex !== -1) {
      room["repositionDutchPile"](player, client.sessionId);
      player.heldFromVisibleIndex = -1;
    }
    pile.cardStack.push(card.id);
    const stackPosition = pile.cardStack.length - 1;
    const stackOffset = stackPosition * 0.1;
    card.x = pile.x + stackOffset;
    card.y = pile.y;
    if (pile.cardStack.length === 1) {
      pile.color = card.color;
    }
    player.score += 1;
    console.log(`Player ${client.sessionId} successfully placed card ${card.id} (${card.color} ${card.value}) on ${pile.id}. Score: ${player.score}`);
    if (card.value === 10) {
      room["completePile"](pile);
    }
    if (room["checkWinCondition"](player)) {
      room.state.gameStatus = "finished";
      room.state.winner = client.sessionId;
      room["calculateFinalScores"]();
      console.log(`Player ${client.sessionId} wins!`);
      room.broadcast("gameWon", { winner: client.sessionId });
    }
  });
}
