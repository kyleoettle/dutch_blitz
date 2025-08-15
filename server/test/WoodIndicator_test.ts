/// <reference types="mocha" />
import assert from 'assert';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import appConfig from '../src/app.config';
import { MyState, Player, Card, Pile } from '../src/rooms/schema/MyState';

const waitNext = (room: any) => room.waitForNextPatch();
async function joinTwo(colyseus: ColyseusTestServer) {
  const room = await colyseus.createRoom<MyState>('my_room', {});
  const c1 = await colyseus.connectTo(room);
  const c2 = await colyseus.connectTo(room);
  await waitNext(room);
  return { room, c1, c2 };
}
function getPlayer(room: any, id: string): Player { return room.state.players.get(id); }
function getCard(room: any, id: string): Card { return room.state.cards.get(id); }
function getIndicator(room: any, id: string): Pile { return room.state.piles.get('wood_indicator_' + id); }

describe('Wood Indicator behaviors', () => {
  let colyseus: ColyseusTestServer;
  before(async () => { colyseus = await boot(appConfig); });
  after(async () => { await colyseus.shutdown(); });
  beforeEach(async () => { await colyseus.cleanup(); });

  it('cycles wood indicator: only top card faceUp', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    const indicator = getIndicator(room, c1.sessionId);
    // Move player onto indicator position
    p1.x = indicator.x; p1.y = indicator.y;
    c1.send('drawWood', {});
    await waitNext(room);
    assert.ok(indicator.cardStack.length > 0, 'Indicator should have cards after draw');
    const topId = indicator.cardStack[indicator.cardStack.length - 1];
    indicator.cardStack.forEach((id, idx) => {
      const c = getCard(room, id);
      if (!c) return;
      if (id === topId) assert.ok(c.faceUp, 'Top card must be faceUp'); else assert.strictEqual(c.faceUp, false, 'Non-top indicator cards faceDown');
    });
  });

  it('pickup restriction: only top indicator card may be picked', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    const indicator = getIndicator(room, c1.sessionId);
    p1.x = indicator.x; p1.y = indicator.y;
    c1.send('drawWood', {}); await waitNext(room);
    assert.ok(indicator.cardStack.length > 1, 'Need at least 2 cards to test restriction');
    const bottomId = indicator.cardStack[0];
    c1.send('pickup', { cardId: bottomId });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, '', 'Should not pick non-top indicator card');
    const topId = indicator.cardStack[indicator.cardStack.length - 1];
    c1.send('pickup', { cardId: topId });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, topId, 'Should pick top indicator card');
  });

  it('drop-back to wood indicator returns card as new top', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    const indicator = getIndicator(room, c1.sessionId);
    p1.x = indicator.x; p1.y = indicator.y;
    c1.send('drawWood', {}); await waitNext(room);
    const prevTop = indicator.cardStack[indicator.cardStack.length - 1];
    c1.send('pickup', { cardId: prevTop }); await waitNext(room);
    assert.strictEqual(p1.heldCard, prevTop, 'Picked top indicator card');
    // Drop back to indicator
    c1.send('drop', { pileId: 'wood_indicator_' + c1.sessionId });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, '', 'Card released after drop-back');
    const newTop = indicator.cardStack[indicator.cardStack.length - 1];
    const newTopCard = getCard(room, newTop);
    assert.ok(newTopCard.faceUp, 'Returned card should be faceUp as new top');
    // Previous underlying card (if any) should be faceDown
    indicator.cardStack.slice(0, -1).forEach(id => {
      const c = getCard(room, id); if (c) assert.strictEqual(c.faceUp, false, 'Underlying card faceDown');
    });
  });

  it('wood top card can be moved onto indicator then behaves as top-only', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    const indicator = getIndicator(room, c1.sessionId);
    // Ensure indicator empty first: no draw yet
    assert.strictEqual(indicator.cardStack.length, 0, 'Indicator starts empty');
    // Pick top wood card
    const topWood = p1.postPile[p1.postPile.length - 1];
    c1.send('pickup', { cardId: topWood }); await waitNext(room);
    p1.x = indicator.x; p1.y = indicator.y;
    c1.send('drop', { pileId: 'wood_indicator_' + c1.sessionId }); await waitNext(room);
    assert.strictEqual(indicator.cardStack[indicator.cardStack.length - 1], topWood, 'Wood card placed on indicator');
    const placed = getCard(room, topWood); assert.ok(placed.faceUp, 'Placed wood card becomes faceUp');
    // Attempt to pick it (should work)
    c1.send('pickup', { cardId: topWood }); await waitNext(room);
    assert.strictEqual(p1.heldCard, topWood, 'Should pick newly placed wood card');
  });
});
