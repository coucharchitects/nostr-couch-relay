import {validateEvent, verifySignature} from 'nostr-tools';
import {insertEvent, getEvent, findEvents} from '../db/index.js';
import {buildFilterQuery, compileMatcher} from '../utils/queryBuilder.js';
import {broadcastEvent} from './broadcaster.js';
import {renameCouchMetadata} from "../utils/eventUtils.js";

export async function handleEvent(ws, event) {
  // Validate event format
  if (!validateEvent(event)) {
    console.log('Invalid event format', JSON.stringify(event))
    ws.send(JSON.stringify(["NOTICE", "Invalid event format"]));
    return;
  }

  // Verify signature
  if (!verifySignature(event)) {
    console.log('Invalid signature')
    ws.send(JSON.stringify(["NOTICE", "Invalid signature"]));
    return;
  }

  try {
    // Store event in CouchDB
    // should the keys be whitelisted or is it ok to go ahead and just push everything?
    const result = await insertEvent({
      id: event.id,
      pubkey: event.pubkey,
      created_at: event.created_at,
      kind: event.kind,
      tags: event.tags,
      content: event.content,
      sig: event.sig
    });

    if (result.success) {
      // console.log('Successful insert of event, sending OK', result)
      // Send OK message back to client
      ws.send(JSON.stringify(["OK", event.id, true, ""]));

      // Broadcast to subscribers
      // not anymore since all broadcasts are now behind the couch changes feed
      // broadcastEvent(event);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error storing event:', error);
    ws.send(JSON.stringify(["OK", event.id, false, "Error storing event"]));
  }
}

/**
 * Handles a new subscription request from a client.
 *
 * Stores the subscription (including the filters and a pre-compiled matcher)
 * in the `subscriptions` map, then queries CouchDB for existing matching events,
 * sending them to the client.
 *
 * @param {WebSocket} ws - The client WebSocket connection.
 * @param {string} subId - The subscription ID.
 * @param {Object} filters - The filters to apply.
 * @param {Map} subscriptions - A map of subscription IDs to subscription objects.
 */
export async function handleSubscription(ws, subId, filters, subscriptions) {
  // Start with the transformed Mango query
  const query = buildFilterQuery(filters);
  // Store subscription as websocket connections to clients
  // Check if the subscription already exists. If not, create it.
  let subscription;
  if (!subscriptions.has(subId)) {
    // Build the Mango query and compile a matcher function.
    const matcher = compileMatcher(query);

    subscription = {
      filters,
      matcher,
      subscribers: new Set()
    };
    subscriptions.set(subId, subscription);
  } else {
    subscription = subscriptions.get(subId);
  }

  // Add this websocket connection to the subscription's subscribers.
  subscription.subscribers.add(ws);

  // Query existing events that match filters
  // should persist parameters to check against them on _changes feed update
  try {
    // Run query against CouchDB backend
    const events = await findEvents(query)

    if (events.docs.length) {
      // Send matching events to subscriber
      const processedDocs = renameCouchMetadata(events.docs)
      console.log('Sending events', processedDocs)
      for (const event of processedDocs) {
        const formattedEvent = {
          ...event,
          tags: event.tags
        };
        ws.send(JSON.stringify(["EVENT", subId, formattedEvent]));
      }
      ws.send(JSON.stringify(["EOSE", subId]));
    } else {
      ws.send(JSON.stringify(["NOTICE", "No events found"]));
    }
  } catch (error) {
    console.error('Error querying events:', error);
    ws.send(JSON.stringify(["NOTICE", "Error processing subscription"]));
  }
}

/**
 * Handles closing a specific subscription for a given WebSocket connection.
 *
 * This function removes the WebSocket from the subscription's subscribers set.
 * If no subscribers remain after removal, the entire subscription is deleted
 * from the subscriptions map. Finally, a "CLOSED" message is sent to the client.
 *
 * @param {WebSocket} ws - The WebSocket connection that is closing the subscription.
 * @param {string} subId - The subscription ID to be closed.
 * @param {Map<string, Object>} subscriptions - A map where each key is a subscription ID
 *   and the value is an object with a `subscribers` property (a Set of WebSocket connections).
 */
export function handleClose(ws, subId, subscriptions) {
  if (subscriptions.has(subId)) {
    const subscription = subscriptions.get(subId);
    subscription.subscribers.delete(ws);
    if (subscription.subscribers.size === 0) {
      subscriptions.delete(subId);
    }
    ws.send(JSON.stringify(["CLOSED", subId]));
  }
}
