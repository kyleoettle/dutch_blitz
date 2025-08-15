console.log('colyseus-client.js loaded');
// Colyseus client basic setup (browser global)
var client = new Colyseus.Client('ws://localhost:2567');
window.room = null;

client.joinOrCreate('my_room').then(function(room) {
  window.room = room;
  room.onStateChange(function(state) {
    if (window.syncColyseusState) {
      window.syncColyseusState(state);
    }
    console.log('State updated:', state);
  });
  room.onMessage(function(message) {
    console.log('Message from server:', message);
  });
}).catch(function(e) {
  console.error('Failed to join room:', e);
});
