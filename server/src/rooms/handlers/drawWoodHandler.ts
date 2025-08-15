import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";

export function registerDrawWoodHandler(room: MyRoom) {
  room.onMessage("drawWood", (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player || room.state.gameStatus !== "playing") return;
    if (!player.dutchPile.includes("") || player.postPile.length === 0) {
      console.log(`drawWood ignored: no empty slot or no wood cards. Slots: ${player.dutchPile}, wood: ${player.postPile.length}`);
      return;
    }
    (room as any)["drawFromWood"](player);
    (room as any)["repositionDutchPile"](player, client.sessionId);
    console.log(`Player ${client.sessionId} drew from wood. Wood remaining: ${player.postPile.length}`);
  });
}
