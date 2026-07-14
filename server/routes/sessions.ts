/**
 * Sessions API Route
 *
 * Creates agent sessions before WebSocket connection.
 * The sessionId is used to connect via WebSocket and for file uploads.
 */

import { Router } from 'express';
import type { UIMessage } from '@octavus/server-sdk';
import { getOctavusClient } from '../octavus/client';
import { getAgentId } from '../config';

export const sessionsRouter = Router();

/**
 * POST /api/sessions - Create a new agent session
 *
 * Request body:
 * {
 *   userName?: string
 * }
 *
 * Response:
 * {
 *   sessionId: string
 * }
 */
sessionsRouter.post('/', async (req, res) => {
  try {
    const { userName = '' } = req.body as { userName?: string };

    const client = getOctavusClient();
    const agentId = getAgentId();

    const sessionId = await client.agentSessions.create(agentId, {
      USER_NAME: userName,
    });

    res.json({ sessionId });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create session',
    });
  }
});

/**
 * GET /api/sessions/:sessionId - Get session status and messages
 *
 * Response:
 * {
 *   status: 'active' | 'expired' | 'not_found',
 *   sessionId?: string,
 *   messages?: UIMessage[]
 * }
 */
sessionsRouter.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const client = getOctavusClient();

    const result = await client.agentSessions.getMessages(sessionId);

    if (result.status === 'expired') {
      res.json({
        status: 'expired',
        sessionId: result.sessionId,
        agentId: result.agentId,
      });
      return;
    }

    res.json({
      status: 'active',
      sessionId: result.sessionId,
      agentId: result.agentId,
      messages: result.messages,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.json({ status: 'not_found' });
      return;
    }

    console.error('Failed to get session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get session',
    });
  }
});

/**
 * POST /api/sessions/:sessionId/restore - Restore an expired session
 *
 * Request body:
 * {
 *   messages: UIMessage[],
 *   userName?: string
 * }
 *
 * Response:
 * {
 *   sessionId: string,
 *   restored: boolean
 * }
 */
sessionsRouter.post('/:sessionId/restore', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messages, userName = '' } = req.body as {
      messages?: UIMessage[];
      userName?: string;
    };

    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    const client = getOctavusClient();
    const result = await client.agentSessions.restore(sessionId, messages, {
      USER_NAME: userName,
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to restore session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to restore session',
    });
  }
});
