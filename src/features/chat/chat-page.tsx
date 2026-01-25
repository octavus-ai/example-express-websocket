import { useParams, Navigate } from 'react-router-dom';
import { ChatInterface } from './chat-interface';

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  return <ChatInterface sessionId={sessionId} />;
}
