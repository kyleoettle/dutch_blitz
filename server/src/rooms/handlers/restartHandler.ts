import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";

export function registerRestartHandler(room: MyRoom) {
  room.onMessage("restart", (client: Client) => {
    if (room.state.gameStatus === "finished") {
      room.restartGame();
      console.log('Game restarted by player:', client.sessionId);
    }
  });
}
