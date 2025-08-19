import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";

export function registerRestartHandler(room: MyRoom) {
  room.onMessage("restart", (client: Client) => {
    if (room.state.gameStatus === "finished") {
      room.restartGame();
      console.log('Game restarted by player:', client.sessionId);
    }
  });
  // Testing / development: force a full redeal & state reset regardless of current status
  room.onMessage("forceRestart", (client: Client) => {
    room.restartGame();
    console.log('[DEV] Force restart triggered by player:', client.sessionId);
  });
}
