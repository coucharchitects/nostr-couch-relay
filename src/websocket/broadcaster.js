// Store subscriptions
// in a Map whose key is the subscription ID and whose value is an object of the form

/*
  Subscriptions structure
  {
    filters: Object,        // Original filter parameters.
    matcher: Function,      // Pre-compiled matching function.
    subscribers: Set<WebSocket> // The connected clients for this subscription.
  }
 */
export const subscriptions = new Map();

/**
 * Broadcasts an event to all subscriptions whose filters match the event.
 *
 * For each subscription in the `subscriptions` map, the subscription’s matcher
 * function is used to determine if the event should be forwarded to its clients.
 *
 * @param {Object} event - The event to broadcast.
 */
export function broadcastEvent(event) {
  for (const [subId, subscription] of subscriptions.entries()) {
    // Only send the event to subscribers if it matches the subscription filters.
    if (subscription.matcher(event)) {
      for (const subscriber of subscription.subscribers) {
        console.log('Sending event to subscriber')
        subscriber.send(JSON.stringify(["EVENT", subId, event]));
      }
    }
  }
}
