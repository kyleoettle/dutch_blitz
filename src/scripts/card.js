// Card entity logic for Dutch Blitz 3D
// This file contains helper functions for card visualization and behavior

// Create a card entity with proper materials and value indicators
function createCardEntity(cardData) {
    var cardEntity = new pc.Entity();
    cardEntity.addComponent('model', { type: 'box' });
    cardEntity.setLocalScale(0.8, 0.15, 1.2);
    
    // Create face-up material (bright colors)
    var faceUpMaterial = new pc.StandardMaterial();
    if (cardData.color === 'red') faceUpMaterial.diffuse.set(1, 0.2, 0.2);
    else if (cardData.color === 'green') faceUpMaterial.diffuse.set(0.2, 1, 0.2);
    else if (cardData.color === 'blue') faceUpMaterial.diffuse.set(0.2, 0.2, 1);
    else if (cardData.color === 'yellow') faceUpMaterial.diffuse.set(1, 1, 0.2);
    else faceUpMaterial.diffuse.set(0.5, 0.5, 0.5);
    faceUpMaterial.emissive.set(0.1, 0.1, 0.1);
    
    // Create face-down material (card back)
    var faceDownMaterial = new pc.StandardMaterial();
    faceDownMaterial.diffuse.set(0.3, 0.2, 0.1); // brown card back
    
    // Store materials
    cardEntity.faceUpMaterial = faceUpMaterial;
    cardEntity.faceDownMaterial = faceDownMaterial;
    
    // Add value indicator (small sphere)
    var valueIndicator = new pc.Entity();
    valueIndicator.addComponent('model', { type: 'sphere' });
    var indicatorMaterial = new pc.StandardMaterial();
    indicatorMaterial.diffuse.set(1, 1, 1);
    indicatorMaterial.emissive.set(0.2, 0.2, 0.2);
    valueIndicator.model.material = indicatorMaterial;
    valueIndicator.setLocalPosition(0, 0.1, 0);
    cardEntity.addChild(valueIndicator);
    cardEntity.valueIndicator = valueIndicator;
    
    return cardEntity;
}

// Update card appearance based on state
function updateCardAppearance(cardEntity, cardData) {
    // Set material based on face-up state
    cardEntity.model.material = cardData.faceUp ? 
        cardEntity.faceUpMaterial : cardEntity.faceDownMaterial;
    
    // Show/hide and scale value indicator
    if (cardEntity.valueIndicator) {
        cardEntity.valueIndicator.enabled = cardData.faceUp;
        if (cardData.faceUp) {
            var scale = 0.05 + (cardData.value * 0.02);
            cardEntity.valueIndicator.setLocalScale(scale, 0.05, scale);
        }
    }
}

// Check if a card can be picked up based on Dutch Blitz rules
function canPickupCard(cardData, playerData) {
    if (!cardData.faceUp) return false;
    if (cardData.pickedUp) return false;
    if (cardData.owner !== playerData.sessionId) return false;
    // Top Blitz card always eligible
    var isTopOfBlitz = playerData.blitzPile.length > 0 && 
        playerData.blitzPile[playerData.blitzPile.length - 1] === cardData.id;
    if (isTopOfBlitz) return true;
    // Wood indicator: represented by overlapping face-up cards NOT in blitz/dutch piles; client cannot easily know stack except by z-order; rely on server for enforcement and allow attempt only if card is faceUp and not in blitzPile/dutchPile lists
    // To reduce false positives, disallow if card appears in dutchPile array at any position (legacy) or deeper in blitz pile.
    if (playerData.dutchPile && playerData.dutchPile.includes(cardData.id)) return false;
    return false; // server now handles wood indicator pickup; client will send pickup on keypress based on proximity logic
}

// Check if a card can be placed on a Dutch pile
function canPlaceOnPile(cardData, pileData) {
    if (pileData.type !== "dutch") return false;
    
    // Empty pile needs a "1"
    if (pileData.cardStack.length === 0) {
        return cardData.value === 1;
    }
    
    // Non-empty pile needs next in sequence
    // Note: This would need access to the top card data
    return true; // Server will validate
}

// Get visual distance between two 3D positions
function getDistance(pos1, pos2) {
    var dx = pos1.x - pos2.x;
    var dy = pos1.y - pos2.y;
    var dz = pos1.z - pos2.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// Dutch Blitz card colors
var CARD_COLORS = ['red', 'green', 'blue', 'yellow'];
var CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Export functions if using modules (not needed for current setup)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createCardEntity,
        updateCardAppearance,
        canPickupCard,
        canPlaceOnPile,
        getDistance,
        CARD_COLORS,
        CARD_VALUES
    };
}
