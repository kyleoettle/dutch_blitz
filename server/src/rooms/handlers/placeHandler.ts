import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { dispatchPlacement } from "../services/placementService";

// Unified placement handler (experimental). Accepts pileId or slot.
export function registerPlaceHandler(room: MyRoom) {
  room.onMessage("place", (client: Client, message: { pileId?: string; slot?: number }) => {
    const result = dispatchPlacement(room, client, { pileId: message?.pileId, slot: message?.slot });
    client.send("placeResult", result);
  });
}
