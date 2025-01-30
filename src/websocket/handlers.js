import {validateEvent, verifySignature} from 'nostr-tools';
import {insertEvent, getEvent} from '../db/index.js';
import {buildFilterQuery} from '../utils/queryBuilder.js';
import {broadcastEvent} from './broadcaster.js';

export async function handleEvent(ws, event) {
  // Validate event format
  if (!validateEvent(event)) {
    ws.send(JSON.stringify(["NOTICE", "Invalid event format"]));
    return;
  }

  // Verify signature
  if (!verifySignature(event)) {
    ws.send(JSON.stringify(["NOTICE", "Invalid signature"]));
    return;
  }

  try {
    // Store event in CouchDB
    const result = await insertEvent({
      _id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: event.sig
    });

    if (result.success) {
      // Send OK message back to client
      ws.send(JSON.stringify(["OK", event.id, true, ""]));

      // Broadcast to subscribers
      broadcastEvent(event);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error storing event:', error);
    ws.send(JSON.stringify(["OK", event.id, false, "Error storing event"]));
  }
}

export async function handleSubscription(ws, subId, filters, subscriptions) {
  console.log('Querying subscriptions:', subId, filters, subscriptions);
  // Store subscription
  if (!subscriptions.has(subId)) {
    subscriptions.set(subId, new Set());
  }
  subscriptions.get(subId).add(ws);

  // Query existing events that match filters
  try {
    const query = buildFilterQuery(filters);
    const events = [];

    for (const filter of query.filters) {
      const results = await getEvent(filter.pubkey, filter.id).catch(() => []);
      if (results) {
        events.push(...results);
      }
    }

    // Send matching events to subscriber
    for (const event of events) {
      const formattedEvent = {
        ...event,
        tags: event.tags
      };
      ws.send(JSON.stringify(["EVENT", subId, formattedEvent]));
    }
  } catch (error) {
    console.error('Error querying events:', error);
    ws.send(JSON.stringify(["NOTICE", "Error processing subscription"]));
  }
}

export function handleClose(ws, subId, subscriptions) {
  if (subscriptions.has(subId)) {
    subscriptions.get(subId).delete(ws);
    if (subscriptions.get(subId).size === 0) {
      subscriptions.delete(subId);
    }
  }
}
