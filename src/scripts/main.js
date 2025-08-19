// PlayCanvas basic setup
var canvas = document.getElementById("application-canvas");
var app = new pc.Application(canvas, {});
app.start();
// Resize canvas and app to fill window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  app.resizeCanvas(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Create camera (3rd person)
var camera = new pc.Entity();
camera.addComponent("camera", {
  clearColor: new pc.Color(0.3, 0.25, 0.2), // Warm brown background for cozy indoor feel
});
camera.setPosition(0, 12, 30); // further back for bigger board
camera.lookAt(0, 1, 0);
app.root.addChild(camera);

// Add directional light
var light = new pc.Entity();
light.addComponent("light", {
  type: "directional",
  color: new pc.Color(1.0, 0.95, 0.8), // Warm white light
  intensity: 1.2, // Slightly softer than before
});
light.setEulerAngles(45, 30, 0);
app.root.addChild(light);

// Create ground (larger table area to comfortably fit all piles & players)
var ground = new pc.Entity();
ground.addComponent("model", {
  type: "box",
});
ground.setLocalScale(70, 0.5, 70); // increased from 40 for expanded play space
ground.setPosition(0, -0.25, 0);
// Add a material to make it more visible
var groundMaterial = new pc.StandardMaterial();
groundMaterial.diffuse.set(0.6, 0.4, 0.2); // Warm wooden table color
groundMaterial.emissive.set(0.02, 0.01, 0.01); // Subtle warm glow
ground.addComponent("render");
ground.render.material = groundMaterial;
app.root.addChild(ground);

// Card texture cache
var cardTextures = {};
var cardBackTexture = null;

// Function to create texture materials for cards
function createCardTextureMaterial(color, value) {
  var key = color + "_" + value;
  if (cardTextures[key]) {
    return cardTextures[key];
  }

  var material = new pc.StandardMaterial();
  var texture = new pc.Texture(app.graphicsDevice);

  // New canonical filename (filled style replaces legacy outline)
  var svgPath = "assets/vectors/cards/card_" + color + "_" + value + ".svg";
  var pngFallbackPath =
    "assets/textures/cards/card_" + color + "_" + value + ".png";
  var image = new Image();
  var triedFallback = false;
  var triedOriginal = false;
  image.onload = function () {
    texture.setSource(image);
    material.diffuseMap = texture;
    material.shininess = 25;
    material.opacity = 1.0;
    material.update();
  };
  image.onerror = function () {
    if (!triedFallback) {
      triedFallback = true;
      image.src = pngFallbackPath; // attempt legacy raster asset if SVG missing
    }
  };
  image.src = svgPath;

  cardTextures[key] = material;
  return material;
}

// Function to create card back material
function createCardBackMaterial() {
  if (cardBackTexture) {
    return cardBackTexture;
  }

  var material = new pc.StandardMaterial();
  var texture = new pc.Texture(app.graphicsDevice);

  var svgPath = "assets/vectors/cards/card_back.svg";
  var pngFallbackPath = "assets/textures/cards/card_back.png";
  var image = new Image();
  var triedFallback = false;
  image.onload = function () {
    texture.setSource(image);
    material.diffuseMap = texture;
    material.shininess = 25;
    material.opacity = 1.0;
    material.update();
  };
  image.onerror = function () {
    if (!triedFallback) {
      triedFallback = true;
      image.src = pngFallbackPath;
    }
  };
  image.src = svgPath;

  cardBackTexture = material;
  return material;
}

// Entities for avatars, cards, piles

var avatars = {};
// Track whether GLB avatar asset is loaded
var avatarAsset = null;
var avatarAssetRequested = false;
var cards = {};
var piles = {};

// Track local player id and position
var localPlayerId = null;
var localPos = { x: 0, y: 0 };
var localVelocity = { x: 0, y: 0 };
var moveSpeed = 0.035; // even slower for fine control
var accel = 0.035;
var friction = 0.07;
// Some GLB avatars face +Z by default; our math assumes -Z forward. Offset yaw by 180 if facing is inverted.
// Adjust if your model's forward isn't +Z. 0 assumes model forward is +Z.
var AVATAR_YAW_OFFSET_DEG = 0;
var heldCardId = null;
var gameState = null; // Store the current game state globally
var lastAutoPickupTime = 0;
var autoPickupCooldown = 250; // ms between auto pickups

// WASD movement controls
var keys = {};
window.addEventListener("keydown", function (e) {
  keys[e.key.toLowerCase()] = true;
  // Card pickup/drop
  if (e.key.toLowerCase() === "r" && window.room) {
    // Attempt draw from wood pile into empty Post (visible) slots
    window.room.send("drawWood", {});
    console.log("Sent drawWood message");
  }
  if (e.key.toLowerCase() === "t" && window.room) {
    // Try again / Restart game
    window.room.send("restart", {});
    console.log("Sent restart message");
  }
  if (e.key.toLowerCase() === "p" && window.room) {
    // Force restart for testing (new cards regardless of finished state)
    window.room.send("forceRestart", {});
    console.log("Sent forceRestart message");
  }
  if (e.key.toLowerCase() === "e" && !heldCardId) {
    // Restrict pickup to ONLY your own Blitz top, Wood (indicator) top, or Post Pile cards.
    if (!gameState || !localPlayerId) return;
    var you = gameState.players.get(localPlayerId);
    if (!you) return;
    var candidates = [];
    // Blitz top
    if (you.blitzPile && you.blitzPile.length > 0) {
      candidates.push(you.blitzPile[you.blitzPile.length - 1]);
    }
    // Wood indicator top
    var indicator = gameState.piles.get("wood_indicator_" + localPlayerId);
    if (indicator && indicator.cardStack.length > 0) {
      candidates.push(indicator.cardStack[indicator.cardStack.length - 1]);
    }
    // Post Pile cards (face-up personal slots)
    if (you.postPile) {
      for (var i = 0; i < you.postPile.length; i++) {
        if (you.postPile[i] && you.postPile[i] !== "") {
          candidates.push(you.postPile[i]);
        }
      }
    }
    var nearestCardId = null;
    var nearestDist = 1.0; // tighter pickup radius
    candidates.forEach(function (cid) {
      var entity = cards[cid];
      if (!entity) return;
      var pos = entity.getPosition();
      var dx = localPos.x - pos.x;
      var dy = localPos.y - pos.z;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearestCardId = cid; nearestDist = dist; }
    });
    if (nearestCardId && window.room) {
      window.room.send("pickup", { cardId: nearestCardId });
      heldCardId = nearestCardId;
      console.log("Sent pickup (personal) for card:", nearestCardId, "dist", nearestDist.toFixed(2));
    } else {
      console.log("No personal card in range to pick up (blitz top, wood indicator top, or post pile).");
    }
  }
  // Drop card
  if (e.key.toLowerCase() === "q" && heldCardId && window.room) {
    console.log("Place key pressed. heldCardId:", heldCardId);
    var target = null; // { pileId, type, dist }
    function consider(id, type, x, y, radius) {
      var dx = localPos.x - x;
      var dy = localPos.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= radius && (!target || d < target.dist)) target = { pileId: id, type: type, dist: d };
    }
    if (gameState) {
      // Shared Dutch piles
      gameState.piles.forEach(function (pile, id) {
        if (pile.type === "dutch") consider(id, "dutch", pile.x, pile.y, 2.0);
      });
      var me = gameState.players.get(localPlayerId);
      if (me) {
        // Blitz pile - use stored pile position, not card position
        if (me.blitzPileX !== undefined && me.blitzPileY !== undefined) {
          consider("blitz_pile_" + localPlayerId, "blitz", me.blitzPileX, me.blitzPileY, 2.0);
        }
        // Post slots - use stored slot positions
        if (me.postSlotX && me.postSlotY) {
          for (var i = 0; i < Math.min(me.postSlotX.length, me.postSlotY.length); i++) {
            consider("post_slot_" + localPlayerId + "_" + i, "post", me.postSlotX[i], me.postSlotY[i], 2.0);
          }
        }
        // Wood indicator - use stored position
        if (me.woodIndicatorX !== undefined && me.woodIndicatorY !== undefined) {
          consider("wood_indicator_" + localPlayerId, "wood", me.woodIndicatorX, me.woodIndicatorY, 2.0);
        }
      }
    }
    if (target) {
      window.room.send("place", { pileId: target.pileId, type: target.type });
      console.log("Sent place with", target);
    } else {
      window.room.send("place", {});
      console.log("Sent place without explicit pileId");
    }
  }
});
window.addEventListener("keyup", function (e) {
  keys[e.key.toLowerCase()] = false;
});

function updateMovement(dt) {
  if (!localPlayerId) return;

  // WASD input
  var inputX = 0,
    inputY = 0;
  if (keys["w"]) inputY -= 1;
  if (keys["s"]) inputY += 1;
  if (keys["a"]) inputX -= 1;
  if (keys["d"]) inputX += 1;
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
  localVelocity.x *= 1 - friction;
  localVelocity.y *= 1 - friction;
  // Clamp speed
  var velMag = Math.sqrt(
    localVelocity.x * localVelocity.x + localVelocity.y * localVelocity.y
  );
  if (velMag > moveSpeed) {
    localVelocity.x = (localVelocity.x / velMag) * moveSpeed;
    localVelocity.y = (localVelocity.y / velMag) * moveSpeed;
  }
  // Move
  localPos.x += localVelocity.x;
  localPos.y += localVelocity.y;

  // Rotate local avatar to face input direction (supports diagonals)
  if (avatars[localPlayerId]) {
    if (mag > 0.001) {
      // Compute yaw so that W (0,-1) faces forward (0 deg), A (-1,0) = -90, S (0,1)=180, D (1,0)=90
      var yawRad = Math.atan2(inputX, -inputY);
      // Use atan2(x, z) where z derived from inputY (world z movement) for correct left/right
      // Direction vector: (inputX, inputY) corresponds to (worldX, worldZ)
      var yawRad = Math.atan2(inputX, inputY);
      var yawDeg = (yawRad * 180) / Math.PI + AVATAR_YAW_OFFSET_DEG;
      avatars[localPlayerId].setEulerAngles(0, yawDeg, 0);
    }
  }
  // Send movement to server
  if ((inputX !== 0 || inputY !== 0) && window.room) {
    window.room.send("move", { x: localPos.x, y: localPos.y });
  }
  // Update local avatar position for responsiveness
  if (avatars[localPlayerId]) {
    avatars[localPlayerId].setPosition(localPos.x, 1, localPos.y);
    // Camera follows avatar (3rd person) - adjusted for larger board
    var camOffset = { x: 0, y: 10, z: 22 }; // adjusted for larger board
    var targetPos = avatars[localPlayerId].getPosition();
    camera.setPosition(
      targetPos.x + camOffset.x,
      camOffset.y,
      targetPos.z + camOffset.z
    );
    camera.lookAt(targetPos.x, 1, targetPos.z);

    // Update held card position to follow avatar
    if (heldCardId && cards[heldCardId]) {
      cards[heldCardId].setPosition(localPos.x, 2, localPos.y + 0.7); // above avatar
    }

    // (Disabled) Automatic pickup removed: require explicit 'E' key press to pick up cards.

    // Visual feedback: highlight nearby Dutch pile when holding a card (only if gameState exists)
    if (heldCardId && gameState && gameState.piles && piles) {
      var nearestPileId = null;
      var nearestPileDist = 1.5;
      Object.keys(piles).forEach(function (id) {
        // Only consider Dutch piles for dropping
        if (id.startsWith("dutch_pile_")) {
          var pileEntity = piles[id];
          var pilePos = pileEntity.getPosition();
          var dx = localPos.x - pilePos.x;
          var dy = localPos.y - pilePos.z;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestPileDist) {
            nearestPileId = id;
            nearestPileDist = dist;
          }
        }
      });

      // Highlight the nearest Dutch pile
      Object.keys(piles).forEach(function (id) {
        if (id.startsWith("dutch_pile_")) {
          var material = piles[id].model.material;
          if (id === nearestPileId) {
            material.diffuse.set(0, 1, 0); // bright green when in range
          } else {
            // Restore original color based on pile contents
            var pile = null;
            if (
              gameState &&
              gameState.piles &&
              typeof gameState.piles.get === "function"
            ) {
              pile = gameState.piles.get(id);
            }

            if (pile && pile.cardStack && pile.cardStack.length > 0) {
              var topCardId = pile.cardStack[pile.cardStack.length - 1];
              if (
                gameState &&
                gameState.cards &&
                typeof gameState.cards.get === "function"
              ) {
                var topCard = gameState.cards.get(topCardId);
                if (topCard) {
                  if (topCard.color === "red")
                    material.diffuse.set(1, 0.3, 0.3);
                  else if (topCard.color === "green")
                    material.diffuse.set(0.3, 1, 0.3);
                  else if (topCard.color === "blue")
                    material.diffuse.set(0.3, 0.3, 1);
                  else if (topCard.color === "yellow")
                    material.diffuse.set(1, 1, 0.3);
                }
              }
            } else {
              material.diffuse.set(0.7, 0.7, 0.7); // empty pile color
            }
          }
        }
      });
    } else if (!heldCardId && gameState && gameState.piles && piles) {
      // Reset all Dutch piles to their normal colors when not holding a card
      Object.keys(piles).forEach(function (id) {
        if (id.startsWith("dutch_pile_")) {
          var material = piles[id].model.material;
          var pile = null;
          if (
            gameState &&
            gameState.piles &&
            typeof gameState.piles.get === "function"
          ) {
            pile = gameState.piles.get(id);
          }

          if (pile && pile.cardStack && pile.cardStack.length > 0) {
            var topCardId = pile.cardStack[pile.cardStack.length - 1];
            if (
              gameState &&
              gameState.cards &&
              typeof gameState.cards.get === "function"
            ) {
              var topCard = gameState.cards.get(topCardId);
              if (topCard) {
                if (topCard.color === "red") material.diffuse.set(1, 0.3, 0.3);
                else if (topCard.color === "green")
                  material.diffuse.set(0.3, 1, 0.3);
                else if (topCard.color === "blue")
                  material.diffuse.set(0.3, 0.3, 1);
                else if (topCard.color === "yellow")
                  material.diffuse.set(1, 1, 0.3);
              }
            }
          } else {
            material.diffuse.set(0.7, 0.7, 0.7); // empty pile color
          }
        }
      });
    }
  }
}

// Update loop is handled later with pile labels

// Colyseus state sync (requires colyseus-client.js loaded)
window.syncColyseusState = function (state) {
  // Store state globally for use in other functions
  gameState = state;

  console.log("syncColyseusState called. State:", state);

  // Defensive: check for expected properties
  if (!state) {
    console.warn("State is null or undefined");
    return;
  }
  if (!state.players || typeof state.players.get !== "function") {
    console.warn("State missing players Map:", state);
    return;
  }
  if (!state.cards || typeof state.cards.get !== "function") {
    console.warn("State missing cards Map:", state);
    return;
  }
  if (!state.piles || typeof state.piles.get !== "function") {
    console.warn("State missing piles Map:", state);
    return;
  }

  // Track held card
  heldCardId = null;
  if (
    localPlayerId &&
    state.players &&
    typeof state.players.get === "function"
  ) {
    const player = state.players.get(localPlayerId);
    if (player) {
      heldCardId = player.heldCard || null;
    }
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
  state.players.forEach(function (player, id) {
    if (!avatars[id]) {
      console.log("Creating avatar for player:", id, player);
      // Lazy-load GLB avatar once
      function createPrimitiveFallback() {
        var fallback = new pc.Entity();
        fallback.addComponent("model", { type: "capsule" });
        fallback.setLocalScale(1, 2, 1);
        app.root.addChild(fallback);
        return fallback;
      }
      function instantiateAvatar() {
        if (avatarAsset && avatarAsset.resource) {
          try {
            // PlayCanvas GLB container provides instantiateRenderEntity() for render components
            var containerRes = avatarAsset.resource; // ContainerResource
            var entity = containerRes.instantiateRenderEntity
              ? containerRes.instantiateRenderEntity()
              : containerRes.instantiate
              ? containerRes.instantiate()
              : null;
            if (!entity) {
              console.warn("Avatar container had no instantiate method");
              return createPrimitiveFallback();
            }
            entity.setLocalScale(1, 1, 1);
            app.root.addChild(entity);
            return entity;
          } catch (e) {
            console.warn("Failed to instantiate avatar GLB, using fallback", e);
            return createPrimitiveFallback();
          }
        }
        return createPrimitiveFallback();
      }
      if (!avatarAsset && !avatarAssetRequested) {
        avatarAssetRequested = true;
        app.assets.loadFromUrl(
          "assets/models/avatar.glb",
          "container",
          function (err, asset) {
            if (err) {
              console.warn(
                "Avatar GLB load failed, falling back to primitive.",
                err
              );
              return;
            }
            avatarAsset = asset;
            console.log(
              "Avatar GLB loaded successfully. Upgrading existing avatars."
            );
            // Replace existing primitive avatars with GLB instance
            Object.keys(avatars).forEach(function (pid) {
              var oldEnt = avatars[pid];
              if (oldEnt && oldEnt.parent) {
                oldEnt.destroy();
              }
              var newEnt = instantiateAvatar();
              avatars[pid] = newEnt;
              // Preserve position
              var playerState = state.players.get(pid);
              if (playerState)
                newEnt.setPosition(playerState.x, 1, playerState.y);
            });
          }
        );
      }
      var avatar = instantiateAvatar();
      avatars[id] = avatar;
    }
    // Only update other players' positions from server, not local player
    if (id !== localPlayerId) {
      // Track previous pos for remote direction facing
      var av = avatars[id];
      var prevX = av.__prevX;
      var prevZ = av.__prevZ;
      av.setPosition(player.x, 1, player.y);
      if (prevX !== undefined && prevZ !== undefined) {
        var dxr = player.x - prevX;
        var dzr = player.y - prevZ; // state.y maps to world z
        var magR = Math.sqrt(dxr * dxr + dzr * dzr);
        if (magR > 0.0005) {
          var yawRadR = Math.atan2(dxr, dzr);
          var yawDegR = (yawRadR * 180) / Math.PI + AVATAR_YAW_OFFSET_DEG;
          av.setEulerAngles(0, yawDegR, 0);
        }
      }
      av.__prevX = player.x;
      av.__prevZ = player.y;
    }
  });
  // Sync cards with face-up/face-down rendering
  state.cards.forEach(function (card, id) {
    if (!cards[id]) {
      console.log(
        "Creating card entity:",
        id,
        "Value:",
        card.value,
        "Color:",
        card.color,
        "FaceUp:",
        card.faceUp
      );
      var cardEntity = new pc.Entity();
      cardEntity.addComponent("model", { type: "box" });
      cardEntity.setLocalScale(2.4, 0.06, 3.3); // 50% bigger again for optimal visibility

      // Create materials using card textures
      var faceUpMaterial = createCardTextureMaterial(card.color, card.value);
      var faceDownMaterial = createCardBackMaterial();

      // Store both materials on the entity
      cardEntity.faceUpMaterial = faceUpMaterial;
      cardEntity.faceDownMaterial = faceDownMaterial;

      // Set initial material based on faceUp state
      cardEntity.model.material = card.faceUp
        ? faceUpMaterial
        : faceDownMaterial;

      app.root.addChild(cardEntity);
      cards[id] = cardEntity;
    }

    // Update material and value indicator visibility based on current faceUp state
    var cardEntity = cards[id];
    if (cardEntity.faceUpMaterial && cardEntity.faceDownMaterial) {
      cardEntity.model.material = card.faceUp
        ? cardEntity.faceUpMaterial
        : cardEntity.faceDownMaterial;
    }

    // If held by local player, always attach to current avatar position
    if (card.pickedUp && card.id === heldCardId && avatars[localPlayerId]) {
      var avatarPos = avatars[localPlayerId].getPosition();
      cards[id].setPosition(avatarPos.x, 2, avatarPos.z + 0.7); // above avatar
    } else {
      // Calculate proper stacking height
      var cardHeight = 0.5;
      // Hide non-top blitz cards for all players
      var ownerPlayer =
        gameState && gameState.players
          ? gameState.players.get(card.owner)
          : null;
      if (
        ownerPlayer &&
        ownerPlayer.blitzPile &&
        ownerPlayer.blitzPile.includes(card.id)
      ) {
        const idx = ownerPlayer.blitzPile.indexOf(card.id);
        const isTop = idx === ownerPlayer.blitzPile.length - 1;
        cards[id].enabled = isTop; // only show top
        if (isTop) {
          cards[id].setPosition(card.x, cardHeight, card.y);
        }
      } else if (
        ownerPlayer &&
  ownerPlayer.reserveCards &&
  ownerPlayer.reserveCards.includes(card.id)
      ) {
        // Hide reserve cards entirely (face-down deck)
        cards[id].enabled = false;
      } else if (
        ownerPlayer &&
        ownerPlayer.postPile &&
        ownerPlayer.postPile.includes(card.id)
      ) {
        // Show postPile cards (3 face-up personal slots) at their server positions
        cards[id].enabled = true;
        cards[id].setPosition(card.x, cardHeight, card.y);
      } else {
        // Non-blitz cards: keep simple small stacking for center dutch piles based on stack index
        let adjustedHeight = cardHeight;
        gameState.piles.forEach(function (pile) {
          if (pile.cardStack && pile.cardStack.includes(card.id)) {
            const stackIndex = pile.cardStack.indexOf(card.id);
            adjustedHeight = 0.5 + stackIndex * 0.05; // tight stack
          }
        });
        cards[id].enabled = true;
        cards[id].setPosition(card.x, adjustedHeight, card.y);
      }
    }
    console.log(
      "Card position:",
      id,
      card.x,
      card.y,
      "Value:",
      card.value,
      "Color:",
      card.color,
      "FaceUp:",
      card.faceUp
    );
  });
  // Sync piles with different types and visual indicators
  state.piles.forEach(function (pile, id) {
    if (!piles[id]) {
      console.log("Creating pile entity:", id, pile);
      var pileEntity = new pc.Entity();
      pileEntity.addComponent("model", { type: "cylinder" });
      pileEntity.setLocalScale(1.5, 0.5, 1.5); // larger and thicker

      // Set pile color based on type
      var pileMaterial = new pc.StandardMaterial();
      if (pile.type === "dutch") {
        pileMaterial.diffuse.set(0.7, 0.7, 0.7); // neutral gray for empty Dutch piles
      } else {
        pileMaterial.diffuse.set(0.5, 0.5, 0.5); // gray for personal piles
      }
      pileEntity.model.material = pileMaterial;

      // Removed 3D labelEntity previously placed atop Dutch piles.

      // Store pile info for HTML label creation
      pileEntity.pileType = pile.type;
      pileEntity.pileId = id;

      app.root.addChild(pileEntity);
      piles[id] = pileEntity;
    }

    // Update Dutch pile appearance (label entity removed)
    if (pile.type === "wood_indicator") {
      // Wood indicator placeholder color (teal)
      var mat = piles[id].model.material;
      mat.diffuse.set(0.1, 0.6, 0.6);
    } else if (pile.type === "dutch") {
      var material = piles[id].model.material;
      if (pile.cardStack && pile.cardStack.length > 0) {
        var topCardId = pile.cardStack[pile.cardStack.length - 1];
        var topCard = state.cards.get(topCardId);
        if (topCard) {
          if (topCard.color === "red") material.diffuse.set(1, 0.3, 0.3);
          else if (topCard.color === "green") material.diffuse.set(0.3, 1, 0.3);
          else if (topCard.color === "blue") material.diffuse.set(0.3, 0.3, 1);
          else if (topCard.color === "yellow") material.diffuse.set(1, 1, 0.3);
        }
      } else {
        material.diffuse.set(0.7, 0.7, 0.7);
      }
    }

    piles[id].setPosition(pile.x, 0.2, pile.y); // lower pile base for better card stacking visual
    console.log(
      "Pile position:",
      id,
      pile.x,
      pile.y,
      "Type:",
      pile.type,
      "Cards:",
      pile.cardStack.length
    );
  });
  console.log("Avatars:", avatars);
  console.log("Cards:", cards);
  console.log("Piles:", piles);

  // Update UI elements based on game state
  updateGameUI(state);

  // Update pile labels
  updatePileLabels();
};

// Variables for efficient label updating
var lastCameraPosition = { x: 0, y: 0, z: 0 };
var labelUpdateThreshold = 0.5; // Only update labels if camera moves this much

// Function to create and update HTML pile labels
function updatePileLabels() {
  // Check if camera has moved significantly
  var currentCameraPos = camera.getPosition();
  var cameraMoved =
    Math.abs(currentCameraPos.x - lastCameraPosition.x) >
      labelUpdateThreshold ||
    Math.abs(currentCameraPos.y - lastCameraPosition.y) >
      labelUpdateThreshold ||
    Math.abs(currentCameraPos.z - lastCameraPosition.z) > labelUpdateThreshold;

  if (!cameraMoved && document.querySelectorAll(".pile-label").length > 0) {
    return; // Skip update if camera hasn't moved much and labels exist
  }

  // Update last camera position
  lastCameraPosition = {
    x: currentCameraPos.x,
    y: currentCameraPos.y,
    z: currentCameraPos.z,
  };

  // Remove existing labels
  var existingLabels = document.querySelectorAll(".pile-label");
  existingLabels.forEach(function (label) {
    label.remove();
  });

  // Create new labels for each pile
  Object.keys(piles).forEach(function (pileId) {
    var pileEntity = piles[pileId];
    var position = pileEntity.getPosition();

    // Convert 3D position to screen coordinates
    var screenPos = camera.camera.worldToScreen(position);

    if (screenPos.z > 0) {
      // Only show if in front of camera
      var label = document.createElement("div");
      label.className = "pile-label";
      label.style.position = "absolute";
      label.style.left = screenPos.x + "px";
      label.style.top = screenPos.y - 40 + "px"; // Position higher above pile
      label.style.color = "white";
      label.style.fontFamily = "Arial, sans-serif";
      label.style.fontSize = "14px"; // Larger font for better visibility
      label.style.fontWeight = "bold";
      label.style.textShadow = "2px 2px 4px black"; // Stronger shadow
      label.style.pointerEvents = "none";
      label.style.zIndex = "1001";
      label.style.textAlign = "center";
      label.style.transform = "translateX(-50%)"; // Center horizontally
      label.style.backgroundColor = "rgba(0, 0, 0, 0.6)"; // Semi-transparent background
      label.style.padding = "2px 8px";
      label.style.borderRadius = "4px";

      // Determine label text based on pile type and ID
      var labelText = "";
      if (pileEntity.pileType === "dutch") {
        // Skip labels for center Dutch piles - they're obvious
        labelText = "";
      } else {
        // More descriptive labels for personal piles
        if (pileId.includes("blitz")) labelText = "BLITZ PILE";
        else if (pileId.includes("post")) labelText = "POST PILE";
        else if (
          pileId.includes("dutch_visible") ||
          pileId.includes("dutch_pile_visible")
        )
          labelText = "DUTCH CARDS";
        else if (pileId.includes("dutch")) labelText = "DUTCH CARDS";
        else labelText = "PILE"; // Show something for unrecognized piles
      }

      // Only create label if we have text
      if (labelText) {
        label.textContent = labelText;
        document.body.appendChild(label);
      }
    }
  });
}

// Call updatePileLabels every frame to keep labels positioned correctly
app.on("update", function (dt) {
  updateMovement(dt);
  if (Object.keys(piles).length > 0) {
    updatePileLabels();
  }
});

// Call updateGameUI immediately to show connection status
updateGameUI(null);

function updateGameUI(state) {
  // Get or create UI container
  var uiContainer = document.getElementById("game-ui");
  if (!uiContainer) {
    uiContainer = document.createElement("div");
    uiContainer.id = "game-ui";
    uiContainer.style.position = "absolute";
    uiContainer.style.top = "10px";
    uiContainer.style.left = "10px";
    uiContainer.style.color = "white";
    uiContainer.style.fontFamily = "Arial";
    uiContainer.style.fontSize = "16px";
    uiContainer.style.background = "rgba(0,0,0,0.7)";
    uiContainer.style.padding = "10px";
    uiContainer.style.borderRadius = "5px";
    uiContainer.style.zIndex = "1000";
    document.body.appendChild(uiContainer);
  }

  var html = "<h3>Dutch Blitz 3D</h3>";

  // Connection status
  if (!window.room) {
    html +=
      '<p style="color: red;"><strong>Status:</strong> Connecting to server...</p>';
    html += "<p>Make sure the Colyseus server is running on localhost:2567</p>";
    html += "<p>To start the server: <code>cd server && npm start</code></p>";
  } else if (!state) {
    html +=
      '<p style="color: yellow;"><strong>Status:</strong> Connected, waiting for game state...</p>';
  } else {
    html +=
      '<p style="color: green;"><strong>Status:</strong> ' +
      (state.gameStatus || "waiting") +
      "</p>";
  }

  if (state && state.gameStatus === "playing") {
    html += "<h4>Controls:</h4>";
    html += "<p>WASD - Move around<br>";
    html += "E - Pick up card / place into Post slot / play to Dutch pile<br>";
    html +=
      "Q - Place card (Dutch / Wood / Post or return to Blitz if no valid placement)<br>";
    html += "R - Draw from Wood pile into empty Post slots</p>";

    html += "<h4>How to Play:</h4>";
    html += "<p>• Build sequences 1→10 on colored piles<br>";
    html += "• Any color can start a pile<br>";
    html += "• Cards show size = value<br>";
    html += "• First to empty Blitz pile wins!</p>";

    // Show player's pile counts if available
    if (
      localPlayerId &&
      state.players &&
      typeof state.players.get === "function"
    ) {
      const player = state.players.get(localPlayerId);
      if (player) {
        html += "<h4>Your Piles:</h4>";
        html +=
          "<p>Blitz: " +
          (player.blitzPile ? player.blitzPile.length : 0) +
          "<br>";
        html +=
          "Reserve: " + (player.reserveCards ? player.reserveCards.length : 0) + "<br>";
        html +=
          "Post Slots: " +
          (player.postPile
            ? player.postPile.filter((c) => c !== "" && c != null).length
            : 0) +
          "/3 filled<br>";
        html +=
          "Wood: " + (player.woodPile ? player.woodPile.length : 0) + "<br>";
        html += "Score: " + (player.score || 0) + "</p>";

        if (player.blitzPile && player.blitzPile.length === 0) {
          html += '<p style="color: gold;"><strong>You can win!</strong></p>';
        }
      }
    }
  } else if (state && state.gameStatus === "finished") {
    html +=
      "<p><strong>Winner:</strong> Player " +
      (state.winner || "unknown") +
      "</p>";

    // Show final scores
    html += "<h4>Final Scores:</h4>";
    if (state.players && typeof state.players.forEach === "function") {
      state.players.forEach(function (player, playerId) {
        const isWinner = playerId === state.winner;
        const scoreColor = isWinner ? "gold" : "white";
        html +=
          '<p style="color: ' +
          scoreColor +
          ';">' +
          (isWinner ? "👑 " : "") +
          "Player " +
          playerId.substring(0, 6) +
          ": " +
          (player.score || 0) +
          " points</p>";
      });
    }

    html += "<p>Press T to restart</p>";
  } else if (state) {
    html += "<p>Waiting for players... Need 2+ to start</p>";
  }

  uiContainer.innerHTML = html;
}
