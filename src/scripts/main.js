// PlayCanvas basic setup
var canvas = document.getElementById('application-canvas');
var app = new pc.Application(canvas, {});
app.start();
// Resize canvas and app to fill window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    app.resizeCanvas(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create camera (3rd person)
var camera = new pc.Entity();
camera.addComponent('camera', {
    clearColor: new pc.Color(0.4, 0.6, 0.8)
});
camera.setPosition(0, 6, 12); // initial position
camera.lookAt(0, 1, 0);
app.root.addChild(camera);

// Add directional light
var light = new pc.Entity();
light.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 1, 1),
    intensity: 1.5
});
light.setEulerAngles(45, 30, 0);
app.root.addChild(light);

// Create ground
var ground = new pc.Entity();
ground.addComponent('model', {
    type: 'box'
});
ground.setLocalScale(20, 0.5, 20);
ground.setPosition(0, -0.25, 0);
app.root.addChild(ground);

// Entities for avatars, cards, piles

var avatars = {};
var cards = {};
var piles = {};

// Track local player id and position
var localPlayerId = null;
var localPos = { x: 0, y: 0 };
var localVelocity = { x: 0, y: 0 };
var moveSpeed = 0.035; // even slower for fine control
var accel = 0.035;
var friction = 0.07;
var heldCardId = null;

// WASD movement controls
var keys = {};
window.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
    // Card pickup/drop
    if (e.key.toLowerCase() === 'q') {
        console.log('Q pressed. heldCardId:', heldCardId);
    }
    if (e.key.toLowerCase() === 'e' && !heldCardId) {
        // Try to pick up a nearby card
        var nearestCardId = null;
        var nearestDist = 1.2; // pickup radius
        Object.keys(cards).forEach(function(id) {
            var cardEntity = cards[id];
            var cardPos = cardEntity.getPosition();
            var dx = localPos.x - cardPos.x;
            var dy = localPos.y - cardPos.z;
            var dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < nearestDist) {
                nearestCardId = id;
                nearestDist = dist;
            }
        });
        console.log('Pickup attempt: nearestCardId=', nearestCardId, 'dist=', nearestDist);
        if (nearestCardId && window.room) {
            window.room.send('pickup', { cardId: nearestCardId });
            heldCardId = nearestCardId; // Set locally for immediate feedback
            console.log('Sent pickup message for card:', nearestCardId);
            // Log card info for player feedback
            var cardInfo = cards[nearestCardId];
            if (cardInfo) {
                console.log('Picked up card:', nearestCardId, 'at position:', cardInfo.getPosition());
            }
        }
    }
    // Drop card
    if (e.key.toLowerCase() === 'q' && heldCardId && window.room) {
        console.log('Drop key pressed. heldCardId:', heldCardId);
        // Check for nearby pile
        var nearestPileId = null;
        var nearestPileDist = 1.5; // drop radius
        Object.keys(piles).forEach(function(id) {
            var pileEntity = piles[id];
            var pilePos = pileEntity.getPosition();
            var dx = localPos.x - pilePos.x;
            var dy = localPos.y - pilePos.z;
            var dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < nearestPileDist) {
                nearestPileId = id;
                nearestPileDist = dist;
            }
        });
        if (nearestPileId) {
            window.room.send('drop', { cardId: heldCardId, x: localPos.x, y: localPos.y, pileId: nearestPileId });
            console.log('Sent drop message for card:', heldCardId, 'onto pile:', nearestPileId);
        } else {
            console.log('No pile nearby - card drop rejected. Move closer to a pile!');
            // Optional: Add visual/audio feedback for invalid drop
        }
    }
});
window.addEventListener('keyup', function(e) { keys[e.key.toLowerCase()] = false; });

function updateMovement(dt) {
    if (!localPlayerId) return;
    // WASD input
    var inputX = 0, inputY = 0;
    if (keys['w']) inputY -= 1;
    if (keys['s']) inputY += 1;
    if (keys['a']) inputX -= 1;
    if (keys['d']) inputX += 1;
    // Normalize input
    var mag = Math.sqrt(inputX * inputX + inputY * inputY);
    if (mag > 0) {
        inputX /= mag;
        inputY /= mag;
    }
    // Accelerate
    localVelocity.x += inputX * accel;
    localVelocity.y += inputY * accel;
    // Friction
    localVelocity.x *= (1 - friction);
    localVelocity.y *= (1 - friction);
    // Clamp speed
    var velMag = Math.sqrt(localVelocity.x * localVelocity.x + localVelocity.y * localVelocity.y);
    if (velMag > moveSpeed) {
        localVelocity.x = (localVelocity.x / velMag) * moveSpeed;
        localVelocity.y = (localVelocity.y / velMag) * moveSpeed;
    }
    // Move
    localPos.x += localVelocity.x;
    localPos.y += localVelocity.y;
    // Send movement to server
    if ((inputX !== 0 || inputY !== 0) && window.room) {
        window.room.send('move', { x: localPos.x, y: localPos.y });
    }
    // Update local avatar position for responsiveness
    if (avatars[localPlayerId]) {
        avatars[localPlayerId].setPosition(localPos.x, 1, localPos.y);
        // Camera follows avatar (3rd person)
        var camOffset = { x: 0, y: 5, z: 10 };
        var targetPos = avatars[localPlayerId].getPosition();
        camera.setPosition(targetPos.x + camOffset.x, camOffset.y, targetPos.z + camOffset.z);
        camera.lookAt(targetPos.x, 1, targetPos.z);
        
        // Update held card position to follow avatar
        if (heldCardId && cards[heldCardId]) {
            cards[heldCardId].setPosition(localPos.x, 2, localPos.y + 0.7); // above avatar
        }
        
        // Visual feedback: highlight nearby pile when holding a card
        if (heldCardId) {
            var nearestPileId = null;
            var nearestPileDist = 1.5;
            Object.keys(piles).forEach(function(id) {
                var pileEntity = piles[id];
                var pilePos = pileEntity.getPosition();
                var dx = localPos.x - pilePos.x;
                var dy = localPos.y - pilePos.z;
                var dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < nearestPileDist) {
                    nearestPileId = id;
                    nearestPileDist = dist;
                }
            });
            
            // Highlight the nearest pile
            Object.keys(piles).forEach(function(id) {
                var material = piles[id].model.material;
                if (id === nearestPileId) {
                    material.diffuse.set(0, 1, 0); // green when in range
                } else {
                    material.diffuse.set(0, 1, 1); // cyan default
                }
            });
        } else {
            // Reset all piles to default color when not holding a card
            Object.keys(piles).forEach(function(id) {
                piles[id].model.material.diffuse.set(0, 1, 1); // cyan default
            });
        }
    }
}

app.on('update', function(dt) { updateMovement(dt); });

// Colyseus state sync (requires colyseus-client.js loaded)
window.syncColyseusState = function(state) {
    // Track held card
    heldCardId = null;
    if (localPlayerId && state.players && typeof state.players.get === 'function') {
        const player = state.players.get(localPlayerId);
        if (player) {
            heldCardId = player.heldCard || null;
        }
    }
    console.log('syncColyseusState called. State:', state);
    // Defensive: check for expected properties
    if (!state.players || typeof state.players.get !== 'function') {
        console.warn('State missing players Map:', state);
        return;
    }
    if (!state.cards || typeof state.cards.get !== 'function') {
        console.warn('State missing cards Map:', state);
        return;
    }
    if (!state.piles || typeof state.piles.get !== 'function') {
        console.warn('State missing piles Map:', state);
        return;
    }
    // Detect local player id - only set initial position once
    if (window.room && window.room.sessionId && !localPlayerId) {
        localPlayerId = window.room.sessionId;
        const player = state.players.get(localPlayerId);
        if (player) {
            localPos.x = player.x;
            localPos.y = player.y;
        }
    }
    // Sync players (don't update local player position from server to avoid jumping)
    state.players.forEach(function(player, id) {
        if (!avatars[id]) {
            console.log('Creating avatar for player:', id, player);
            var avatar = new pc.Entity();
            avatar.addComponent('model', { type: 'capsule' });
            avatar.setLocalScale(1, 2, 1);
            app.root.addChild(avatar);
            avatars[id] = avatar;
        }
        // Only update other players' positions from server, not local player
        if (id !== localPlayerId) {
            avatars[id].setPosition(player.x, 1, player.y);
        }
    });
    // Sync cards
    state.cards.forEach(function(card, id) {
        if (!cards[id]) {
            console.log('Creating card entity:', id, card);
            var cardEntity = new pc.Entity();
            cardEntity.addComponent('model', { type: 'box' });
            cardEntity.setLocalScale(0.8, 0.15, 1.2); // smaller and thinner for better stacking
            // Set card color based on server data
            var cardMaterial = new pc.StandardMaterial();
            if (card.color === 'red') cardMaterial.diffuse.set(1, 0, 0);
            else if (card.color === 'green') cardMaterial.diffuse.set(0, 1, 0);
            else if (card.color === 'blue') cardMaterial.diffuse.set(0, 0, 1);
            else if (card.color === 'yellow') cardMaterial.diffuse.set(1, 1, 0);
            else cardMaterial.diffuse.set(0.5, 0.5, 0.5); // gray fallback
            cardEntity.model.material = cardMaterial;
            app.root.addChild(cardEntity);
            cards[id] = cardEntity;
        }
        // If held by local player, always attach to current avatar position
        if (card.pickedUp && card.id === heldCardId && avatars[localPlayerId]) {
            var avatarPos = avatars[localPlayerId].getPosition();
            cards[id].setPosition(avatarPos.x, 2, avatarPos.z + 0.7); // above avatar
        } else {
            // Calculate proper stacking height
            var cardHeight = 0.5; // base height above ground
            var stackPosition = 0;
            
            // Find which pile this card belongs to and its position in the stack
            state.piles.forEach(function(pile, pileId) {
                if (pile.cardStack && pile.cardStack.includes(card.id)) {
                    stackPosition = pile.cardStack.indexOf(card.id);
                    cardHeight = 0.5 + (stackPosition * 0.25); // base height + stack offset
                }
            });
            
            cards[id].setPosition(card.x, cardHeight, card.y);
        }
        console.log('Card position:', id, card.x, card.y, 'Value:', card.value, 'Color:', card.color);
    });
    // Sync piles
    state.piles.forEach(function(pile, id) {
        if (!piles[id]) {
            console.log('Creating pile entity:', id, pile);
            var pileEntity = new pc.Entity();
            pileEntity.addComponent('model', { type: 'cylinder' });
            pileEntity.setLocalScale(1.5, 0.5, 1.5); // larger and thicker
            // Set pile color
            var pileMaterial = new pc.StandardMaterial();
            pileMaterial.diffuse.set(0, 1, 1); // cyan
            pileEntity.model.material = pileMaterial;
            app.root.addChild(pileEntity);
            piles[id] = pileEntity;
        }
        piles[id].setPosition(pile.x, 0.2, pile.y); // lower pile base for better card stacking visual
        console.log('Pile position:', id, pile.x, pile.y);
    });
    console.log('Avatars:', avatars);
    console.log('Cards:', cards);
    console.log('Piles:', piles);
};
