# Dutch Blitz Architecture (AI-Focused)

Goal: Minimal map of where logic lives & how to extend safely.

## Core Files
- `MyRoom.ts`: Orchestrator (room lifecycle, service wiring, handler registration).
- `schema/MyState.ts`: Data shapes (Player, Card, Pile, MyState).
- `constants.ts`: All tunable numeric values.
- `services/`: Cohesive domain modules.
- `handlers/`: One Colyseus message type per file (pickup, place, cancel, drawWood, cycle, restart).

## Data Model (Essentials)
- Player: position (x,y), piles: blitz (10), reserveCards (27), postPile (<=3 visible slots w/ "" placeholders), woodPile (cycled cards), heldCard + origin metadata, score.
- Card: id, (x,y), value 1..10, color, faceUp, owner, pickedUp.
- Pile: id, (x,y), type (dutch | wood_indicator), cardStack, topCard, color (for dutch build piles).
- State: maps of players, cards, piles + gameStatus, winner.

## Services & Methods
- **DeckRefillService**: generatePlayerDeck, fillDutchPile, cycleDutchPile, drawFromWood.
- **LayoutService**: computeVisibleSlotPositions, repositionVisibleSlots, positionPersonalPiles, updateWoodIndicator, **updateWoodPileFaceStates**.
- **PlacementService**: tryReturnToWood, tryPlaceOnDutch, tryPlaceOnPost, tryPlaceOnBlitz - centralized placement logic.
- **RuleService**: isValidSequenceMove, checkWinCondition.
- **ScoringService**: completePile, calculateFinalScores.
- **RestoreProximityService**: within*Radius helpers, returnCardToPlayer.

## Message Flow
client -> handler -> (validate + service calls + minimal state mutation) -> schema changes broadcast by Colyseus.

## Room Delegate Methods (Legacy - Being Phased Out)
`drawFromWood`, `repositionDutchPile`, `isValidSequenceMove`, `checkWinCondition`, `completePile`, `calculateFinalScores`, `returnCardToPlayer`, `getVisibleSlotPositions`.
**Note**: PlacementService now handles most placement logic directly in handlers.

## Key Implementation Details

### Wood Pile Face State Management
- Only top card in woodPile is faceUp, all others faceDown
- `LayoutService.updateWoodPileFaceStates()` enforces this invariant
- Called after any wood pile manipulation (cycle, pickup, placement)

### Simplified Wood Drawing (R key)
- Always cycles 3 cards from reserve to wood pile (no auto post-slot filling)
- Requires proximity to wood indicator (WOOD_DRAW_RADIUS = 2.0)
- Players manually move cards from wood to post slots as needed

### Placement System
- `PlacementService` provides structured placement validation
- Returns `PlacementResult` with success/failure and metadata
- Handles wood, dutch, post, and blitz pile placements consistently

### Position Tracking
- Player schema stores pile positions (blitzPileX/Y, postSlotX/Y[], woodIndicatorX/Y)
- Enables proximity detection even when cards are picked up
- LayoutService maintains these coordinate caches

## Invariants
- blitzPile: only top card rendered and pickupable.
- postPile length <= MAX_VISIBLE_SLOTS; empty slots = "".
- woodPile: only top card faceUp, others faceDown.
- Card resides in exactly one container (a pile list or player pile) at any time.
- Shared dutch pile topCard matches last index or -1.
- Win: blitzPile empty -> gameStatus=finished (and final scores computed once).
- Wood draw only when within WOOD_DRAW_RADIUS of wood_indicator.

## Where to Add New Logic
| Change Type | Location |
|-------------|----------|
| Placement / sequence rule | PlacementService or RuleService |
| Card movement / draw logic | DeckRefillService |
| Layout / coordinates / face states | LayoutService + constants |
| Scoring adjustments | ScoringService |
| Proximity / return behavior | RestoreProximityService |
| New network action | New handler file (delegate to services) |
| Schema shape change | schema + adjust services/tests |

## Extension Steps
1. Add/adjust constants.
2. Implement service method (pure logic first; mutate state clearly).
3. Create handler -> validate -> call service -> reposition/layout if needed.
4. Maintain invariants (especially face states); add/update tests.
5. Use PlacementService for new placement types.

## Anti-Patterns
- Logic embedded in handlers instead of services.
- Geometry or shuffle logic in MyRoom/handlers.
- Direct state mutation bypassing service semantics.
- Duplicated numeric literals (use constants.ts).
- Forgetting to call updateWoodPileFaceStates after wood pile changes.

## Quick Constants (see `constants.ts` for full list)
MAX_VISIBLE_SLOTS=3, BLITZ_COUNT=10, DUTCH_PILE_SPACING=5, WOOD_OFFSET_Y=4, WOOD_DRAW_RADIUS=2.0, POST_PLACE_RADIUS=2.0, DUTCH_DROP_RADIUS=2.0.

## Example Flow: Drop Card
`place` -> placeHandler -> PlacementService.tryPlaceOnDutch -> validate sequence (RuleService) -> push to pile.cardStack -> scoringService.completePile (if length 10) -> ruleService.checkWinCondition -> maybe scoringService.calculateFinalScores -> broadcast.

## Example Flow: Wood Cycle (R key)
`drawWood` -> drawWoodHandler -> proximity check -> cycle 3 cards from reserve to wood indicator -> update player.woodPile -> LayoutService.updateWoodPileFaceStates -> broadcast.

## Refactor Status
- ✅ PlacementService centralized placement logic
- ✅ Wood pile face state management automated
- ✅ Simplified wood drawing (no auto post-slot filling)
- ✅ Position caching for proximity detection
- 🔄 Gradual removal of dynamic `(room as any)[...]` calls
- 🔄 Migration to typed service accessors

## Client-Side Architecture

### Core Files
- `src/scripts/main.js`: Main game client, Colyseus connection, input handling
- `src/scripts/card.js`: Card entity management and rendering
- `src/scripts/pile.js`: Pile visualization and management
- `src/scripts/player.js`: Player entity and avatar handling

### UI Features
- **Scoreboard**: Displays player stats including wood pile count, reserve count, post slots filled, and score
- **Dynamic Updates**: Real-time updates via Colyseus state synchronization
- **3D Rendering**: PlayCanvas-based 3D card game visualization
- **Input Handling**: Keyboard controls (E/pickup, Q/place, C/cancel, R/drawWood)

### Key UI Components
- Wood pile count display: `"Wood: X"` in player status
- Reserve cards count: `"Reserve: X"`
- Post slots status: `"Post Slots: X/3 filled"`
- Win condition indicator: `"You can win!"` when blitz pile empty

### Client-Server Sync
- State changes broadcast automatically via Colyseus schema
- Face state updates (wood pile top card visibility) sync in real-time
- Card positions and pile states maintained consistently
- Proximity-based interactions validated server-side

END
