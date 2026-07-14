/**
 * WebSocket Socket Handler
 *
 * Handles SockJS connections for real-time agent communication.
 *
 * Flow:
 * 1. Client creates session via HTTP POST /api/sessions
 * 2. Client connects to WebSocket
 * 3. Client sends { type: 'connect', sessionId } to attach
 * 4. Client sends triggers, receives streaming events
 */

import type { Connection } from 'sockjs';
import type { AgentSession, SocketMessage } from '@octavus/server-sdk';
import { octavusClient } from './client';
import { tools } from './assistant';

/**
 * Creates a SockJS connection handler for Octavus streaming.
 */
export function createSocketHandler(): (conn: Connection) => void {
  return (conn: Connection) => {
    console.log('[Socket] Client connected:', conn.id);

    // Per-connection state
    let session: AgentSession | null = null;
    let sessionId: string | null = null;

    // Helper to send JSON to client
    const send = (data: unknown) => {
      conn.write(JSON.stringify(data));
    };

    conn.on('data', (rawData: string) => {
      void handleMessage(rawData);
    });

    async function handleMessage(rawData: string): Promise<void> {
      let msg: unknown;
      try {
        msg = JSON.parse(rawData);
      } catch {
        return; // Invalid JSON
      }

      const msgObj = msg as Record<string, unknown>;

      if (msgObj.type === 'connect' && typeof msgObj.sessionId === 'string') {
        handleConnect(msgObj.sessionId);
        return;
      }

      if (msgObj.type === 'get-messages') {
        await handleGetMessages();
        return;
      }

      if (msgObj.type === 'trigger' || msgObj.type === 'continue' || msgObj.type === 'stop') {
        if (!session) {
          send({
            type: 'error',
            errorType: 'validation_error',
            message: 'Not connected to session. Send { type: "connect", sessionId } first.',
            source: 'platform',
            retryable: false,
          });
          return;
        }

        await session.handleSocketMessage(msg as SocketMessage, {
          onEvent: send,
          onFinish: sendMessagesUpdate,
        });
      }
    }

    function handleConnect(newSessionId: string): void {
      if (session) {
        console.warn('[Socket] Already connected to session:', sessionId);
        return;
      }

      sessionId = newSessionId;
      session = octavusClient.agentSessions.attach(newSessionId, {
        tools,
      });

      send({ type: 'connected', sessionId: newSessionId });
      console.log('[Socket] Attached to session:', newSessionId);
    }

    async function handleGetMessages(): Promise<void> {
      if (!sessionId) {
        send({
          type: 'error',
          errorType: 'validation_error',
          message: 'Not connected to session. Send { type: "connect", sessionId } first.',
          source: 'platform',
          retryable: false,
        });
        return;
      }

      try {
        const result = await octavusClient.agentSessions.getMessages(sessionId);

        if (result.status === 'expired') {
          send({ type: 'session-expired', sessionId });
          return;
        }

        send({ type: 'messages-update', messages: result.messages });
      } catch (error) {
        console.error('[Socket] Failed to get messages:', error);
        send({
          type: 'error',
          errorType: 'internal_error',
          message: error instanceof Error ? error.message : 'Failed to get messages',
          source: 'platform',
          retryable: false,
        });
      }
    }

    async function sendMessagesUpdate(): Promise<void> {
      if (!sessionId) return;

      try {
        const result = await octavusClient.agentSessions.getMessages(sessionId);
        if (result.status !== 'expired') {
          send({ type: 'messages-update', messages: result.messages });
        }
      } catch (err) {
        console.warn('[Socket] Failed to fetch messages for persistence:', err);
      }
    }

    conn.on('close', () => {
      console.log('[Socket] Client disconnected:', conn.id);
    });
  };
}
