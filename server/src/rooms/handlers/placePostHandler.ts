import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { POST_PLACE_RADIUS } from "../constants";

export function registerPlacePostHandler(room: MyRoom) {
  room.onMessage("placePost", (client: Client, message: { slot?: number }) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || !player.heldCard || room.state.gameStatus !== "playing") return;
    const card = room.state.cards.get(player.heldCard);
    if (!card) return;
    let targetSlot = typeof message?.slot === 'number' ? message.slot : player.dutchPile.indexOf("");
    if (targetSlot < 0 || targetSlot > 2) {
      console.log('placePost ignored: invalid slot index');
      return;
    }
    while (player.dutchPile.length < 3) player.dutchPile.push("");
    if (player.dutchPile[targetSlot] !== "") {
      console.log('placePost ignored: slot not empty');
      return;
    }
    const slotPositions = (room as any)["getVisibleSlotPositions"](client.sessionId, player);
    const slotPos = slotPositions[targetSlot];
    const dxSlot = player.x - slotPos.x;
    const dySlot = player.y - slotPos.y;
    const distSqSlot = dxSlot * dxSlot + dySlot * dySlot;
    if (distSqSlot > POST_PLACE_RADIUS * POST_PLACE_RADIUS) {
      console.log(`placePost ignored: too far from slot ${targetSlot} (${Math.sqrt(distSqSlot).toFixed(2)} > ${POST_PLACE_RADIUS}). Still holding.`);
      return;
    }
    player.dutchPile[targetSlot] = card.id;
    card.pickedUp = false;
    player.heldCard = "";
    player.heldFromVisibleIndex = -1;
    player.heldOriginSource = "";
    (room as any)["repositionDutchPile"](player, client.sessionId);
    console.log(`Player ${client.sessionId} placed card ${card.id} into Post slot ${targetSlot}`);
  });
}
