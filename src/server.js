import {WebSocketServer} from 'ws';
import http from 'http';
import { handleEvent, handleSubscription, handleClose } from './websocket/handlers.js';
import { subscriptions, broadcastEvent } from './websocket/broadcaster.js';
import { startChangesFeedListener } from './db/index.js';

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
          console.log('EVENT', params)
          await handleEvent(ws, params[0]);
          break;
        case 'REQ':
          console.log('REQ', params)
          await handleSubscription(ws, params[0], params[1], subscriptions);
          break;
        case 'CLOSE':
          console.log('CLOSE', params)
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
    // Clean up subscriptions when the client disconnects.
    for (const [subId, subscription] of subscriptions.entries()) {
      if (subscription.subscribers.has(ws)) {
        subscription.subscribers.delete(ws);
        // If there are no more subscribers for this subscription, remove it entirely.
        if (subscription.subscribers.size === 0) {
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

  // Start listening to DB changes and broadcast each updated document.
  startChangesFeedListener((doc) => {
    // the doc should be transformed using eventUtils.renameCouchMetadata
    // instead of "id" there's "_id" from the couch doc
    broadcastEvent(doc);
  });
});
