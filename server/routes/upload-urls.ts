/**
 * File Upload URLs API Route
 *
 * Proxies requests to the Octavus platform to get presigned S3 URLs
 * for file uploads. This allows the client to upload files directly
 * to S3 without exposing the platform API key.
 */

import { Router } from 'express';
import { z } from 'zod';
import { getOctavusClient } from '../octavus/client';
import { ApiError } from '@octavus/server-sdk';

export const uploadUrlsRouter = Router();

const fileUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mediaType: z.string().min(1),
  size: z.number().int().positive(),
});

const uploadUrlsRequestSchema = z.object({
  sessionId: z.string().min(1),
  files: z.array(fileUploadRequestSchema).min(1).max(20),
});

/**
 * POST /api/upload-urls - Get presigned URLs for file uploads
 *
 * Request body:
 * {
 *   sessionId: string,
 *   files: { filename: string, mediaType: string, size: number }[]
 * }
 *
 * Response:
 * {
 *   files: { id: string, uploadUrl: string, downloadUrl: string }[]
 * }
 */
uploadUrlsRouter.post('/', async (req, res) => {
  try {
    const parsed = uploadUrlsRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const { sessionId, files } = parsed.data;
    const client = getOctavusClient();

    const result = await client.files.getUploadUrls(sessionId, files);
    res.json(result);
  } catch (error) {
    console.error('Upload URLs error:', error);

    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
