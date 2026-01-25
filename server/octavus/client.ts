/**
 * Octavus Client
 *
 * Lazy-initialized client to ensure environment variables are loaded first.
 */

import { OctavusClient } from '@octavus/server-sdk';
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

export const octavusClient = {
  get agentSessions() {
    return getOctavusClient().agentSessions;
  },
  get agents() {
    return getOctavusClient().agents;
  },
  get files() {
    return getOctavusClient().files;
  },
};
