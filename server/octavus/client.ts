/**
 * Octavus Client
 *
 * Lazy-initialized client to ensure environment variables are loaded first.
 */

import type { Response } from 'express';
import { OctavusClient, OctavusError } from '@octavus/server-sdk';
import { getOctavusPlatformUrl, getOctavusApiKey } from '../config';

let _octavusClient: OctavusClient | null = null;

export function getOctavusClient(): OctavusClient {
  if (!_octavusClient) {
    _octavusClient = new OctavusClient({
      baseUrl: getOctavusPlatformUrl(),
      apiKey: getOctavusApiKey(),
    });
  }
  return _octavusClient;
}

/**
 * Answer a failed call with a JSON error.
 *
 * An `OctavusError` is answered with its status and the platform's error
 * body, the shape `OctavusError.fromApiResponse()` reads back.
 */
export function sendErrorResponse(res: Response, error: unknown, fallbackMessage: string): void {
  if (OctavusError.isInstance(error)) {
    res.status(error.status ?? 500).json({
      error: error.message,
      code: error.code,
      type: error.errorType,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
      requestId: error.requestId,
      issues: error.issues,
    });
    return;
  }

  res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
}
