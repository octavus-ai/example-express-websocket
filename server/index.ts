/**
 * Express + SockJS Server
 *
 * Main server entry point with:
 * - Express HTTP server for REST APIs
 * - SockJS WebSocket server for real-time agent communication
 */

import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cors from 'cors';
import sockjs from 'sockjs';

import { PORT } from './config';
import { sessionsRouter } from './routes/sessions';
import { uploadUrlsRouter } from './routes/upload-urls';
import { createSocketHandler } from './octavus/socket-handler';

async function main(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/sessions', sessionsRouter);
  app.use('/api/upload-urls', uploadUrlsRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const server = http.createServer(app);

  const sockjsServer = sockjs.createServer({
    prefix: '/octavus',
    log: (severity, message) => {
      if (severity === 'error') {
        console.error('[SockJS]', message);
      }
    },
  });

  sockjsServer.installHandlers(server);
  sockjsServer.on('connection', createSocketHandler());

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`SockJS endpoint: http://localhost:${PORT}/octavus`);
  });

  // Graceful shutdown
  const shutdown = (): void => {
    console.log('\nShutting down...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
