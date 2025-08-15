import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import your "app.config.ts" file here.
import appConfig from "../src/app.config";
import { MyState } from "../src/rooms/schema/MyState";

describe("testing your Colyseus app", () => {
  let colyseus: ColyseusTestServer;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    const room = await colyseus.createRoom<MyState>("my_room", {});
    const client1 = await colyseus.connectTo(room);
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);
    await room.waitForNextPatch();
    // Validate minimal expected structure
    const state = client1.state as unknown as MyState;
    assert.ok(state.players.size === 1, "One player should be present");
    const p = state.players.get(client1.sessionId);
    assert.ok(p, "Player state exists");
    assert.strictEqual(p.blitzPile.length, 10, "Blitz pile should have 10 cards");
    assert.strictEqual(p.dutchPile.length, 3, "Visible post (dutch) slots should have 3 cards initially");
    assert.strictEqual(p.postPile.length, 27, "Post pile should have 27 remaining cards after 3 moved visible");
  });
});
