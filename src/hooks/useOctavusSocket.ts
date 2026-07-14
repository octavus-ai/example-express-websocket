/**
 * Octavus Socket Hook
 *
 * Manages WebSocket connection to the Express server for real-time
 * agent communication using SockJS.
 *
 * Session lifecycle:
 * 1. Session is created via REST API (POST /api/sessions) before this hook is used
 * 2. sessionId is passed to this hook along with initialMessages from the server
 * 3. WebSocket connects and attaches to the session for streaming
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import {
  useOctavusChat,
  createSocketTransport,
  type SocketLike,
  type ConnectionState,
  type FileReference,
  type UploadUrlsResponse,
  type UIMessage,
  type OctavusError,
  type ClientToolHandler,
  type InteractiveTool,
} from '@octavus/react';

export interface UseOctavusSocketOptions {
  /** Session ID (created via REST API before using this hook) */
  sessionId: string;
  /** Initial messages to display (loaded from server) */
  initialMessages?: UIMessage[];
  /** Callback when the agent pushes chat metadata (title, summary, cover image) */
  onMetadata?: (metadata: { title: string; summary: string; image: string }) => void;
  /** Callback when messages are updated (for persistence) */
  onMessagesUpdate?: (messages: UIMessage[]) => void;
  /** Callback when streaming finishes */
  onFinish?: () => void;
  /** Callback when an error occurs */
  onError?: (error: OctavusError) => void;
}

interface UseOctavusSocketReturn {
  messages: UIMessage[];
  status: ReturnType<typeof useOctavusChat>['status'];
  error: ReturnType<typeof useOctavusChat>['error'];
  send: ReturnType<typeof useOctavusChat>['send'];
  stop: () => void;
  connectionState: ConnectionState | undefined;
  connectionError: Error | undefined;
  uploadFiles: (
    files: FileList | File[],
    onProgress?: (fileIndex: number, progress: number) => void,
  ) => Promise<FileReference[]>;
  pendingClientTools: Record<string, InteractiveTool[]>;
}

export function useOctavusSocket(options: UseOctavusSocketOptions): UseOctavusSocketReturn {
  const {
    sessionId,
    initialMessages,
    onMetadata,
    onMessagesUpdate,
    onFinish,
    onError,
  } = options;

  // Refs for callbacks to avoid stale closures in the socket handler / client tools
  const onMessagesUpdateRef = useRef(onMessagesUpdate);
  const onMetadataRef = useRef(onMetadata);

  useEffect(() => {
    onMessagesUpdateRef.current = onMessagesUpdate;
  }, [onMessagesUpdate]);

  useEffect(() => {
    onMetadataRef.current = onMetadata;
  }, [onMetadata]);

  // Connect function - sessionId is required (validated by REST API before this hook runs)
  const connectSocket = useCallback((): Promise<SocketLike> => {
    return new Promise((resolve, reject) => {
      const sock = new SockJS('/octavus');

      sock.onopen = () => {
        console.log('[Socket] Connected, attaching to session:', sessionId);
        sock.send(JSON.stringify({ type: 'connect', sessionId }));
        resolve(sock);
      };

      sock.onerror = (e) => {
        console.error('[Socket] Connection error:', e);
        reject(new Error('Failed to connect to socket'));
      };
    });
  }, [sessionId]);

  // Transport - stable as long as sessionId doesn't change
  const transport = useMemo(
    () =>
      createSocketTransport({
        connect: connectSocket,
        onMessage: (data) => {
          // Handle messages-update event for persistence
          if (
            typeof data === 'object' &&
            data !== null &&
            'type' in data &&
            (data as { type: string }).type === 'messages-update' &&
            'messages' in data
          ) {
            const msgs = (data as { messages: UIMessage[] }).messages;
            onMessagesUpdateRef.current?.(msgs);
          }
        },
        onClose: () => {
          console.log('[Socket] Connection closed');
        },
      }),
    [connectSocket],
  );

  const requestUploadUrls = useCallback(
    async (
      files: { filename: string; mediaType: string; size: number }[],
    ): Promise<UploadUrlsResponse> => {
      const response = await fetch('/api/upload-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, files }),
      });
      if (!response.ok) {
        throw new Error('Failed to get upload URLs');
      }
      return await (response.json() as Promise<UploadUrlsResponse>);
    },
    [sessionId],
  );

  // Define client-side tools
  const clientTools = useMemo<Record<string, ClientToolHandler>>(
    () => ({
      // Interactive: requires user input via modal
      'request-feedback': 'interactive',

      // Automatic: executes immediately, no user interaction needed
      'get-browser-info': () =>
        Promise.resolve({
          userAgent: navigator.userAgent,
          language: navigator.language,
          languages: [...navigator.languages],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          colorDepth: window.screen.colorDepth,
        }),

      // Automatic: pushes the generated title, summary, and cover image into
      // the sidebar.
      'set-chat-metadata': (args) => {
        onMetadataRef.current?.({
          title: (args.title as string) || 'New Chat',
          summary: (args.summary as string) || '',
          image: (args.image as string) || '',
        });
        return Promise.resolve({ saved: true });
      },
    }),
    [],
  );

  const {
    messages,
    status,
    error,
    send,
    stop,
    connectionState,
    connectionError,
    connect,
    disconnect,
    uploadFiles: chatUploadFiles,
    pendingClientTools,
  } = useOctavusChat({
    transport,
    initialMessages,
    requestUploadUrls,
    clientTools,
    onFinish: () => {
      onFinish?.();
    },
    onError: (err: OctavusError) => {
      console.error('[Chat] Error:', {
        type: err.errorType,
        message: err.message,
        source: err.source,
        retryable: err.retryable,
      });
      onError?.(err);
    },
  });

  // Connect when component mounts
  useEffect(() => {
    void connect?.();
    return () => disconnect?.();
  }, [connect, disconnect]);

  const uploadFiles = useCallback(
    async (
      files: FileList | File[],
      onProgress?: (fileIndex: number, progress: number) => void,
    ): Promise<FileReference[]> => {
      return await chatUploadFiles(files, onProgress);
    },
    [chatUploadFiles],
  );

  return {
    messages,
    status,
    error,
    send,
    stop,
    connectionState,
    connectionError,
    uploadFiles,
    pendingClientTools,
  };
}
