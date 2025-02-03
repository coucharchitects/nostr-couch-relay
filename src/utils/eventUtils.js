// src/eventUtils.js
import { sha256 } from "@noble/hashes/sha256";
import { utils as secpUtils } from "@noble/secp256k1";
import {schnorr} from '@noble/curves/secp256k1';

/**
 * Serializes an event as a JSON array.
 * The event is represented as:
 * [0, pubkey, created_at, kind, tags, content]
 */
export function serializeEvent(event) {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

/**
 * Computes the event ID as the sha256 hash of the serialized event.
 */
export function computeEventId(event) {
  const serialized = serializeEvent(event);
  const hash = sha256(new TextEncoder().encode(serialized));
  return Buffer.from(hash).toString("hex");
}

/**
 * Validates the event structure:
 * - Required fields are present.
 * - pubkey is a valid 32-byte (64-hex-character) lowercase string.
 * - created_at is a positive UNIX timestamp.
 * - kind is an integer (0–65535).
 * - tags is an array of arrays of strings.
 * - id matches the sha256(serialized event)
 * - sig is a valid Schnorr signature over the event id.
 */
export function validateEvent(event) {
  try {
    if (
      !event.pubkey ||
      !event.created_at ||
      event.kind === undefined ||
      !Array.isArray(event.tags) ||
      typeof event.content !== "string" ||
      !event.sig ||
      !event.id
    ) {
      return false;
    }
    // Validate pubkey: 64 lowercase hex characters
    if (!/^[0-9a-f]{64}$/.test(event.pubkey)) {
      return false;
    }
    // Validate created_at as a positive number
    if (typeof event.created_at !== "number" || event.created_at <= 0) {
      return false;
    }
    // Validate kind field
    if (!Number.isInteger(event.kind) || event.kind < 0 || event.kind > 65535) {
      return false;
    }
    // Validate tags: each tag should be an array of strings
    if (!event.tags.every(tag => Array.isArray(tag) && tag.every(t => typeof t === "string"))) {
      return false;
    }
    // Check that the computed id matches the event.id
    const computedId = computeEventId(event);
    if (event.id !== computedId) {
      return false;
    }
    // Validate the signature using Schnorr verification.
    // Convert the event id (hex) to bytes.
    const messageBytes = Buffer.from(event.id, "hex");
    return schnorr.verify(event.sig, messageBytes, event.pubkey);
  } catch (e) {
    return false;
  }
}
