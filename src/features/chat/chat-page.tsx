import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { UIMessage } from '@octavus/react';
import { ChatInterface } from './chat-interface';

interface SessionData {
  status: 'active' | 'expired' | 'not_found';
  sessionId?: string;
  messages?: UIMessage[];
}

type PageState =
  | { type: 'loading' }
  | { type: 'ready'; messages: UIMessage[] }
  | { type: 'error'; message: string }
  | { type: 'not_found' };

/**
 * Fetch session data from the server
 */
async function fetchSession(sessionId: string): Promise<SessionData> {
  const response = await fetch(`/api/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  return response.json();
}

/**
 * Restore an expired session
 */
async function restoreSession(
  sessionId: string,
  messages: UIMessage[],
): Promise<{ restored: boolean }> {
  const response = await fetch(`/api/sessions/${sessionId}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    throw new Error('Failed to restore session');
  }
  return response.json();
}

/**
 * Get stored messages from localStorage
 */
function getStoredMessages(sessionId: string): UIMessage[] {
  try {
    const stored = localStorage.getItem(`chat-messages-${sessionId}`);
    if (stored) {
      return JSON.parse(stored) as UIMessage[];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Store messages to localStorage
 */
function storeMessages(sessionId: string, messages: UIMessage[]): void {
  try {
    localStorage.setItem(`chat-messages-${sessionId}`, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
}

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>({ type: 'loading' });

  // Initialize session on mount
  useEffect(() => {
    if (!sessionId) return;

    // Capture sessionId for use in async function (TypeScript narrowing)
    const currentSessionId = sessionId;

    async function initializeSession() {
      try {
        // First, try to get session from server
        const sessionData = await fetchSession(currentSessionId);

        if (sessionData.status === 'not_found') {
          setPageState({ type: 'not_found' });
          return;
        }

        // Get locally stored messages (in case server messages are incomplete)
        const storedMessages = getStoredMessages(currentSessionId);

        if (sessionData.status === 'expired') {
          // Session expired - try to restore it with stored messages
          const messagesToRestore =
            storedMessages.length > 0 ? storedMessages : (sessionData.messages ?? []);

          if (messagesToRestore.length > 0) {
            console.log('[Session] Restoring expired session with messages');
            const result = await restoreSession(currentSessionId, messagesToRestore);

            if (result.restored) {
              setPageState({ type: 'ready', messages: messagesToRestore });
              return;
            }
          }

          // Could not restore - redirect to create new session
          console.log('[Session] Could not restore, redirecting to landing');
          navigate('/', { replace: true });
          return;
        }

        // Session is active - use server messages or stored messages
        const messages =
          sessionData.messages && sessionData.messages.length > 0
            ? sessionData.messages
            : storedMessages;

        console.log('[Session] Active session loaded with', messages.length, 'messages');
        setPageState({ type: 'ready', messages });
      } catch (error) {
        console.error('[Session] Failed to initialize:', error);
        setPageState({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load session',
        });
      }
    }

    void initializeSession();
  }, [sessionId, navigate]);

  // Callback to persist messages when they're updated
  const handleMessagesUpdate = useCallback(
    (messages: UIMessage[]) => {
      if (sessionId) {
        storeMessages(sessionId, messages);
      }
    },
    [sessionId],
  );

  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  if (pageState.type === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (pageState.type === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Session Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This session doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-500"
          >
            Start New Chat
          </button>
        </div>
      </div>
    );
  }

  if (pageState.type === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-400">Error</h1>
          <p className="mt-2 text-muted-foreground">{pageState.message}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-500"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface
      sessionId={sessionId}
      initialMessages={pageState.messages}
      onMessagesUpdate={handleMessagesUpdate}
    />
  );
}
