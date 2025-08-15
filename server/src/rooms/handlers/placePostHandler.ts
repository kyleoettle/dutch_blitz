import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { POST_PLACE_RADIUS } from "../constants";

export function registerPlacePostHandler(room: MyRoom) {
  room.onMessage("placePost", (client: Client, message: { slot?: number }) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || !player.heldCard || room.state.gameStatus !== "playing") return;
    const card = room.state.cards.get(player.heldCard);
    if (!card) return;
    // Determine target slot: explicit index, else choose nearest empty slot to player position
    let targetSlot: number;
    if (typeof message?.slot === 'number') {
      targetSlot = message.slot;
    } else {
      const slotPositionsAll = (room as any)["getVisibleSlotPositions"](client.sessionId, player);
      const emptyIndices: number[] = [];
      for (let i = 0; i < 3; i++) if (player.dutchPile[i] === '') emptyIndices.push(i);
      if (emptyIndices.length === 0) {
        console.log('placePost ignored: no empty slots');
        return;
      }
      // Pick nearest by Euclidean distance to player
      let bestIdx = emptyIndices[0];
      let bestDist = Infinity;
      emptyIndices.forEach(idx => {
        const pos = slotPositionsAll[idx];
        const dx = player.x - pos.x; const dy = player.y - pos.y;
        const d = dx*dx + dy*dy;
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      });
      targetSlot = bestIdx;
    }
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
  card.faceUp = true; // any card entering visible slot becomes face-up
    card.pickedUp = false;
    player.heldCard = "";
    player.heldFromVisibleIndex = -1;
    player.heldOriginSource = "";
    (room as any)["repositionDutchPile"](player, client.sessionId);
    console.log(`Player ${client.sessionId} placed card ${card.id} into Post slot ${targetSlot}`);
  });
}
