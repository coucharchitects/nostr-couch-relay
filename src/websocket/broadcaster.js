// Store subscriptions
export const subscriptions = new Map();

export function broadcastEvent(event) {
  for (const [subId, subscribers] of subscriptions.entries()) {
    for (const subscriber of subscribers) {
      subscriber.send(JSON.stringify(["EVENT", subId, event]));
    }
  }
}