// test/eventValidation.test.js
import {describe, it, expect} from 'vitest';
import {sha256} from '@noble/hashes/sha256';
import {serializeEvent, computeEventId, validateEvent, generateNewEvent} from '../src/utils/eventUtils';
import {getPublicKey, utils as secpUtils} from '@noble/secp256k1';
import {schnorr} from '@noble/curves/secp256k1';

describe("Event Validation", () => {
  it("should correctly compute the event ID", () => {
    const event = {
      pubkey: "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca",
      created_at: 1700000000,
      kind: 1,
      tags: [],
      content: "Hello world",
    };

    const serialized = serializeEvent(event);
    const expectedId = Buffer.from(sha256(new TextEncoder().encode(serialized))).toString("hex");
    const computedId = computeEventId(event);
    expect(computedId).toBe(expectedId);
  });

  it("should validate an event with a correct Schnorr signature", async () => {
    const event = await generateNewEvent({})

    expect(validateEvent(event)).toBe(true);
  });

  it("should fail validation for an event with an invalid pubkey", () => {
    const event = {
      pubkey: "INVALIDPUBKEY",
      created_at: 1700000000,
      kind: 1,
      tags: [],
      content: "Hello world",
      id: "dummy",
      sig: "dummy"
    };
    expect(validateEvent(event)).toBe(false);
  });

  it("should fail validation for an event with an invalid created_at timestamp", () => {
    const event = {
      pubkey: "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca",
      created_at: -100,
      kind: 1,
      tags: [],
      content: "Hello world",
      id: "dummy",
      sig: "dummy"
    };
    expect(validateEvent(event)).toBe(false);
  });
});
