import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";

export function registerCycleHandler(room: MyRoom) {
  room.onMessage("cycle", (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.state.gameStatus !== "playing") {
      console.log('Cycle ignored: invalid player state or game not playing');
      return;
    }
    if (player.reserveCards.length > 0 || player.postPile.length > 1) {
      room["deckRefill"].cycleDutchPile(player);
      (room as any)["repositionDutchPile"](player, client.sessionId);
      console.log(`Player ${client.sessionId} cycled Post Pile. Reserve: ${player.reserveCards.length}, Post: ${player.postPile.length}`);
    }
  });
}
