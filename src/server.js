import {WebSocketServer} from 'ws';
import http from 'http';
import { handleEvent, handleSubscription, handleClose } from './websocket/handlers.js';
import { subscriptions } from './websocket/broadcaster.js';

// Create HTTP server
const server = http.createServer();

// Initialize WebSocket server with HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const [type, ...params] = JSON.parse(message);

      switch (type) {
        case 'EVENT':
          handleEvent(ws, params[0]);
          break;
        case 'REQ':
          handleSubscription(ws, params[0], params[1], subscriptions);
          break;
        case 'CLOSE':
          handleClose(ws, params[0], subscriptions);
          break;
        default:
          ws.send(JSON.stringify(["NOTICE", "Unknown message type"]));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify(["NOTICE", "Error processing message"]));
    }
  });

  ws.on('close', () => {
    // Clean up subscriptions when client disconnects
    for (const [subId, subs] of subscriptions.entries()) {
      if (subs.has(ws)) {
        subs.delete(ws);
        if (subs.size === 0) {
          subscriptions.delete(subId);
        }
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`NOSTR relay server running on ws://localhost:${PORT}`);
});
