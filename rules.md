# Dutch Blitz Game Rules

## Overview
Dutch Blitz is a fast-paced multiplayer card game where players race to empty their personal card piles by building sequences on shared central piles. This 3D version maintains the core mechanics while adding Fall Guys-style avatar movement.

## Game Components

### Cards
- **Standard Deck:** Each player has their own deck of 40 cards
- **Colors:** 4 colors (Red, Green, Blue, Yellow) 
- **Values:** 1-10 in each color
- **Card Distribution:** 10 cards of each color per player

### Game Areas

#### Personal Areas (Per Player)
1. **Blitz Pile:** Face-down stack of 10 cards (goal: empty this first to win)
2. **Wood Pile:** Face-down stack of remaining 30 cards (draw pile)
3. **Post Pile:** Face-up staging area (up to 3 cards visible, top card playable) – fed from the Wood Pile

#### Shared Central Areas
1. **Shared Dutch piles:** Building piles in center of play area (multiple may exist)
2. **Each Dutch pile builds:** 1→2→3→4→5→6→7→8→9→10 (ascending sequence)
3. **Color rule:** Any color can start a Dutch pile (subsequent color constraints may apply depending on variant)

## Core Gameplay Loop

### Setup Phase
1. Each player gets their personal 40-card deck
2. Deal 10 cards face-down as Blitz Pile
3. Remaining 30 cards become the Wood Pile
4. Turn top 3 cards of the Wood Pile face-up to form the Post Pile (up to 3 visible)
5. Players spawn at random positions around the shared Dutch Piles

### Game Phase
Players simultaneously:
1. **Move** around the 3D environment to reach cards and piles
2. **Pick up** cards from their personal Post Pile (top visible) or Blitz Pile
3. **Place** cards on shared Dutch piles following sequence rules
4. **Draw** new cards from Wood Pile to Post Pile when cycling (refilling)

### Win Condition
**First player to empty their Blitz Pile wins the round**

## Card Placement Rules

### Valid Moves on Shared Dutch Piles
1. **Sequence Rule:** Cards must be placed in ascending order (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
2. **Starting Rule:** Any "1" card can start a new Dutch Pile
3. **Color Rule:** Any color can be played on any pile (no color matching required)
4. **Completion Rule:** When a pile reaches "10", it's complete and removed from play

### Card Sources (Priority Order)
1. **Blitz Pile** (top card only - face up)
2. **Post Pile** (top visible card only - up to 3 visible)
3. **Wood Pile** (indirect: cycle to refresh Post Pile)

## Personal Pile Management

### Blitz Pile
- Always shows top card face-up
- Can only play the top card
- **WIN CONDITION:** Empty this pile first

### Post Pile
- Shows up to 3 cards face-up
- Can only play the top visible card
- When top card is played, reveal next card from Wood Pile (refill to 3 if possible)
- Acts as a "window" into the Wood Pile

### Wood Pile
- Face-down draw pile
- Cannot play directly from this pile
- Cards move from here to Post Pile through cycling

## 3D Movement Rules

### Avatar Actions
- **Movement:** WASD to move around the play area
- **Pickup:** Press E near a playable card to pick it up
- **Drop:** Press Q near a valid Dutch pile to place card
- **Range:** Must be within 1.5 units of target to interact

### Pickup Rules
- Can only hold one card at a time
- Can only pick up face-up cards from valid sources
- Card follows avatar when held

### Drop Rules
- Must be near a shared Dutch pile to drop
- Can only drop if move is valid (correct sequence)
- Invalid drops return card to player

## Scoring (Optional)
- **Blitz Pile:** -2 points per card remaining
- **Dutch piles:** +1 point per card contributed
- **Goal:** Positive score by contributing more than remaining in Blitz

## AI Implementation Notes

### State Tracking
```typescript
// Player state
{
  blitzPile: Card[],     // face-down, top card visible
  woodPile: Card[],      // face-down draw pile  
  postPile: Card[],      // face-up, top 3 visible
  heldCard: Card | null, // card currently being carried
  position: {x, y}       // 3D position
}

// Game state
{
  dutchPiles: Card[][],  // shared ascending piles (center)
  players: Player[],     // all player states
  gameStatus: "playing" | "finished"
}
```

### Validation Logic
```typescript
function isValidMove(card: Card, targetPile: Card[]): boolean {
  if (targetPile.length === 0) {
    return card.value === 1; // Only 1s can start piles
  }
  const topCard = targetPile[targetPile.length - 1];
  return card.value === topCard.value + 1; // Must be next in sequence
}
```

### Win Detection
```typescript
function checkWin(player: Player): boolean {
  return player.blitzPile.length === 0;
}
```

## Game Flow Summary
1. **Deal** cards to personal piles
2. **Race** to play cards on shared Dutch piles
3. **Move** avatars to reach cards and piles
4. **Follow** sequence rules (1→2→3→4→5→6→7→8→9→10)
5. **Win** by emptying Blitz Pile first

---

## Terminology Summary (Updated)
- Blitz Pile: 10-card face-down stack (win condition: empty it)
- Wood Pile: Remaining 30 face-down cards (draw source)
- Post Pile: Up to 3 face-up visible cards drawn from Wood Pile; only top is playable
- Dutch piles: Shared center ascending build piles (1→10)

*This document provides the complete rule set for implementing Dutch Blitz game logic in the 3D multiplayer environment (with updated pile terminology).* 
