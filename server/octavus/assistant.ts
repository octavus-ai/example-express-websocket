/**
 * Assistant Agent - Tools & Resources
 *
 * Tools defined in the agent protocol are implemented here.
 * These run on your server when the agent calls them.
 *
 * Resources receive updates when the agent sets resource values.
 */

import { Resource, type ToolHandlers } from '@octavus/server-sdk';

/**
 * Resource Handlers
 *
 * Resources sync state from the agent to your server.
 * Use these to persist data, trigger side effects, etc.
 */
class ChatTitleResource extends Resource {
  readonly name = 'CHAT_TITLE';

  onUpdate(value: unknown): void {
    console.log(`[Resource] CHAT_TITLE updated:`, value);
  }
}

class ChatSummaryResource extends Resource {
  readonly name = 'CHAT_SUMMARY';

  onUpdate(value: unknown): void {
    console.log(`[Resource] CHAT_SUMMARY updated:`, value);
  }
}

class ChatImageResource extends Resource {
  readonly name = 'CHAT_IMAGE';

  onUpdate(value: unknown): void {
    console.log(`[Resource] CHAT_IMAGE updated:`, value);
  }
}

export const resources = [
  new ChatTitleResource(),
  new ChatSummaryResource(),
  new ChatImageResource(),
];

export const tools: ToolHandlers = {
  'get-current-time': async (args) => {
    const timezone = (args.timezone as string) || 'UTC';

    try {
      const now = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
      return { time: now, timezone };
    } catch {
      // Invalid timezone - fall back to UTC
      const now = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
      return { time: now, timezone: 'UTC', note: `Invalid timezone "${timezone}", using UTC` };
    }
  },
};
