import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { CANCEL_RADIUS } from "../constants";

export function registerCancelHandler(room: MyRoom) {
  room.onMessage("cancel", (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || !player.heldCard) return;
    const card = room.state.cards.get(player.heldCard);
    if (!card) return;
    const dx = player.x - player.heldOriginX;
    const dy = player.y - player.heldOriginY;
    const distSq = dx*dx + dy*dy;
    if (distSq > CANCEL_RADIUS * CANCEL_RADIUS) {
      console.log(`Cancel ignored: player too far from pickup origin (${Math.sqrt(distSq).toFixed(2)} > ${CANCEL_RADIUS})`);
      return;
    }
    (room as any)["returnCardToPlayer"](player, card);
    console.log(`Player ${client.sessionId} canceled pickup; card ${card.id} restored (origin: ${player.heldOriginSource}).`);
  });
}
