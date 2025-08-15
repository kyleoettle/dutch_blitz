---
applyTo: '**'
---

# Implementation Plan: Dutch Blitz x Fall Guys 3D Web Game

## Overview
Create a 3D multiplayer game inspired by Dutch Blitz and Fall Guys, playable in the browser on mobile and desktop. Players control avatars, run between cards, pick them up, and add them to communal piles. The game uses PlayCanvas for 3D, Neonardo.ai for texture generation, Mixamo for animations, Colyseus for multiplayer, and supports touch and keyboard/mouse controls. Host on Netlify.


## Phase 1: PlayCanvas + Colyseus Scaffold (Rapid Prototype)
- [ ] Scaffold PlayCanvas project and Colyseus server for local development
- [ ] Implement player avatars that can move around (WASD/mouse for desktop, touch for mobile)
- [ ] Place cards on the ground that can be picked up by players
- [ ] Add central piles where cards can be placed
- [ ] Implement multiplayer sync for player positions, card states, and pile states using Colyseus
- [ ] Enable picking up cards and dropping them into piles with correct scoring
- [ ] Achieve a fully playable browser prototype for immediate local testing

## Phase 2: Project Structure & Netlify Setup
- [ ] Organize project directories for assets, scripts, multiplayer logic
- [ ] Configure Netlify for deployment

## Phase 3: Art & Animation
- [ ] Use Neonardo.ai to generate card textures and environment assets
- [ ] Import textures into PlayCanvas
- [ ] Download running/idle animations from Mixamo
- [ ] Rig and import animated avatars into PlayCanvas

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
- [ ] Playable prototype with basic movement and card interaction
- [ ] Multiplayer demo with 2+ players
- [ ] Final polished game deployed on Netlify

---
This plan is designed for AI agents to follow step-by-step. Each phase can be expanded with subtasks as needed.
