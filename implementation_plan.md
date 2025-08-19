---
applyTo: '**'
---

# Implementation Plan: Dutch Blitz x Fall Guys 3D Web Game

## Overview
Create a 3D multiplayer game inspired by Dutch Blitz and Fall Guys, playable in the browser on mobile and desktop. Players control avatars, run between cards, pick them up, and add them to communal piles. The game uses PlayCanvas for 3D, Neonardo.ai for texture generation, Mixamo for animations, Colyseus for multiplayer, and supports touch and keyboard/mouse controls. Host on Netlify.


## Phase 1: PlayCanvas + Colyseus Scaffold (Rapid Prototype)
- [x] Scaffold PlayCanvas project and Colyseus server for local development
- [x] Implement player avatars that can move around (WASD/mouse for desktop, touch for mobile)
- [x] Place cards on the ground that can be picked up by players
- [x] Add central piles where cards can be placed
- [x] Implement multiplayer sync for player positions, card states, and pile states using Colyseus
- [x] Enable picking up cards and dropping them into piles with correct scoring
- [x] Achieve a fully playable browser prototype for immediate local testing

## Phase 2: Project Structure & Netlify Setup
- [x] Organize project directories for assets, scripts, multiplayer logic
- [ ] Configure Netlify for deployment

## Phase 3: Art & Animation (PRIORITY - Current Focus)
### 3.1 Authentic Dutch Blitz Visual Design
- [ ] **Card Design System**
  - [x] Traditional playing card proportions (approx implemented via 2.4 x 3.3 model scale ~2.5:3.5)
  - [x] Classic Dutch Blitz color scheme (red / green / blue / yellow applied)
  - [x] Clean, bold number fonts (SVG generator uses large centered + corner numbers)
  - [x] Traditional card back pattern (current back is placeholder geometric; needs folk / hex sign art)
  - [x] Card thickness and rounded corners (3D box thickness + rounded SVG rect corners)

- [ ] **Environment & Table Design**
  - [ ] Wooden table surface with natural grain texture
  - [ ] Warm, cozy lighting reminiscent of family game nights
  - [ ] Traditional Pennsylvania Dutch/Amish color palette (earth tones, deep reds, blues)
  - [ ] Rustic wooden borders around player areas
  - [ ] Subtle fabric/cloth texture for card pile areas

- [ ] **Player Avatar Design**
  - [ ] Simple, family-friendly character design
  - [ ] Traditional clothing styles (suspenders, simple dresses, bonnets)
  - [ ] Distinct color-coded outfits for easy player identification
  - [ ] Expressive faces showing excitement/concentration
  - [ ] Hand animations for card handling

### 3.2 Card Textures & Materials
- [ ] **Face-Up Card Textures** (Now using scripted SVG generation instead of immediate AI art)
  - [x] Generate vector card faces (script `scripts/generate-card-svgs.js` outputs 4 colors × 10 values)
  - [x] Large, clear numbers (1–10) – Arial bold placeholder (consider serif upgrade later)
  - [x] Glossy finish material (basic shininess=25 applied; could refine with specular/clearcoat)

- [ ] **Face-Down Card Back** (Planned – replace placeholder)
  - [ ] Traditional Pennsylvania Dutch hex sign / folk motif
  - [ ] Deep navy or burgundy background + gold accents
  - [ ] "Dutch Blitz" branding text
  - [ ] Minor wear/aging + subtle vignette

### 3.3 Animations (Use Mixamo + Custom)
- [ ] **Avatar Animations**
  - [ ] Idle: Gentle swaying, looking around eagerly
  - [ ] Walking: Quick, excited movement toward cards
  - [ ] Running: Frantic dash when racing for cards
  - [ ] Pickup: Reaching down and grabbing motion
  - [ ] Holding: Card held up near chest/face level
  - [ ] Drop: Placing motion with arm extension
  - [ ] Victory: Arms raised, jumping celebration
  - [ ] Defeat: Slumped shoulders, head shake

- [ ] **Card Animations**
  - [ ] Smooth flip animation from face-down to face-up
  - [ ] Arc trajectory when moving between piles
  - [ ] Gentle floating/bobbing when held by player
  - [ ] Stack settling animation when cards are placed
  - [ ] Shuffle animation for Post Pile cycling (refilling from Wood pile)

- [ ] **Pile Animations**
  - [ ] Highlight glow when valid drop target
  - [ ] Completion explosion/sparkle when pile reaches 10
  - [ ] Automatic removal animation for completed piles

### 3.4 Visual Effects & Polish
  - [ ] **Particle Effects**
  - [ ] Card trail particles when moving quickly
  - [ ] Sparkle effects on valid moves
  - [ ] Explosion confetti when pile completes
  - [ ] Victory fireworks for round winner

- [ ] **UI Enhancement**
  - [ ] Traditional wood-carved button styles
  - [ ] Vintage paper/parchment backgrounds
  - [ ] Hand-drawn style icons and elements
  - [ ] Warm color scheme matching game theme

### 3.5 Audio Design
- [ ] **Sound Effects**
  - [ ] Card flip sounds (realistic paper/cardboard)
  - [ ] Card placement "snap" sound
  - [ ] Footstep sounds on wooden surface
  - [ ] Victory bell/chime sounds
  - [ ] Background ambiance (cozy indoor environment)

- [ ] **Music**
  - [ ] Upbeat, family-friendly background music
  - [ ] Traditional folk music elements
  - [ ] Tension music during close games

## RECOMMENDED STARTING POINT: Art & Animation Phase

### Priority 1: Card Visual Overhaul (Start Here!)
The current game uses basic colored boxes for cards. To make it feel like authentic Dutch Blitz, we should immediately focus on:

#### **Step 1: Traditional Card Design** (Estimated: 2-3 hours) ✅ COMPLETED
```markdown
- [x] Create proper card aspect ratio (2.5:3.5) instead of current boxes
- [x] Design authentic Dutch Blitz card faces with large, clear numbers  
- [x] Generate traditional card back pattern using Leonardo.ai
- [x] Replace current colored box materials with realistic card textures
```

#### **Step 2b: Environment Enhancement** (Estimated: 2-3 hours)
```markdown
- [ ] Replace green ground plane with wooden table texture
- [ ] Add warm, cozy lighting for family game atmosphere
- [ ] Create distinct player areas with subtle wooden borders
- [ ] Generate table/surface textures using Neonardo.ai
```

**Leonardo.ai Prompts to Use:**
1. **Table Surface:** "Wooden table top texture, natural oak grain, warm brown color, polished finish, family dining table, rustic farmhouse style"
2. **Player Areas:** "Wooden border texture, carved details, traditional craftsmanship, warm brown wood, simple geometric patterns"

#### **Step 3: Basic Avatar Improvements** (Estimated: 1-2 hours)
```markdown
- [ ] Download simple character walking/idle animations from Mixamo
- [ ] Apply traditional color-coded clothing materials
- [ ] Add basic pickup/drop hand animations
```

### Priority 2: Card Interaction & Layout Polish
#### **Step 4: Enhanced Card Behaviors** (Estimated: 2-3 hours)
```markdown
- [ ] Add smooth card flip animations (face-down to face-up)
- [ ] Implement arc trajectory for card movement
- [ ] Create proper card stacking with realistic thickness
- [ ] Add highlight glow for valid drop targets
```

### Priority 3: Game Feel Enhancement
#### **Step 5: Audio & Effects** (Estimated: 2-3 hours)
```markdown
- [ ] Add realistic card flip/placement sound effects
- [ ] Implement particle effects for successful moves
- [ ] Create victory celebration animations
- [ ] Add background music with traditional folk elements
```

## Why Start with Cards?
1. **Immediate Visual Impact:** Cards are the core game element players interact with most
2. **Authenticity:** Traditional card design instantly makes it feel like real Dutch Blitz
3. **Recognition:** Players familiar with the physical game will immediately connect
4. **Foundation:** Better card visuals make all other improvements more impactful

## Quick Wins for Authentic Feel
- [x] Replace box models with proper card proportions (scaled cards + SVG faces)
- [x] Use traditional Dutch Blitz colors
- [x] Add realistic card thickness (spaced stacking + visible thickness)
- [ ] Implement smooth card handling animations (future flip / arc)
- [ ] Generate authentic Pennsylvania Dutch-inspired artwork (back + decorative motifs)
- [x] Improve board layout (wider central pile spacing, personal pile repositioning, larger table)

## Recent Progress Summary
| Area | Completed |
|------|-----------|
| Core prototype & multiplayer | ✅ |
| Central Dutch pile spacing revision | ✅ (dynamic spacing constant) |
| Personal pile layout (Post pile 3 visible + Blitz + Wood below) | ✅ |
| Separation from Dutch piles (radius + outward offset) | ✅ |
| Board/table size increase | ✅ (70×70 ground, camera offset) |
| Vector card asset pipeline | ✅ (script + SVG integration with fallback) |
| Bottom corner number alignment fix | ✅ |
| Switch rendering to SVG textures | ✅ |
| Authentic back art | ⏳ (placeholder) |
| Suits / icons & serif font | ⏳ |
| Wear / grain / polish shaders | ⏳ |

## Immediate Next Recommendations
1. Produce authentic back & folk motif assets (AI prompt or Illustrator) and replace placeholder.
2. Add suit / icon system (could use small symbolic shapes reflecting color theme instead of traditional suits).
3. Implement card flip animation (scale + rotation + material swap) for visual feedback.
4. Introduce highlight/outline shader for valid drop targets (currently color swap only).
5. Begin adding subtle ambient SFX (card slide, flip) for tactile feel.

## Phase 4: Game Logic Expansion
- [ ] Enforce Dutch Blitz rules (card sequencing, valid moves)
- [ ] Add advanced scoring and round management

## Phase 5: UI & Features
- [ ] Responsive UI for desktop and mobile
- [ ] In-game chat and lobby system

## Phase 6: Testing & Optimization
- [ ] Test on major browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Optimize assets and code for performance
- [ ] Fix bugs and polish gameplay

## Phase 7: Deployment
- [ ] Build and export PlayCanvas project for web
- [ ] Deploy to Netlify
- [ ] Set up custom domain, HTTPS, and analytics

## Directory Structure Example
```
/ (root)
├── public/
│   └── index.html
├── src/
│   ├── assets/
│   │   ├── textures/
│   │   ├── models/
│   │   └── animations/
│   ├── scripts/
│   │   ├── game/
│   │   ├── multiplayer/
│   │   └── controls/
│   └── ui/
├── colyseus-server/
│   └── index.ts
├── package.json
├── netlify.toml
└── README.md
```

## Tool Integration Notes
- **PlayCanvas**: Use for all 3D rendering, physics, and game logic.
- **Neonardo.ai**: Generate textures, download, and import into PlayCanvas assets.
- **Mixamo**: Download FBX animations, convert as needed, and import to PlayCanvas.
- **Colyseus**: Use for multiplayer server/client logic. Host server separately if needed.
- **Controls**: Use PlayCanvas input system for desktop and mobile. Implement custom touch UI for mobile.
- **Netlify**: Host static build. Use Netlify Functions if backend logic is needed.

## Milestones & Deliverables
- [x] Playable prototype with basic movement and card interaction
- [x] Multiplayer demo with 2+ players
- [ ] Final polished game deployed on Netlify

---
This plan is designed for AI agents to follow step-by-step. Each phase can be expanded with subtasks as needed.
