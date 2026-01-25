import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './features/chat/landing-page';
import { ChatPage } from './features/chat/chat-page';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat/:sessionId" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
