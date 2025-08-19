# Dutch Blitz Card Drop Logic Analysis

## 1. Client-Side Drop Logic

### Proximity Evaluation
- When the player presses the drop key (`Q`), the client code in `src/scripts/main.js` evaluates proximity to all possible valid drop targets:
  - Shared Dutch piles (`dutch_pile_*`): Finds the nearest pile within a fixed radius (1.5 units).
  - Wood indicator pile: Checks proximity to the player's own wood indicator (2.0 units).
  - If no Dutch pile or wood indicator is close enough, the client sends a `placePost` message to the server to attempt placement in the player's own visible (post) slots.
- No other logic is performed client-side. The client does **not** check game rules, card sequence, or slot emptiness—only proximity to valid slot types.
- This design minimizes unnecessary server calls and keeps client logic simple and focused on spatial checks.

### Example (main.js):
```js
if (nearestPileId) {
    window.room.send('drop', { cardId: heldCardId, x: localPos.x, y: localPos.y, pileId: nearestPileId });
} else {
    window.room.send('placePost', { cardId: heldCardId });
}
```

## 2. Server-Side Drop Validation

### Proximity Checks
- The server validates proximity for each slot type using the same radii as the client (constants in `constants.ts`).
- Each slot type has its own handler and logic:
  - **Shared Dutch Pile** (`dropHandler.ts`):
    - Checks if the player is within `DUTCH_DROP_RADIUS` of the pile.
    - Validates sequence rules (e.g., color, value) before allowing placement.
  - **Wood Indicator** (`dropHandler.ts`):
    - Checks if the player is within `WOOD_DRAW_RADIUS` of the indicator.
    - Only allows cards originally picked up from wood or wood indicator.
  - **Visible (Post) Slot** (`placePostHandler.ts`):
    - Checks if the player is within `POST_PLACE_RADIUS` of the slot.
    - Only allows placement in empty slots.
    - Slot selection logic is separate from Dutch pile logic.
  - **Cancel/Return** (`cancelHandler.ts`):
    - Checks if the player is within `CANCEL_RADIUS` of the pickup origin before returning the card.

### Slot-Specific Validation
- Each slot type has its own handler and validation logic, keeping rules modular and maintainable.
- No slot type shares validation logic with another; each is responsible for its own rules and proximity checks.

## 3. Logic Flow: "drop" vs "placePost"

### "drop" Message
- Sent by the client when the player is in proximity to a shared Dutch pile or wood indicator.
- Server-side (`dropHandler.ts`):
  - If `pileId` is a Dutch pile, checks proximity and sequence rules, then places the card.
  - If `pileId` is a wood indicator, checks proximity and origin, then returns the card.
- Used for:
  - Placing cards on shared Dutch piles.
  - Returning cards to the wood indicator.

### "placePost" Message
- Sent by the client when no Dutch pile or wood indicator is close enough (i.e., the player is near their own post slots).
- Server-side (`placePostHandler.ts`):
  - Finds the nearest empty visible slot.
  - Checks proximity and emptiness, then places the card.
- Used for:
  - Placing cards into the player's own visible (post) slots.

### Why Both?
- **Separation of concerns:** Each message type targets a distinct slot type and logic path, keeping validation modular.
- **Client efficiency:** The client only sends the most relevant message based on proximity, reducing server load and unnecessary checks.
- **Server authority:** The server always validates proximity and slot-specific rules, ensuring game integrity and preventing cheating or desync.

## 4. Recommendations
- The current design is correct and efficient:
  - Client only checks proximity to valid slot types, not game rules.
  - Server validates proximity and slot-specific rules in dedicated handlers.
- For maintainability, ensure each slot type's handler remains focused on its own rules and does not duplicate logic.
- Consider documenting the radii and slot types in a shared README or developer guide for future contributors.

---

**Summary:**
- Client: Only proximity checks to valid slot types before sending drop/placePost.
- Server: Validates proximity and slot-specific rules in separate handlers for Dutch piles, wood indicator, post slots, and cancel/return.
- "drop" and "placePost" are both needed to keep logic modular and efficient.

*End of report.*
