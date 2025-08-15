import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";

export function registerCycleHandler(room: MyRoom) {
  room.onMessage("cycle", (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.state.gameStatus !== "playing") {
      console.log('Cycle ignored: invalid player state or game not playing');
      return;
    }
    if (player.postPile.length > 0 || player.dutchPile.length > 1) {
      room["deckRefill"].cycleDutchPile(player);
      (room as any)["repositionDutchPile"](player, client.sessionId);
      console.log(`Player ${client.sessionId} cycled Dutch Pile. Post: ${player.postPile.length}, Dutch: ${player.dutchPile.length}`);
    }
  });
}
