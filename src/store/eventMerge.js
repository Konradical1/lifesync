'use strict';

function eventIdentity(event) {
  if (event?.source === 'apple_health' && event?.externalId) {
    return `apple_health:${event.externalId}`;
  }
  return `id:${event?.id}`;
}

function mergeHydratedEvents(currentEvents, serverEvents, { replace = false } = {}) {
  if (!Array.isArray(serverEvents)) return currentEvents;
  if (replace || !Array.isArray(currentEvents) || currentEvents.length === 0) {
    return serverEvents;
  }
  const serverIds = new Set(serverEvents.map(eventIdentity));
  const localOnly = currentEvents.filter((event) => !serverIds.has(eventIdentity(event)));
  return [...serverEvents, ...localOnly];
}

module.exports = { eventIdentity, mergeHydratedEvents };
