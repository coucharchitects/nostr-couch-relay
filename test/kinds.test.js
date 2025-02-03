// test/kinds.test.js
import { describe, it, expect } from 'vitest';

describe("Kinds & Event Handling", () => {
  it("should validate that kind:0 events contain valid user metadata", () => {
    // For kind: 0 events the content should be a JSON object with name, about, and picture
    const event = {
      kind: 0,
      content: JSON.stringify({
        name: "Alice",
        about: "Blockchain enthusiast",
        picture: "https://example.com/avatar.png"
      })
    };
    let contentObj;
    expect(() => { contentObj = JSON.parse(event.content); }).not.toThrow();
    expect(contentObj).toHaveProperty("name");
    expect(contentObj).toHaveProperty("about");
    expect(contentObj).toHaveProperty("picture");
  });

  it("should overwrite replaceable events for the same pubkey", () => {
    // Simulate an event store that replaces events based on pubkey and kind (e.g., kinds 0, 3, 10000-19999)
    const store = {};
    function storeEvent(event) {
      const key = `${event.pubkey}-${event.kind}`;
      store[key] = event;
    }

    const pubkey = "d".repeat(64);
    const event1 = {
      pubkey,
      kind: 3, // replaceable
      content: "Old content"
    };
    const event2 = {
      pubkey,
      kind: 3,
      content: "New content"
    };

    storeEvent(event1);
    expect(store[`${pubkey}-3`].content).toBe("Old content");

    storeEvent(event2);
    expect(store[`${pubkey}-3`].content).toBe("New content");
  });

  it("should not store ephemeral events", () => {
    // Ephemeral events (kind 20000-29999) should not be stored
    const store = {};
    function storeEvent(event) {
      if (event.kind >= 20000 && event.kind < 30000) return;
      const key = `${event.pubkey}-${event.kind}`;
      store[key] = event;
    }

    const event = {
      pubkey: "e".repeat(64),
      kind: 25000,
      content: "Ephemeral content"
    };

    storeEvent(event);
    expect(Object.keys(store)).toHaveLength(0);
  });

  it("should correctly reference addressable events", () => {
    // For addressable events (kind 30000-39999) simulate generation of an address.
    const event = {
      pubkey: "f".repeat(64),
      kind: 35000,
      content: "Addressable event content"
    };

    function getEventAddress(event) {
      // For demonstration, compute an address as the sha256 hash of (pubkey + kind + content)
      const data = event.pubkey + event.kind + event.content;
      const crypto = require("crypto");
      return crypto.createHash("sha256").update(data).digest("hex");
    }

    const address = getEventAddress(event);
    expect(typeof address).toBe("string");
    expect(address).toHaveLength(64);
  });
});
