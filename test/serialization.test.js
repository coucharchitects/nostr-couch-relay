// test/serialization.test.js
import { describe, it, expect } from 'vitest';
import { serializeEvent, computeEventId } from '../src/utils/eventUtils';
import { sha256 } from '@noble/hashes/sha256';

describe("Serialization & Hashing Compliance", () => {
  it("should serialize the event as a valid JSON string in UTF-8", () => {
    const event = {
      pubkey: "a".repeat(64),
      created_at: 1700000000,
      kind: 1,
      tags: [["tag1", "value1"]],
      content: "Hello \n world \"test\" \\ example"
    };
    const serialized = serializeEvent(event);
    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(typeof serialized).toBe("string");
  });

  it("should correctly escape special characters in content", () => {
    const event = {
      pubkey: "a".repeat(64),
      created_at: 1700000000,
      kind: 1,
      tags: [],
      content: "Line1\nLine2\tTabbed\"Quote\"\\Backslash"
    };
    const serialized = serializeEvent(event);
    expect(serialized).toContain("\\n");
    expect(serialized).toContain("\\t");
    expect(serialized).toContain('\\"');
    expect(serialized).toContain("\\\\");
  });

  it("should compute the event id as the sha256 of the serialized event", () => {
    const event = {
      pubkey: "a".repeat(64),
      created_at: 1700000000,
      kind: 1,
      tags: [],
      content: "Test event"
    };
    const serialized = serializeEvent(event);
    const expectedId = Buffer.from(sha256(new TextEncoder().encode(serialized))).toString("hex");
    const computedId = computeEventId(event);
    expect(computedId).toBe(expectedId);
  });
});
