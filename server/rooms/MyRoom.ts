import { Room, Client } from "colyseus";
import { MyState, Player } from "./MyState";

export class MyRoom extends Room<MyState> {
  maxClients = 8;
  state = new MyState();

  onCreate(options: any) {
    // Initialize piles/cards here if needed
  }

  onJoin(client: Client, options: any) {
    this.state.players.set(client.sessionId, new Player());
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  onMessage(client: Client, message: any) {
    // Handle movement, card pickup/drop, etc.
  }
}
