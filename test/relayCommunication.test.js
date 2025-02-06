// test/relayCommunication.test.js
import {describe, it, expect} from 'vitest';
import WebSocket from 'ws';
import {insertEvent} from '../src/db/index.js';
import {utils as secpUtils} from "@noble/secp256k1";
import {schnorr} from "@noble/curves/secp256k1";
import {computeEventId, generateNewEvent} from "../src/utils/eventUtils.js";

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
      let createdEventId = null

      ws.on("open", async () => {
        // Create a dummy event and store id.
        const event = await generateNewEvent({content: 'Dummy'})
        createdEventId = event.id
        // console.log('Sending event', event)

        ws.send(JSON.stringify(["EVENT", event]));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message[0] === "OK") {
          expect(message[1]).toBe(createdEventId);
          expect(message[2]).toBe(true);
          expect(message[3]).toBe('');
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
      let filters = {}

      ws.on("open", async () => {
        // first add the test event
        const event = await generateNewEvent({content: 'Test for reply'});
        ws.send(JSON.stringify(["EVENT", event]));

        filters = {kinds: [event.kind], authors: [event.pubkey]};
        // filters will be sent on successful event insert
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        // console.log('Got message', message)
        // first ok is from message insert
        if (message[0] === 'OK') {
          ws.send(JSON.stringify(["REQ", subId, filters]));
        } else if (message[0] === "EVENT") {
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
        console.log('Message from relay', message)
        if (message[0] === "CLOSED") {
          expect(message[1]).toBe(subId);
          ws.close()
          resolve()
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

  it("should establish a connection and receive newly added events that match a filter", async () => {
    await new Promise(async (resolve, reject) => {
      const ws = new WebSocket(serverUrl);
      const subId = "subscription7";
      const filters  = {kinds: [1], authors: [/* will be set after event is created */]};
      const event = await generateNewEvent({content: 'Replicated later1'});

      ws.on("open", async () => {
        filters.authors[0] = event.pubkey
        console.log('Start subscription using filters', filters)
        ws.send(JSON.stringify(["REQ", subId, filters]));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        // should get the empty list at first
        console.log('Message from relay', message)
        if ((message[0] === "NOTICE") && (message[1] === "No events found")) {
          // continue with the insert of the event
          console.log('Sending event', event)
          ws.send(JSON.stringify(["EVENT", event]));
        }

        if (message[0] === "EVENT") {
          expect(message[1]).toBe(subId);
          resolve()
        }
/*
        console.log('Message from relay', message)
        if (message[0] === "CLOSED") {
          expect(message[1]).toBe(subId);
          ws.close()
          resolve()
        }
*/
      });
    })
  })

  it("should not receive events to which it is not subscribed", async () => {
    await new Promise(async (resolve, reject) => {
      const ws = new WebSocket(serverUrl);
      const subId = "subscription8";
      const filters  = {kinds: [2], authors: [/* will be set after event is created */]};
      const event = await generateNewEvent({content: 'Replicated later'});
      let receivedEvent = false;

      ws.on("open", async () => {
        filters.authors[0] = event.pubkey
        console.log('Start subscription using filters', filters)
        ws.send(JSON.stringify(["REQ", subId, filters]));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        // should get the empty list at first
        console.log('Message from relay', message)
        if ((message[0] === "NOTICE") && (message[1] === "No events found")) {
          // continue with the insert of the event
          console.log('Sending event', event)
          ws.send(JSON.stringify(["EVENT", event]));
        }

        if (message[0] === "EVENT") {
          if (message[1] === subId) {
            receivedEvent = true
          }
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify that no EVENT message was received.
      expect(receivedEvent).toBe(false);
      resolve()
    })
  })
});
