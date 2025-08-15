// PlayCanvas basic setup
var app = new pc.Application(document.body, {});
app.start();

// Create camera
var camera = new pc.Entity();
camera.addComponent('camera', {
    clearColor: new pc.Color(0.4, 0.6, 0.8)
});
camera.setPosition(0, 10, 20);
camera.lookAt(0, 0, 0);
app.root.addChild(camera);

// Create ground
var ground = new pc.Entity();
ground.addComponent('model', {
    type: 'box'
});
ground.setLocalScale(20, 0.5, 20);
ground.setPosition(0, -0.25, 0);
app.root.addChild(ground);

// TODO: Add player, cards, piles, Colyseus client integration
