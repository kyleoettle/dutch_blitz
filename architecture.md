# Dutch Blitz Architecture (AI-Focused)

Goal: Minimal map of where logic lives & how to extend safely.

## Core Files
- `MyRoom.ts`: Orchestrator (room lifecycle, service wiring, handler registration).
- `schema/MyState.ts`: Data shapes (Player, Card, Pile, MyState).
- `constants.ts`: All tunable numeric values.
- `services/`: Cohesive domain modules.
- `handlers/`: One Colyseus message type per file (pickup, drop, cancel, placePost, drawWood, cycle, restart).

## Data Model (Essentials)
- Player: position (x,y), piles: blitz (10), post/wood (30), dutch (<=3 visible slots w/ "" placeholders), heldCard + origin metadata, score.
- Card: id, (x,y), value 1..10, color, faceUp, owner, pickedUp.
- Pile: id, (x,y), type (dutch | wood_indicator | personal variants), cardStack, topCard, color (for dutch build piles).
- State: maps of players, cards, piles + gameStatus, winner.

## Services & Methods
- DeckRefillService: generatePlayerDeck, fillDutchPile, cycleDutchPile, drawFromWood.
- LayoutService: computeVisibleSlotPositions, repositionVisibleSlots, positionPersonalPiles, updateWoodIndicator.
- RuleService: isValidSequenceMove, checkWinCondition.
- ScoringService: completePile, calculateFinalScores.
- RestoreProximityService: within*Radius helpers, returnCardToPlayer.

## Message Flow
client -> handler -> (validate + service calls + minimal state mutation) -> schema changes broadcast by Colyseus.

## Room Delegate Methods (Dynamic Calls in Handlers)
`drawFromWood`, `repositionDutchPile`, `isValidSequenceMove`, `checkWinCondition`, `completePile`, `calculateFinalScores`, `returnCardToPlayer`, `getVisibleSlotPositions`.
Refactor target: expose services directly to eliminate string-based access.

## Invariants
- blitzPile: only top card rendered.
- dutchPile length <= MAX_VISIBLE_SLOTS; empty slots = "".
- Card resides in exactly one container (a pile list or player pile) at any time.
- Shared dutch pile topCard matches last index or -1.
- Win: blitzPile empty -> gameStatus=finished (and final scores computed once).
- Wood draw only when within WOOD_DRAW_RADIUS of wood_indicator.

## Where to Add New Logic
| Change Type | Location |
|-------------|----------|
| Placement / sequence rule | RuleService |
| Card movement / draw logic | DeckRefillService |
| Layout / coordinates | LayoutService + constants |
| Scoring adjustments | ScoringService |
| Proximity / return behavior | RestoreProximityService |
| New network action | New handler file (delegate to services) |
| Schema shape change | schema + adjust services/tests |

## Extension Steps
1. Add/adjust constants.
2. Implement service method (pure logic first; mutate state clearly).
3. Create handler -> validate -> call service -> reposition/layout if needed.
4. Maintain invariants; add/update tests.
5. (Optional) Remove now-redundant MyRoom delegates after migrating handlers.

## Anti-Patterns
- Logic embedded in handlers instead of services.
- Geometry or shuffle logic in MyRoom/handlers.
- Direct state mutation bypassing service semantics.
- Duplicated numeric literals (use constants.ts).

## Quick Constants (see `constants.ts` for full list)
MAX_VISIBLE_SLOTS=3, BLITZ_COUNT=10, DUTCH_PILE_SPACING=5, WOOD_OFFSET_Y=4, WOOD_DRAW_RADIUS=2.0.

## Example Flow: Drop Card
`drop` -> dropHandler -> validate sequence (RuleService) -> push to pile.cardStack -> scoringService.completePile (if length 10) -> ruleService.checkWinCondition -> maybe scoringService.calculateFinalScores -> broadcast.

## Refactor Backlog (Concise)
- Remove dynamic `(room as any)[...]` calls; provide typed service accessors.
- Clarify blitz faceUp semantics.
- Auto-update wood indicator after slot reposition events.

END
