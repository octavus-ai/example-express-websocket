/**
 * Octavus Socket Hook
 *
 * Manages WebSocket connection to the Express server for real-time
 * agent communication using SockJS.
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
} from '@octavus/react';

export interface UseOctavusSocketOptions {
  /** Session ID to connect to */
  sessionId: string;
  /** Initial messages to display (from server restore) */
  initialMessages?: UIMessage[];
  /** Callback when resource values are updated */
  onResourceUpdate?: (name: string, value: unknown) => void;
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
}

export function useOctavusSocket(options: UseOctavusSocketOptions): UseOctavusSocketReturn {
  const {
    sessionId,
    initialMessages,
    onResourceUpdate,
    onMessagesUpdate,
    onFinish,
    onError,
  } = options;

  // Use refs to track connection state without causing re-renders
  const hasConnectedRef = useRef(false);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  
  // Refs for callbacks to avoid stale closures
  const onMessagesUpdateRef = useRef(onMessagesUpdate);
  const onResourceUpdateRef = useRef(onResourceUpdate);
  
  useEffect(() => {
    onMessagesUpdateRef.current = onMessagesUpdate;
  }, [onMessagesUpdate]);
  
  useEffect(() => {
    onResourceUpdateRef.current = onResourceUpdate;
  }, [onResourceUpdate]);

  const connectSocket = useCallback((): Promise<SocketLike> => {
    return new Promise((resolve, reject) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        reject(new Error('Session ID required'));
        return;
      }

      console.log('[Socket] Creating SockJS connection...');
      const sock = new SockJS('/octavus');

      sock.onopen = () => {
        console.log('[Socket] Connected, attaching to session:', currentSessionId);
        sock.send(JSON.stringify({ type: 'connect', sessionId: currentSessionId }));
        resolve(sock);
      };

      sock.onerror = (e) => {
        console.error('[Socket] Connection error:', e);
        reject(new Error('Failed to connect to socket'));
      };
    });
  }, []); // No dependencies - uses ref for sessionId

  const transport = useMemo(
    () =>
      createSocketTransport({
        connect: connectSocket,
        onMessage: (data) => {
          // Handle messages-update event for persistence
          if (
            typeof data === 'object' &&
            data !== null &&
            'type' in data
          ) {
            const typed = data as { type: string; messages?: UIMessage[]; name?: string; value?: unknown };
            
            if (typed.type === 'messages-update' && typed.messages) {
              onMessagesUpdateRef.current?.(typed.messages);
            }
            
            // Handle resource updates sent directly via WebSocket
            if (typed.type === 'resource-update' && typed.name !== undefined) {
              onResourceUpdateRef.current?.(typed.name, typed.value);
            }
          }
        },
        onClose: () => {
          console.log('[Socket] Transport closed');
          hasConnectedRef.current = false;
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
  } = useOctavusChat({
    transport,
    initialMessages,
    requestUploadUrls,
    onResourceUpdate: (name, value) => {
      onResourceUpdate?.(name, value);
    },
    onFinish,
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

  // Connect once when sessionId is available
  useEffect(() => {
    if (sessionId && !hasConnectedRef.current && connect) {
      hasConnectedRef.current = true;
      console.log('[Socket] Initiating connection for session:', sessionId);
      void connect();
    }
    
    return () => {
      if (hasConnectedRef.current) {
        console.log('[Socket] Cleaning up connection');
        disconnect?.();
        hasConnectedRef.current = false;
      }
    };
  }, [sessionId, connect, disconnect]);

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
  };
}
