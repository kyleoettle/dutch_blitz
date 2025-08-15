// Colyseus client basic setup
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');
let room;

async function joinRoom() {
  room = await client.joinOrCreate('game_room');
  room.onStateChange((state) => {
    // Sync player, card, pile states
  });
  room.onMessage((message) => {
    // Handle server messages
  });
}

joinRoom();
