/**
 * Sessions API Route
 *
 * Creates agent sessions before WebSocket connection.
 * The sessionId is used to connect via WebSocket.
 */

import { Router } from 'express';
import { isNotFoundError, type UIMessage } from '@octavus/server-sdk';
import { getOctavusClient, sendErrorResponse } from '../octavus/client';
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

    const { id: sessionId } = await getOctavusClient().sessions.create(getAgentId(), {
      USER_NAME: userName,
    });

    res.json({ sessionId });
  } catch (error) {
    console.error('Failed to create session:', error);
    sendErrorResponse(res, error, 'Failed to create session');
  }
});

/**
 * GET /api/sessions/:sessionId - Get session status and messages
 *
 * Response:
 * {
 *   status: 'active' | 'expired' | 'not_found',
 *   sessionId?: string,
 *   agentId?: string,
 *   messages?: UIMessage[] // empty once the session expired
 * }
 */
sessionsRouter.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const client = getOctavusClient();

    const [session, messages] = await Promise.all([
      client.sessions.get(sessionId),
      client.sessions.getMessages(sessionId),
    ]);

    res.json({
      status: session.status,
      sessionId: session.id,
      agentId: session.agentId,
      messages,
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      res.json({ status: 'not_found' });
      return;
    }

    console.error('Failed to get session:', error);
    sendErrorResponse(res, error, 'Failed to get session');
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
 *   status: 'active' | 'expired'
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

    const session = await getOctavusClient().sessions.restoreFromMessages(sessionId, messages, {
      USER_NAME: userName,
    });

    res.json({ sessionId: session.id, status: session.status });
  } catch (error) {
    console.error('Failed to restore session:', error);
    sendErrorResponse(res, error, 'Failed to restore session');
  }
});
