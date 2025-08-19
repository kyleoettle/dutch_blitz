import { MyRoom } from "../MyRoom";
import { Client } from "colyseus";
import { Card, Pile, Player } from "../schema/MyState";
import { DUTCH_DROP_RADIUS, WOOD_DRAW_RADIUS, POST_PLACE_RADIUS } from "../constants";

/** Centralized placement logic separated by slot type (wood, dutch, post, blitz) with structured results. */

export interface PlacementResult {
  success: boolean;
  type?: 'wood' | 'dutch' | 'post' | 'blitz';
  // For post (visible) slots we synthesize id as post_slot_<playerId>_<slot>
  // For blitz we synthesize id as blitz_pile_<playerId>
  pileId?: string;
  slot?: number;
  scoreDelta?: number;
  win?: boolean;
  reason?: string;
}

function baseFail(reason: string): PlacementResult { return { success: false, reason }; }

export function tryReturnToWood(room: MyRoom, player: Player, card: Card, pileId: string | undefined): PlacementResult | undefined {
  if (!pileId || !pileId.startsWith('wood_indicator_')) return undefined; // not a wood attempt
  const indicator = room.state.piles.get(pileId) as Pile | undefined;
  if (!indicator) return baseFail('indicator_not_found');
  const dxW = player.x - indicator.x; const dyW = player.y - indicator.y;
  const distW = Math.sqrt(dxW*dxW + dyW*dyW);
  if (distW > WOOD_DRAW_RADIUS) return baseFail('too_far_from_indicator');
  if (player.heldOriginSource !== 'wood' && player.heldOriginSource !== 'woodIndicator') return baseFail('invalid_origin_for_return');
  if (indicator.cardStack.length > 0) {
    const prevTopId = indicator.cardStack[indicator.cardStack.length - 1];
    const prevTop = room.state.cards.get(prevTopId);
    if (prevTop) prevTop.faceUp = false;
  }
  indicator.cardStack.push(card.id);
  card.x = indicator.x; card.y = indicator.y; card.faceUp = true; card.pickedUp = false;
  player.heldCard = ''; player.heldOriginSource = '';
  if (!player.woodPile.includes(card.id)) player.woodPile.push(card.id);
  
  // Update wood pile face states to ensure only top card is face up
  // Access room's layout service through the room parameter
  if ((room as any)["layout"]) {
    (room as any)["layout"].updateWoodPileFaceStates(player);
  }
  
  return { success: true, type: 'wood', pileId };
}

export function tryPlaceOnDutch(room: MyRoom, player: Player, card: Card, pileId: string | undefined): PlacementResult | undefined {
  if (!pileId || !pileId.startsWith('dutch_pile_')) return undefined; // not dutch attempt
  const pile = room.state.piles.get(pileId) as Pile | undefined;
  if (!pile) return baseFail('pile_not_found');
  const dxPile = player.x - pile.x; const dyPile = player.y - pile.y;
  const distSqPile = dxPile*dxPile + dyPile*dyPile;
  if (distSqPile > DUTCH_DROP_RADIUS * DUTCH_DROP_RADIUS) return baseFail('too_far_from_pile');
  if (!room["isValidSequenceMove"](card as Card, pile as Pile)) return baseFail('sequence_invalid');
  card.pickedUp = false;
  player.heldCard = "";
  if (player.heldFromVisibleIndex !== -1) {
    room["repositionDutchPile"](player, (player as any).sessionId);
    player.heldFromVisibleIndex = -1;
  }
  // Remove from woodPile if present
  const wIdx = player.woodPile.indexOf(card.id);
  if (wIdx !== -1) player.woodPile.splice(wIdx, 1);
  pile.cardStack.push(card.id);
  const stackPosition = pile.cardStack.length - 1;
  const stackOffset = stackPosition * 0.1;
  card.x = pile.x + stackOffset; card.y = pile.y;
  if (pile.cardStack.length === 1) pile.color = card.color;
  const prevScore = player.score;
  player.score += 1;
  let win = false;
  if (card.value === 10) room["completePile"](pile);
  if (room["checkWinCondition"](player)) {
    room.state.gameStatus = "finished";
    room.state.winner = (player as any).sessionId || "";
    room["calculateFinalScores"]();
    room.broadcast("gameWon", { winner: room.state.winner });
    win = true;
  }
  return { success: true, type: 'dutch', pileId, scoreDelta: player.score - prevScore, win };
}

export function tryPlaceInPostSlot(room: MyRoom, player: Player, card: Card, explicitSlot: number | undefined): PlacementResult {
  while (player.postPile.length < 3) player.postPile.push("");
  let targetSlot: number | undefined = explicitSlot;
  
  if (typeof targetSlot !== 'number') {
    const emptyIndices: number[] = [];
    for (let i = 0; i < 3; i++) if (player.postPile[i] === '') emptyIndices.push(i);
    if (emptyIndices.length === 0) return baseFail('no_empty_slot');
    let bestIdx = emptyIndices[0];
    let bestDist = Infinity;
    emptyIndices.forEach(idx => {
      // Use stored slot positions from player state
      if (idx < player.postSlotX.length && idx < player.postSlotY.length) {
        const dx = player.x - player.postSlotX[idx]; 
        const dy = player.y - player.postSlotY[idx];
        const d = dx*dx + dy*dy;
        if (d < bestDist) { bestDist = d; bestIdx = idx; }
      }
    });
    targetSlot = bestIdx;
  }
  if (targetSlot === undefined || targetSlot < 0 || targetSlot > 2) return baseFail('slot_out_of_range');
  if (player.postPile[targetSlot] !== "") return baseFail('slot_not_empty');
  
  // Use stored slot position for proximity check
  if (targetSlot >= player.postSlotX.length || targetSlot >= player.postSlotY.length) {
    return baseFail('slot_position_not_found');
  }
  const dxSlot = player.x - player.postSlotX[targetSlot]; 
  const dySlot = player.y - player.postSlotY[targetSlot];
  const distSqSlot = dxSlot*dxSlot + dySlot*dySlot;
  if (distSqSlot > POST_PLACE_RADIUS * POST_PLACE_RADIUS) return baseFail('too_far_from_slot');
  
  player.postPile[targetSlot] = card.id;
  card.faceUp = true;
  card.pickedUp = false;
  player.heldCard = "";
  player.heldFromVisibleIndex = -1;
  player.heldOriginSource = "";
  // Remove from woodPile if present
  const wpi = player.woodPile.indexOf(card.id); if (wpi !== -1) player.woodPile.splice(wpi, 1);
  (room as any)["repositionDutchPile"](player, (player as any).sessionId);
  return { success: true, type: 'post', slot: targetSlot, pileId: `post_slot_${(player as any).sessionId}_${targetSlot}` };
}

export function tryReturnToBlitz(room: MyRoom, player: Player, card: Card): PlacementResult | undefined {
  if (player.heldOriginSource !== 'blitz') return undefined;
  
  // Check proximity to blitz pile using stored position
  const dx = player.x - player.blitzPileX;
  const dy = player.y - player.blitzPileY; 
  const distSq = dx*dx + dy*dy;
  // Use POST_PLACE_RADIUS for consistency with other personal pile returns
  if (distSq > POST_PLACE_RADIUS * POST_PLACE_RADIUS) return undefined;
  
  player.blitzPile.push(card.id);
  card.pickedUp = false; card.faceUp = true;
  player.heldCard = ""; player.heldOriginSource = "";
  // Remove from woodPile if present
  const wi = player.woodPile.indexOf(card.id); if (wi !== -1) player.woodPile.splice(wi, 1);
  return { success: true, type: 'blitz', pileId: `blitz_pile_${(player as any).sessionId}` };
}

/** Determine nearest personal target (post slot or blitz pile) purely for informational pileId synthesis. */
// Removed nearest synthesis; client now sends pileId directly and server validates.

export function dispatchPlacement(room: MyRoom, client: Client, opts: { pileId?: string, slot?: number, type?: string }): PlacementResult {
  const player = room.state.players.get(client.sessionId);
  if (!player || !player.heldCard || room.state.gameStatus !== 'playing') return baseFail('invalid_player_state');
  const card = room.state.cards.get(player.heldCard);
  if (!card) return baseFail('card_not_found');
  // Dispatch based on explicit pileId pattern if provided
  if (opts.pileId) {
    if (opts.pileId.startsWith('wood_indicator_')) {
      const wood = tryReturnToWood(room, player, card, opts.pileId); if (wood) return wood; else return baseFail('wood_invalid');
    }
    if (opts.pileId.startsWith('dutch_pile_')) {
      const dutch = tryPlaceOnDutch(room, player, card, opts.pileId); if (dutch) return dutch; else return baseFail('dutch_invalid');
    }
    if (opts.pileId.startsWith('post_slot_')) {
      // Extract slot index
      const parts = opts.pileId.split('_');
      const slotIdx = parseInt(parts[parts.length - 1], 10);
      const post = tryPlaceInPostSlot(room, player, card, isNaN(slotIdx)? undefined : slotIdx); if (post.success) return post; return post;
    }
    if (opts.pileId.startsWith('blitz_pile_')) {
      const blitz = tryReturnToBlitz(room, player, card); if (blitz) return blitz; return baseFail('blitz_return_invalid');
    }
  }
  // Fallback ordering if no pileId (attempt shared then personal heuristics)
  const dutch = tryPlaceOnDutch(room, player, card, opts.pileId); if (dutch) return dutch;
  const post = tryPlaceInPostSlot(room, player, card, opts.slot); if (post.success) return post;
  const blitz = tryReturnToBlitz(room, player, card); if (blitz) return blitz;
  const wood = tryReturnToWood(room, player, card, opts.pileId); if (wood) return wood;
  return post;
}
