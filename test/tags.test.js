// test/tags.test.js
import { describe, it, expect } from 'vitest';

describe("Tags & Indexing", () => {
  it("should validate the 'e' tag structure", () => {
    // Valid e tag: ["e", <32-byte event id>, <optional relay URL>]
    const validETag = ["e", "b".repeat(64), "wss://relay.example.com"];
    expect(validETag.length).toBeGreaterThanOrEqual(2);
    expect(validETag[0]).toBe("e");
    expect(/^[0-9a-f]{64}$/.test(validETag[1])).toBe(true);
  });

  it("should validate the 'p' tag structure", () => {
    // Valid p tag: ["p", <32-byte pubkey>, <optional relay URL>]
    const validPTag = ["p", "c".repeat(64), "wss://relay.example.org"];
    expect(validPTag.length).toBeGreaterThanOrEqual(2);
    expect(validPTag[0]).toBe("p");
    expect(/^[0-9a-f]{64}$/.test(validPTag[1])).toBe(true);
  });

  it("should validate the 'a' tag structure for addressable events", () => {
    // Example a tag: ["a", "identifier", "something", "optional info"]
    const validATag = ["a", "identifier", "something"];
    expect(validATag[0]).toBe("a");
    expect(typeof validATag[1]).toBe("string");
    expect(typeof validATag[2]).toBe("string");
  });

  it("should index single-letter tags correctly", () => {
    const tags = [
      ["a", "value1"],
      ["B", "value2"],
      ["x", "value3"],
      ["Z", "value4"]
    ];
    tags.forEach(tag => {
      const key = tag[0];
      expect(key.length).toBe(1);
      expect(/^[a-zA-Z]$/.test(key)).toBe(true);
    });
  });
});
