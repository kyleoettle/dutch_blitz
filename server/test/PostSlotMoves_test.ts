/// <reference types="mocha" />
import assert from 'assert';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import appConfig from '../src/app.config';
import { MyState, Player, Card } from '../src/rooms/schema/MyState';

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

function firstEmptySlot(p: Player) { return p.postPile.indexOf(''); }

// Helper: free a slot at index by removing the card entirely (simulate that card being played elsewhere)
function freeSlot(room: any, p: Player, idx: number) {
  const id = p.postPile[idx];
  if (id) { room.state.cards.delete(id); p.postPile[idx] = ''; }
}

describe('Post slot move scenarios', () => {
  let colyseus: ColyseusTestServer;
  before(async () => { colyseus = await boot(appConfig); });
  after(async () => { await colyseus.shutdown(); });
  beforeEach(async () => { await colyseus.cleanup(); });

  it('move visible slot card into another empty visible slot', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    // Ensure one slot emptied (slot 1) and another occupied (slot 0)
    freeSlot(room, p1, 1);
    await waitNext(room);
    const sourceIdx = 0;
    const cardId = p1.postPile[sourceIdx];
    assert.ok(cardId, 'Need a source card');
    // Pick up from slot 0
    c1.send('pickup', { cardId });
    await waitNext(room);
    // Move player near emptied slot 1
    const slotPositions = (room as any).getVisibleSlotPositions(c1.sessionId, p1);
    p1.x = slotPositions[1].x; p1.y = slotPositions[1].y;
  c1.send('place', { slot: 1 });
    await waitNext(room);
    assert.strictEqual(p1.postPile[1], cardId, 'Card should occupy new empty slot');
    assert.strictEqual(p1.heldCard, '', 'Should release card after placement');
  });

  it('move top blitz card into empty visible slot', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    // Empty slot 2
    freeSlot(room, p1, 2); await waitNext(room);
    const topBlitz = p1.blitzPile[p1.blitzPile.length - 1];
    c1.send('pickup', { cardId: topBlitz });
    await waitNext(room);
    const slotPositions = (room as any).getVisibleSlotPositions(c1.sessionId, p1);
    p1.x = slotPositions[2].x; p1.y = slotPositions[2].y;
  c1.send('place', { slot: 2 });
    await waitNext(room);
    assert.strictEqual(p1.postPile[2], topBlitz, 'Top blitz card should move into empty slot');
    assert.strictEqual(p1.blitzPile.includes(topBlitz), false, 'Card removed from blitz pile');
  });

  it('move top wood card into empty visible slot', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    // Empty slot 0
    freeSlot(room, p1, 0); await waitNext(room);
    // Pick top reserve card (reserveCards last element)
    const topReserve = p1.reserveCards[p1.reserveCards.length - 1];
    c1.send('pickup', { cardId: topReserve });
    await waitNext(room);
    const slotPositions = (room as any).getVisibleSlotPositions(c1.sessionId, p1);
    p1.x = slotPositions[0].x; p1.y = slotPositions[0].y;
  c1.send('place', { slot: 0 });
    await waitNext(room);
    assert.strictEqual(p1.postPile[0], topReserve, 'Top reserve card should move into empty slot');
    assert.ok(!p1.reserveCards.includes(topReserve), 'Card removed from reserve pile');
    const placedCard = getCard(room, topReserve);
    assert.ok(placedCard.faceUp, 'Card should be faceUp after entering visible slot');
  });

  it('auto-selects nearest empty visible slot when slot omitted', async () => {
    const { room, c1 } = await joinTwo(colyseus);
    const p1 = getPlayer(room, c1.sessionId);
    // Free slots 0 and 2, leave slot 1 occupied; pick card from slot 1
    freeSlot(room, p1, 0); freeSlot(room, p1, 2); await waitNext(room);
    const sourceCard = p1.postPile[1];
    assert.ok(sourceCard, 'Need a source card in slot 1');
    c1.send('pickup', { cardId: sourceCard });
    await waitNext(room);
    // Move near slot 2 (ensure it's nearer than slot 0)
    const slotPositions = (room as any).getVisibleSlotPositions(c1.sessionId, p1);
    const pos2 = slotPositions[2];
    p1.x = pos2.x; p1.y = pos2.y;
  // Send place WITHOUT specifying slot -> should choose nearest empty (slot 2)
  c1.send('place', {} as any);
    await waitNext(room);
    assert.strictEqual(p1.postPile[2], sourceCard, 'Card should land in nearest empty slot (2)');
    assert.strictEqual(p1.heldCard, '', 'Card released');
  });
});
