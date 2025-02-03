// test/relayCommunication.test.js
import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

// Use the already running relay server URL.
const serverUrl = "ws://localhost:8080";

describe("Client-Relay Communication", () => {
  it("should successfully open a connection to the server", async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl);

      ws.on("open", () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        resolve();
      });

      ws.on("error", (err) => {
        reject(err);
      });
    });
  });

  it("should receive an OK response when sending an EVENT message", async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl);

      ws.on("open", () => {
        // Create a dummy event with a known id.
        // Your relay must be configured to accept and respond to such events.
        const event = { id: "eventid123", content: "test" };
        ws.send(JSON.stringify(["EVENT", event]));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message[0] === "OK") {
          expect(message[1]).toBe("eventid123");
          expect(message[2]).toBe(true);
          expect(message[3]).toBe("Event accepted");
          ws.close();
          resolve();
        }
      });

      ws.on("error", (err) => {
        reject(err);
      });
    });
  });

  it("should handle REQ messages with valid filters", async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl);
      const subId = "subscription1";
      let receivedEvent = false;

      ws.on("open", () => {
        const filters = { kinds: [0], authors: ["pubkey"] };
        ws.send(JSON.stringify(["REQ", subId, filters]));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message[0] === "EVENT") {
          expect(message[1]).toBe(subId);
          expect(message[2]).toHaveProperty("id");
          receivedEvent = true;
        } else if (message[0] === "EOSE") {
          expect(message[1]).toBe(subId);
          expect(receivedEvent).toBe(true);
          ws.close();
          resolve();
        }
      });

      ws.on("error", (err) => {
        reject(err);
      });
    });
  });

  it("should correctly terminate subscriptions on CLOSE messages", async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl);
      const subId = "subscription2";

      ws.on("open", () => {
        ws.send(JSON.stringify(["REQ", subId, {}]));
        ws.send(JSON.stringify(["CLOSE", subId]));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message[0] === "CLOSED") {
          expect(message[1]).toBe("Subscription closed");
        }
      });

      ws.on("close", () => {
        resolve();
      });

      ws.on("error", (err) => {
        reject(err);
      });
    });
  });
});
