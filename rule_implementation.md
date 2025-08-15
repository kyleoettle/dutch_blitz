# Dutch Blitz Rule Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for Dutch Blitz game rules in our 3D multiplayer environment. Each task is designed to be small, testable, and trackable.

## Phase 1: Card Distribution & Personal Pile Setup

### 1.1 Card Deck Generation
- [x] Create function to generate 40-card deck per player (10 of each color, values 1-10)
- [x] Add deck shuffling functionality
- [x] Test: Verify each player gets exactly 40 unique cards

### 1.2 Personal Pile Distribution
- [x] Implement Blitz Pile creation (10 cards, face-down)
- [x] Implement Post Pile creation (30 cards, face-down)
- [x] Implement Dutch Pile initialization (top 3 cards from Post Pile, face-up)
- [x] Test: Verify correct card distribution across all piles

### 1.3 Visual Representation
- [x] Update card schema to include `faceUp` boolean property
- [x] Render face-down cards differently from face-up cards
- [x] Display Blitz Pile with only top card visible
- [x] Display Dutch Pile with top 3 cards visible and arranged
- [x] Test: Visual verification of pile states

## Phase 2: Card Placement Validation

### 2.1 Sequence Validation
- [x] Implement `isValidSequenceMove()` function
- [x] Rule: Only value "1" can start a new Dutch Pile
- [x] Rule: Cards must be placed in ascending order (n+1)
- [x] Test: Valid moves (1 on empty, 5 on 4, etc.)
- [x] Test: Invalid moves (2 on empty, 7 on 5, etc.)

### 2.2 Dutch Pile Management
- [x] Implement Dutch Pile completion detection (when reaches value 10)
- [x] Automatically remove completed piles from play
- [x] Create new empty Dutch Pile when one is removed
- [x] Test: Pile completion and removal workflow

### 2.3 Pickup Source Validation
- [x] Validate pickup from Blitz Pile (top card only)
- [x] Validate pickup from Dutch Pile (top card only)
- [x] Prevent pickup from Post Pile (face-down cards)
- [x] Test: Pickup restrictions for each pile type

## Phase 3: Personal Pile Mechanics

### 3.1 Blitz Pile Management
- [x] Implement top card face-up reveal
- [x] Update Blitz Pile when top card is picked up
- [x] Handle empty Blitz Pile state
- [x] Test: Blitz Pile card progression

### 3.2 Dutch Pile Cycling
- [x] Implement Dutch Pile refill from Post Pile
- [x] Maintain 3 visible cards when possible
- [x] Handle Post Pile depletion (cycling behavior)
- [x] Test: Dutch Pile cycling through all Post Pile cards

### 3.3 Post Pile Management
- [x] Track Post Pile depletion
- [x] Implement Post Pile recycling when empty
- [x] Handle edge case: all cards in play or Dutch Pile
- [x] Test: Post Pile cycling and edge cases

## Phase 4: Game State Management

### 4.1 Turn Management
- [x] Implement simultaneous play (no turn-based restrictions)
- [x] Handle multiple players interacting simultaneously
- [x] Prevent card conflicts (same card picked by multiple players)
- [x] Test: Concurrent player interactions

### 4.2 Win Condition Detection
- [x] Implement `checkWinCondition()` for empty Blitz Pile
- [x] Broadcast win event to all players
- [x] Handle game end state
- [x] Test: Win detection and game ending

### 4.3 Game Reset/Restart
- [x] Implement game restart functionality
- [x] Reset all player piles and positions
- [x] Regenerate and redistribute cards
- [x] Test: Complete game reset workflow

## Phase 5: Enhanced Movement Rules

### 5.1 Interaction Range Validation
- [ ] Implement proximity checking for card pickup (1.5 units)
- [ ] Implement proximity checking for pile placement (1.5 units)
- [ ] Add visual feedback for valid interaction range
- [ ] Test: Range validation for pickup and placement

### 5.2 Card Carrying Mechanics
- [ ] Enforce one-card-at-a-time rule
- [ ] Prevent pickup when already holding a card
- [ ] Implement card return on invalid placement
- [ ] Test: Card carrying restrictions and validation

### 5.3 Visual Feedback Enhancement
- [ ] Highlight valid drop targets when holding a card
- [ ] Show invalid placement feedback (red indication)
- [ ] Add card value/color display for better visibility
- [ ] Test: Visual feedback accuracy

## Phase 6: Scoring System (Optional)

### 6.1 Score Calculation
- [x] Implement Blitz Pile penalty (-2 per remaining card)
- [x] Implement Dutch Pile contribution bonus (+1 per card placed)
- [x] Calculate final scores at game end
- [x] Test: Score calculation accuracy

### 6.2 Score Display
- [x] Add real-time score tracking UI
- [x] Display final scores at game end
- [ ] Add score history/leaderboard
- [x] Test: Score display and persistence

## Phase 7: Advanced Game Features

### 7.1 Game Variations
- [ ] Implement different pile counts (2-6 Dutch Piles)
- [ ] Add time-based scoring bonuses
- [ ] Implement tournament mode (multiple rounds)
- [ ] Test: Game variation functionality

### 7.2 Quality of Life Improvements
- [ ] Add card preview when hovering over piles
- [ ] Implement undo for last move (if desired)
- [ ] Add game statistics tracking
- [ ] Test: QoL feature functionality

## Phase 8: Performance & Polish

### 8.1 Performance Optimization
- [ ] Optimize state synchronization for large card movements
- [ ] Implement efficient collision detection for interactions
- [ ] Add client-side prediction for smoother gameplay
- [ ] Test: Performance under stress (multiple players)

### 8.2 Bug Fixes & Edge Cases
- [ ] Handle network disconnection gracefully
- [ ] Fix any remaining card positioning issues
- [ ] Handle edge cases in pile management
- [ ] Test: Edge case handling and error recovery

## Testing Strategy

### Unit Tests
- [ ] Write tests for card validation functions
- [ ] Write tests for pile management logic
- [ ] Write tests for win condition detection
- [ ] Test: All unit tests pass

### Integration Tests
- [ ] Test multiplayer card synchronization
- [ ] Test complete game flow from start to finish
- [ ] Test error handling and recovery
- [ ] Test: All integration tests pass

### User Acceptance Tests
- [ ] Verify game plays according to Dutch Blitz rules
- [ ] Confirm smooth 3D movement and interaction
- [ ] Validate multiplayer experience quality
- [ ] Test: Game is fun and playable

## Implementation Notes

### Dependencies
- Existing Colyseus server setup
- PlayCanvas 3D client
- Current card/pile entity system

### Key Files to Modify
- `server/src/rooms/schema/MyState.ts` - Game state schema
- `server/src/rooms/MyRoom.ts` - Game logic and validation
- `src/scripts/main.js` - Client-side game mechanics
- `src/scripts/card.js` - Card behavior and validation

### Success Criteria
1. ✅ All phases completed and tested
2. ✅ Game follows Dutch Blitz rules accurately
3. ✅ Multiplayer synchronization works flawlessly
4. ✅ 3D interaction feels natural and responsive
5. ✅ No major bugs or edge cases remain

---

**Total Estimated Tasks: ~60 trackable items**  
**Completion Tracking: Use [x] to mark completed tasks**

*This implementation plan ensures systematic development of Dutch Blitz rules while maintaining the existing 3D multiplayer infrastructure.*
