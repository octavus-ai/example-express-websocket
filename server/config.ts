export function getOctavusPlatformUrl(): string {
  return process.env.OCTAVUS_API_URL ?? 'https://octavus.ai';
}

export function getOctavusApiKey(): string {
  const apiKey = process.env.OCTAVUS_API_KEY;
  if (!apiKey) {
    throw new Error('OCTAVUS_API_KEY environment variable is required');
  }
  return apiKey;
}

export function getAgentId(): string {
  const agentId = process.env.OCTAVUS_AGENT_ID;
  if (!agentId) {
    throw new Error('OCTAVUS_AGENT_ID environment variable is required');
  }
  return agentId;
}

export const PORT = process.env.PORT ?? 8889;
