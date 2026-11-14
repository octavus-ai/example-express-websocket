/**
 * File Upload URLs API Route
 *
 * Proxies requests to the Octavus platform to get presigned S3 URLs
 * for file uploads. This allows the client to upload files directly
 * to S3 without exposing the platform API key.
 *
 * Files are project resources, so no session is needed to upload one.
 */

import { Router } from 'express';
import { z } from 'zod';
import { getOctavusClient, sendErrorResponse } from '../octavus/client';

export const uploadUrlsRouter = Router();

const fileUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mediaType: z.string().min(1),
  size: z.number().int().positive(),
});

const uploadUrlsRequestSchema = z.object({
  files: z.array(fileUploadRequestSchema).min(1).max(20),
});

/**
 * POST /api/upload-urls - Get presigned URLs for file uploads
 *
 * Request body:
 * {
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

    const result = await getOctavusClient().files.create(parsed.data.files);
    res.json(result);
  } catch (error) {
    console.error('Upload URLs error:', error);
    sendErrorResponse(res, error, 'Failed to get upload URLs');
  }
});
