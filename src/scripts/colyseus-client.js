console.log('colyseus-client.js loaded');
// Colyseus client basic setup (browser global)
var client = new Colyseus.Client('ws://localhost:2567');
window.room = null;

console.log('Attempting to connect to Colyseus server...');
client.joinOrCreate('my_room').then(function(room) {
  console.log('Successfully joined room:', room.id);
  window.room = room;
  
  room.onStateChange(function(state) {
    console.log('State updated:', state);
    if (window.syncColyseusState) {
      window.syncColyseusState(state);
    }
  });
  
  room.onMessage('*', function(type, message) {
    console.log('Message from server [' + type + ']:', message);
  });
  
  room.onError(function(code, message) {
    console.error('Room error:', code, message);
  });
  
  room.onLeave(function(code) {
    console.log('Left room with code:', code);
  });
  
}).catch(function(e) {
  console.error('Failed to join room:', e);
  console.error('Error details:', e.message);
  console.error('Make sure the Colyseus server is running on localhost:2567');
});
