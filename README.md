# Octavus + Express WebSocket Example

A chat application demonstrating Octavus integration with Express and WebSocket (SockJS).

## Features

- Real-time streaming via WebSocket (SockJS)
- Extended thinking/reasoning display
- Tool calling (current time)
- QR code generation via skills
- Image generation and file uploads
- Auto-generate chat title, summary, and cover image
- Resource synchronization (sidebar updates)
- Session management

## Quick Start

### Prerequisites

- Node.js 20+
- Octavus account with API keys

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/octavus-ai/example-express-websocket.git
   cd example-express-websocket
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Octavus credentials:
   ```bash
   OCTAVUS_API_URL=https://octavus.ai
   OCTAVUS_API_KEY=your-api-key
   OCTAVUS_CLI_API_KEY=your-cli-api-key
   ```

4. Sync the agent:
   ```bash
   npm run agents:sync
   ```

   After syncing, copy the agent ID from the output and add it to `.env`:
   ```bash
   OCTAVUS_AGENT_ID=your-agent-id
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

## Architecture

```
Browser (React/Vite) <--SockJS--> Express Server <--HTTP--> Octavus Platform
```

- **Client**: React + Vite with `@octavus/react` SDK using `createSocketTransport`
- **Server**: Express + SockJS with `@octavus/server-sdk`
- **Transport**: SockJS for bidirectional WebSocket communication

## Environment Variables

| Variable              | Description                          | Required |
|-----------------------|--------------------------------------|----------|
| `OCTAVUS_API_URL`     | Octavus platform URL                 | No       |
| `OCTAVUS_API_KEY`     | API key for runtime                  | Yes      |
| `OCTAVUS_AGENT_ID`    | Agent ID (from sync)                 | Yes      |
| `OCTAVUS_CLI_API_KEY` | API key for CLI sync                 | No       |
| `PORT`                | Server port (default: 3001)          | No       |

## Scripts

| Script               | Description                           |
|----------------------|---------------------------------------|
| `npm run dev`        | Start dev server (client + server)    |
| `npm run dev:client` | Start Vite dev server only            |
| `npm run dev:server` | Start Express server only             |
| `npm run build`      | Build for production                  |
| `npm run start`      | Start production server               |
| `npm run lint`       | Run linter                            |
| `npm run type-check` | Run TypeScript type check             |
| `npm run agents:sync`| Sync agent to Octavus                 |

## Project Structure

```
example-express-websocket/
├── server/                    # Express server
│   ├── index.ts               # Server entry (Express + SockJS)
│   ├── config.ts              # Environment configuration
│   ├── octavus/
│   │   ├── client.ts          # OctavusClient factory
│   │   ├── assistant.ts       # Tool & resource handlers
│   │   └── socket-handler.ts  # WebSocket message handling
│   └── routes/
│       ├── sessions.ts        # Session management API
│       └── upload-urls.ts     # File upload URL API
├── src/                       # React client
│   ├── App.tsx                # App with routing
│   ├── main.tsx               # Entry point
│   ├── index.css              # Global styles
│   ├── hooks/
│   │   └── useOctavusSocket.ts  # Socket transport hook
│   └── features/chat/         # Chat UI components
├── octavus-agents/            # Agent definitions
│   └── assistant/
├── public/                    # Static assets
└── package.json
```

## Key Differences from HTTP/SSE Transport

| Aspect | HTTP/SSE | WebSocket (SockJS) |
|--------|----------|-------------------|
| Transport | `createHttpTransport` | `createSocketTransport` |
| Stop mechanism | `AbortController` | WebSocket stop message |
| Connection | Per-request | Persistent |
| Protocol | Unidirectional SSE | Bidirectional |

## Learn More

- [Octavus Documentation](https://octavus.ai/docs)
- [Server SDK Reference](https://octavus.ai/docs/server-sdk/overview)
- [Client SDK Reference](https://octavus.ai/docs/client-sdk/overview)
- [Protocol Reference](https://octavus.ai/docs/protocol/overview)

## License

MIT
