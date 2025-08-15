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
2. **Post Pile:** Face-down stack of remaining 30 cards (draw pile)
3. **Dutch Pile:** Face-up discard area (3 cards visible, top card playable)

#### Shared Central Areas
1. **4 Dutch Piles:** Shared building piles in center of play area
2. **Each pile builds:** 1→2→3→4→5→6→7→8→9→10 (ascending sequence)
3. **Color rule:** Any color can start a pile, but each pile accepts any color

## Core Gameplay Loop

### Setup Phase
1. Each player gets their personal 40-card deck
2. Deal 10 cards face-down as Blitz Pile
3. Remaining 30 cards become Post Pile
4. Turn top 3 cards of Post Pile face-up to form Dutch Pile
5. Players spawn at random positions around the shared Dutch Piles

### Game Phase
Players simultaneously:
1. **Move** around the 3D environment to reach cards and piles
2. **Pick up** cards from their personal piles or Dutch Pile
3. **Place** cards on shared Dutch Piles following sequence rules
4. **Draw** new cards from Post Pile to Dutch Pile when needed

### Win Condition
**First player to empty their Blitz Pile wins the round**

## Card Placement Rules

### Valid Moves on Dutch Piles
1. **Sequence Rule:** Cards must be placed in ascending order (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
2. **Starting Rule:** Any "1" card can start a new Dutch Pile
3. **Color Rule:** Any color can be played on any pile (no color matching required)
4. **Completion Rule:** When a pile reaches "10", it's complete and removed from play

### Card Sources (Priority Order)
1. **Blitz Pile** (top card only - face up)
2. **Dutch Pile** (top card only - face up)
3. **Post Pile** (only by cycling through Dutch Pile)

## Personal Pile Management

### Blitz Pile
- Always shows top card face-up
- Can only play the top card
- **WIN CONDITION:** Empty this pile first

### Dutch Pile
- Shows top 3 cards face-up
- Can only play the top card
- When top card is played, reveal next card from Post Pile
- Acts as a "window" into the Post Pile

### Post Pile
- Face-down draw pile
- Cannot play directly from this pile
- Cards move from here to Dutch Pile automatically

## 3D Movement Rules

### Avatar Actions
- **Movement:** WASD to move around the play area
- **Pickup:** Press E near a playable card to pick it up
- **Drop:** Press Q near a valid Dutch Pile to place card
- **Range:** Must be within 1.5 units of target to interact

### Pickup Rules
- Can only hold one card at a time
- Can only pick up face-up cards from valid sources
- Card follows avatar when held

### Drop Rules
- Must be near a shared Dutch Pile to drop
- Can only drop if move is valid (correct sequence)
- Invalid drops return card to player

## Scoring (Optional)
- **Blitz Pile:** -2 points per card remaining
- **Dutch Piles:** +1 point per card contributed
- **Goal:** Positive score by contributing more than remaining in Blitz

## AI Implementation Notes

### State Tracking
```typescript
// Player state
{
  blitzPile: Card[],     // face-down, top card visible
  postPile: Card[],      // face-down draw pile  
  dutchPile: Card[],     // face-up, top 3 visible
  heldCard: Card | null, // card currently being carried
  position: {x, y}       // 3D position
}

// Game state
{
  dutchPiles: Card[][],  // 4 shared ascending piles
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
2. **Race** to play cards on shared Dutch Piles
3. **Move** avatars to reach cards and piles
4. **Follow** sequence rules (1→2→3→4→5→6→7→8→9→10)
5. **Win** by emptying Blitz Pile first

---

*This document provides the complete rule set for implementing Dutch Blitz game logic in the 3D multiplayer environment.*
