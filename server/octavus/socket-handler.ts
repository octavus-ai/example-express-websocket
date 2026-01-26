/**
 * WebSocket Socket Handler
 *
 * Handles SockJS connections for real-time agent communication.
 *
 * Flow:
 * 1. Client creates session via HTTP POST /api/sessions
 * 2. Client connects to WebSocket
 * 3. Client sends { type: 'connect', sessionId } to attach
 * 4. Client sends triggers or continue messages, receives streaming events
 */

import type { Connection } from 'sockjs';
import {
  createInternalErrorEvent,
  type AgentSession,
  type UIMessage,
  type SessionRequest,
  type StreamEvent,
} from '@octavus/server-sdk';
import { octavusClient } from './client';
import { tools, resources } from './assistant';

/** Socket protocol messages */
interface StopMessage {
  type: 'stop';
}

interface ConnectMessage {
  type: 'connect';
  sessionId: string;
}

interface GetMessagesMessage {
  type: 'get-messages';
}

type ClientMessage = SessionRequest | StopMessage | ConnectMessage | GetMessagesMessage;

interface MessagesUpdateEvent {
  type: 'messages-update';
  messages: UIMessage[];
}

interface SessionContext {
  session: AgentSession | null;
  sessionId: string | null;
  abortController: AbortController | null;
}

function isValidMessage(data: unknown): data is ClientMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const msg = data as Record<string, unknown>;

  // Socket protocol messages
  if (msg.type === 'connect' && typeof msg.sessionId === 'string') return true;
  if (msg.type === 'stop') return true;
  if (msg.type === 'get-messages') return true;

  // Session requests (passed directly to session.execute())
  if (msg.type === 'trigger' && typeof msg.triggerName === 'string') return true;
  if (msg.type === 'continue' && typeof msg.executionId === 'string') return true;

  return false;
}

function isSessionRequest(msg: ClientMessage): msg is SessionRequest {
  return msg.type === 'trigger' || msg.type === 'continue';
}

export function createSocketHandler(): (conn: Connection) => void {
  return (conn: Connection) => {
    console.log('[Socket] Client connected:', conn.id);

    const context: SessionContext = {
      session: null,
      sessionId: null,
      abortController: null,
    };

    conn.on('data', (rawData: string) => {
      void handleMessage(rawData);
    });

    async function handleMessage(rawData: string): Promise<void> {
      try {
        const data: unknown = JSON.parse(rawData);

        if (!isValidMessage(data)) {
          console.warn('[Socket] Invalid message:', data);
          return;
        }

        if (data.type === 'connect') {
          handleConnect(data.sessionId);
          return;
        }

        if (data.type === 'stop') {
          if (context.abortController) {
            context.abortController.abort();
            context.abortController = null;
          }
          return;
        }

        if (data.type === 'get-messages') {
          await handleGetMessages();
          return;
        }

        // Session requests (trigger or continue)
        if (isSessionRequest(data)) {
          await handleSessionRequest(data);
        }
      } catch (error) {
        console.error('[Socket] Failed to handle message:', error);
        const errorEvent = createInternalErrorEvent(
          error instanceof Error ? error.message : 'Unknown error',
        );
        conn.write(JSON.stringify(errorEvent));
      }
    }

    async function handleGetMessages(): Promise<void> {
      if (!context.sessionId) {
        const errorEvent = createInternalErrorEvent(
          'Not connected to session. Send { type: "connect", sessionId } first.',
        );
        conn.write(JSON.stringify(errorEvent));
        return;
      }

      try {
        const result = await octavusClient.agentSessions.getMessages(context.sessionId);

        if (result.status === 'expired') {
          conn.write(
            JSON.stringify({
              type: 'session-expired',
              sessionId: context.sessionId,
            }),
          );
          return;
        }

        const event: MessagesUpdateEvent = {
          type: 'messages-update',
          messages: result.messages,
        };
        conn.write(JSON.stringify(event));
      } catch (error) {
        console.error('[Socket] Failed to get messages:', error);
        const errorEvent = createInternalErrorEvent(
          error instanceof Error ? error.message : 'Failed to get messages',
        );
        conn.write(JSON.stringify(errorEvent));
      }
    }

    function handleConnect(sessionId: string): void {
      if (context.session) {
        console.warn('[Socket] Already connected to session:', context.sessionId);
        return;
      }

      context.sessionId = sessionId;
      context.session = octavusClient.agentSessions.attach(sessionId, {
        tools,
        resources,
      });

      conn.write(JSON.stringify({ type: 'connected', sessionId }));
      console.log('[Socket] Attached to session:', sessionId);
    }

    /**
     * Streams events to the client and fetches messages after completion.
     */
    async function streamToClient(events: AsyncGenerator<StreamEvent>): Promise<void> {
      if (context.abortController) {
        context.abortController.abort();
      }
      context.abortController = new AbortController();

      try {
        for await (const event of events) {
          if (context.abortController.signal.aborted) {
            break;
          }
          conn.write(JSON.stringify(event));
        }

        // Send updated messages for client persistence after streaming completes
        if (!context.abortController?.signal.aborted && context.sessionId) {
          try {
            const result = await octavusClient.agentSessions.getMessages(context.sessionId);
            if (result.status !== 'expired') {
              const messagesEvent: MessagesUpdateEvent = {
                type: 'messages-update',
                messages: result.messages,
              };
              conn.write(JSON.stringify(messagesEvent));
            }
          } catch (err) {
            console.warn('[Socket] Failed to fetch messages for persistence:', err);
          }
        }
      } catch (error) {
        if (context.abortController.signal.aborted) {
          return;
        }
        throw error;
      } finally {
        context.abortController = null;
      }
    }

    async function handleSessionRequest(req: SessionRequest): Promise<void> {
      if (!context.session || !context.sessionId) {
        const errorEvent = createInternalErrorEvent(
          'Not connected to session. Send { type: "connect", sessionId } first.',
        );
        conn.write(JSON.stringify(errorEvent));
        return;
      }

      console.log('[Socket] Executing:', req.type, req);

      // execute() handles both triggers and continuations
      const events = context.session.execute(req, {
        signal: context.abortController?.signal,
      });

      await streamToClient(events);
    }

    conn.on('close', () => {
      console.log('[Socket] Client disconnected:', conn.id);
      if (context.abortController) {
        context.abortController.abort();
      }
    });
  };
}
