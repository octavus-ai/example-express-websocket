/**
 * Assistant Agent - Tools
 *
 * Tools defined in the agent protocol are implemented here.
 * These run on your server when the agent calls them.
 *
 * Note: `set-chat-metadata` has no server handler - it is a client tool, so
 * unhandled calls are forwarded to the browser (see the chat UI).
 */

import type { ToolHandlers } from '@octavus/server-sdk';

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
