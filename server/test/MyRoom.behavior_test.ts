/// <reference types="mocha" />
import assert from 'assert';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import appConfig from '../src/app.config';
import { MyState, Player, Card } from '../src/rooms/schema/MyState';
// Mocha globals are available via @types/mocha (devDependency). This file uses them directly.

const waitNext = (room: any) => room.waitForNextPatch();

async function joinTwoPlayers(colyseus: ColyseusTestServer) {
  const room = await colyseus.createRoom<MyState>('my_room', {});
  const client1 = await colyseus.connectTo(room);
  const client2 = await colyseus.connectTo(room);
  await waitNext(room);
  return { room, client1, client2 };
}

function getPlayer(room: any, sessionId: string): Player { return room.state.players.get(sessionId); }
function getCard(room: any, id: string): Card { return room.state.cards.get(id); }

function findBlitzTop(player: Player): string | undefined { return player.blitzPile[player.blitzPile.length - 1]; }
function firstVisibleSlotCard(player: Player): string | undefined { return player.postPile.find(id => id && id !== ''); }
function firstEmptySlot(player: Player): number { return player.postPile.indexOf(''); }
function getSlotPositions(playerIndex: number) {
  const angle = (playerIndex * 2 * Math.PI) / 8;
  const pileRadius = 20; // must match server constants
  const outwardOffset = 4;
  const blitzX = Math.cos(angle) * (pileRadius + outwardOffset);
  const blitzY = Math.sin(angle) * (pileRadius + outwardOffset);
  const visibleSpacing = 3;
  const rightMostX = blitzX - 2.6;
  const leftMostX = rightMostX - visibleSpacing * 2;
  return [0,1,2].map(slot => ({ x: leftMostX + slot * visibleSpacing, y: blitzY }));
}

describe('MyRoom core behaviors', () => {
  let colyseus: ColyseusTestServer;
  before(async () => { colyseus = await boot(appConfig); });
  after(async () => { await colyseus.shutdown(); });
  beforeEach(async () => { await colyseus.cleanup(); });

  it('initial distribution: piles sizes and face-up states', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    assert.strictEqual(p1.blitzPile.length, 10);
  // 40-card deck: 10 blitz + 3 visible + 27 remaining wood/reserve
  assert.strictEqual(p1.reserveCards.length, 27);
    assert.strictEqual(p1.postPile.length, 3);
    p1.blitzPile.forEach(id => { const c = getCard(room, id); assert.ok(c.faceUp); });
    p1.postPile.forEach(id => { const c = getCard(room, id); assert.ok(c.faceUp); });
    p1.reserveCards.forEach(id => { const c = getCard(room, id); assert.strictEqual(c.faceUp, false); });
  });

  it('pickup restrictions: only top blitz allowed, visible slot, or top wood', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const nonTopBlitz = p1.blitzPile[0];
    const topBlitz = findBlitzTop(p1)!;
    client1.send('pickup', { cardId: nonTopBlitz });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, '');
    client1.send('pickup', { cardId: topBlitz });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, topBlitz);
  });

  it('place: move blitz card into empty slot (proximity needed)', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
  const topBlitz = findBlitzTop(p1)!;
  // Free up a visible slot by removing first visible card (simulate card played)
  const slotIdxToFree = 0;
  const removed = p1.postPile[slotIdxToFree];
  p1.postPile[slotIdxToFree] = '';
  if (removed) room.state.cards.delete(removed);
  client1.send('pickup', { cardId: topBlitz });
  await waitNext(room);
  const emptySlot = firstEmptySlot(p1);
  const playerIndex = Array.from(room.state.players.keys()).indexOf(client1.sessionId);
  const slotPositions = getSlotPositions(playerIndex);
  p1.x = slotPositions[emptySlot].x; p1.y = slotPositions[emptySlot].y; // move into proximity
    client1.send('place', { slot: emptySlot });
  await waitNext(room);
  assert.strictEqual(p1.heldCard, '', 'Card should be released after successful placement');
  assert.strictEqual(p1.postPile[emptySlot], topBlitz, 'Blitz card should occupy the empty slot');
  });

  it('drop onto dutch pile: sequence + color enforcement', async () => {
    const { room, client1, client2 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const p2 = getPlayer(room, client2.sessionId);
  const oneCandidate = p1.postPile.map(id => getCard(room, id)).find(c => c && c.value === 1);
  if (!oneCandidate) { return; } // skip if random distribution lacks a 1 in visible row
  const oneCardId = oneCandidate.id;
    client1.send('pickup', { cardId: oneCardId });
    await waitNext(room);
    const pile0 = room.state.piles.get('dutch_pile_0')!;
    p1.x = pile0.x; p1.y = pile0.y;
      client1.send('place', { pileId: 'dutch_pile_0' });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, '');
    assert.ok(pile0.cardStack.includes(oneCardId));
    const pileColor = pile0.color; assert.ok(pileColor);
    const p2Card = p2.postPile.map(id => getCard(room, id)).find(c => c.value === 2 && c.color !== pileColor);
    if (p2Card) {
      client2.send('pickup', { cardId: p2Card.id });
      await waitNext(room);
      p2.x = pile0.x; p2.y = pile0.y;
        client2.send('place', { pileId: 'dutch_pile_0' });
      await waitNext(room);
      assert.strictEqual(p2.heldCard, p2Card.id);
    }
  });

  it('proximity gating prevents distant drop', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
  const oneCard = p1.postPile.map(id => getCard(room, id)).find(c => c && c.value === 1);
  if (!oneCard) { return; }
    client1.send('pickup', { cardId: oneCard.id });
    await waitNext(room);
    const pile0 = room.state.piles.get('dutch_pile_0')!;
    p1.x = pile0.x + 10; p1.y = pile0.y + 10;
  client1.send('place', { pileId: 'dutch_pile_0' });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, oneCard.id);
  });

  it('place fails when far from slot', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    // Free a slot
    const removed = p1.postPile[1];
    p1.postPile[1] = '';
    if (removed) room.state.cards.delete(removed);
    const topBlitz = findBlitzTop(p1)!;
    client1.send('pickup', { cardId: topBlitz });
    await waitNext(room);
    // Move player far away
    p1.x += 50; p1.y += 50;
    client1.send('place', { slot: 1 });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, topBlitz, 'Should still be holding (too far)');
    assert.strictEqual(p1.postPile[1], '', 'Slot should remain empty');
  });

  it('cancel only works near origin', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const topBlitz = findBlitzTop(p1)!;
    client1.send('pickup', { cardId: topBlitz });
    await waitNext(room);
    p1.x += 10; p1.y += 10;
    client1.send('cancel', {});
    await waitNext(room);
    assert.strictEqual(p1.heldCard, topBlitz);
    p1.x = p1.heldOriginX; p1.y = p1.heldOriginY;
    client1.send('cancel', {});
    await waitNext(room);
    assert.strictEqual(p1.heldCard, '');
  });

  it('drawWood cycles wood indicator cards when near', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const preReserve = p1.reserveCards.length;
    const preWoodCount = p1.woodPile.length;
    
    // Move player close to wood indicator
    p1.x = 5; p1.y = 5;
    const indicatorId = `wood_indicator_${client1.sessionId}`;
    const indicator = room.state.piles.get(indicatorId);
    if (indicator) { indicator.x = 5; indicator.y = 5; }
    
    client1.send('drawWood', {});
    await waitNext(room);
    
    const postReserve = p1.reserveCards.length;
    const postWoodCount = p1.woodPile.length;
    
    assert.ok(postReserve < preReserve, 'Reserve pile should shrink');
    assert.ok(postWoodCount > preWoodCount, 'Wood pile should grow');
    
    // Check that only top wood card is face up
    if (p1.woodPile.length > 0) {
      const topId = p1.woodPile[p1.woodPile.length - 1];
      const topCard = getCard(room, topId);
      assert.ok(topCard.faceUp, 'Top wood card should be face up');
      
      // Check that other wood cards are face down
      for (let i = 0; i < p1.woodPile.length - 1; i++) {
        const cardId = p1.woodPile[i];
        const card = getCard(room, cardId);
        assert.ok(!card.faceUp, 'Non-top wood cards should be face down');
      }
    }
  });

  it('wood pickup and cancel near origin returns card face-down onto wood', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const topReserveId = p1.reserveCards[p1.reserveCards.length - 1];
    const preReserveCount = p1.reserveCards.length;
    client1.send('pickup', { cardId: topReserveId });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, topReserveId);
    // Stay near origin
    client1.send('cancel', {});
    await waitNext(room);
    assert.strictEqual(p1.heldCard, '', 'Should release after cancel near origin');
    assert.strictEqual(p1.reserveCards.length, preReserveCount, 'Reserve count should restore');
    const returnedCard = getCard(room, topReserveId);
    assert.strictEqual(returnedCard.faceUp, false, 'Returned reserve card should be face-down');
  });

  it('invalid sequence drop keeps card held and score unchanged', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    // Pick a non-1 visible card
    const nonOne = p1.postPile.map(id => getCard(room, id)).find(c => c.value !== 1)!;
    client1.send('pickup', { cardId: nonOne.id });
    await waitNext(room);
    const pile0 = room.state.piles.get('dutch_pile_0')!;
    p1.x = pile0.x; p1.y = pile0.y; // proximity ok
    const prevScore = p1.score;
  client1.send('place', { pileId: 'dutch_pile_0' });
    await waitNext(room);
    assert.strictEqual(p1.heldCard, nonOne.id, 'Still holding after invalid drop');
    assert.strictEqual(p1.score, prevScore, 'Score must not change');
  });

  it('win condition triggers final scoring and game finish', async () => {
    const { room, client1, client2 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const p2 = getPlayer(room, client2.sessionId);
    // Find any value-1 card among p1 cards and make it the only blitz card
    const valueOneCard = Array.from(room.state.cards.values()).filter((c: Card) => c.owner === client1.sessionId).find((c: Card) => c.value === 1)!;
    // Remove it from any piles
    p1.blitzPile = p1.blitzPile.filter(id => id === valueOneCard.id);
    if (!p1.blitzPile.includes(valueOneCard.id)) p1.blitzPile = [valueOneCard.id];
    p1.postPile = p1.postPile.filter(id => id !== valueOneCard.id);
    p1.postPile = p1.postPile.map(id => id === valueOneCard.id ? '' : id);
    valueOneCard.faceUp = true;
    // Move near empty shared pile 1
    const targetPile = room.state.piles.get('dutch_pile_1')!;
    client1.send('pickup', { cardId: valueOneCard.id });
    await waitNext(room);
    p1.x = targetPile.x; p1.y = targetPile.y;
  client1.send('place', { pileId: 'dutch_pile_1' });
    await waitNext(room);
    assert.strictEqual(room.state.gameStatus, 'finished', 'Game should finish');
    assert.strictEqual(room.state.winner, client1.sessionId, 'Winner should be player 1');
    assert.strictEqual(p1.blitzPile.length, 0, 'Blitz pile empty after win');
    assert.ok(p1.score >= 1, 'Winner should have positive score');
    assert.ok(p2.score <= 0, 'Other player should have zero or negative score after penalty');
  });

  it('score increments and pile completion clears at value 10', async () => {
    const { room, client1 } = await joinTwoPlayers(colyseus);
    const p1 = getPlayer(room, client1.sessionId);
    const pile0 = room.state.piles.get('dutch_pile_0')!;
    // Build a near-complete pile programmatically (bypassing move validation by direct state manipulation)
    const colorGroups: Record<string, Card[]> = {};
    Array.from(room.state.cards.values()).filter((c: Card)=>c.owner===client1.sessionId).forEach(c=>{
      (colorGroups[c.color] = colorGroups[c.color] || []).push(c);
    });
    const targetColor = Object.keys(colorGroups).find(k => colorGroups[k].length === 10) || Object.keys(colorGroups)[0];
    const ordered = colorGroups[targetColor].slice().sort((a,b)=>a.value-b.value);
    // Place first 9 directly
    pile0.cardStack = [];
    pile0.color = "";
    for (let i=0;i<9;i++) {
      const card = ordered[i];
      pile0.cardStack.push(card.id);
      if (i === 0) pile0.color = targetColor; // set color only once
    }
    const topTen = ordered[9];
    // Ensure the value 10 card is pickable: put it on top of blitz pile as last element
    // Remove from any pile arrays
    p1.blitzPile = p1.blitzPile.filter(id=>id!==topTen.id);
    p1.postPile = p1.postPile.filter(id=>id!==topTen.id);
    const visibleIdx = p1.postPile.indexOf(topTen.id);
    if (visibleIdx !== -1) p1.postPile[visibleIdx] = "";
    p1.blitzPile.push(topTen.id); // becomes top
    topTen.faceUp = true;
    client1.send('pickup', { cardId: topTen.id });
    await waitNext(room);
    p1.x = pile0.x; p1.y = pile0.y; // ensure proximity
    const prevScore = p1.score;
  client1.send('place', { pileId: 'dutch_pile_0' });
    await waitNext(room);
    assert.strictEqual(pile0.cardStack.length, 0, 'Pile should reset after completing 10');
    assert.strictEqual(p1.score, prevScore + 1, 'Score increments by 1 for the placed 10');
  });
});
