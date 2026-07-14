import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartChat() {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const { sessionId } = await response.json();
      navigate(`/chat/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setIsCreating(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo/Title */}
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-400/20">
            <img src="/octo.png" alt="Octavus" width={40} height={40} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Octavus Chat</h1>
          <p className="mt-2 text-muted-foreground">
            An Express + WebSocket example demonstrating Octavus integration
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 rounded-lg border border-border bg-card p-6 text-left">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Features
          </h2>
          <ul className="space-y-3 text-sm text-card-foreground/80">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Real-time streaming via WebSocket (SockJS)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Extended thinking display
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Tool calls (get current time)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Skills (QR code generation)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Image uploads and generation
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Metadata sync (title, summary, cover image)
            </li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartChat}
          disabled={isCreating}
          className="w-full rounded-lg bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating session...
            </span>
          ) : (
            'Start Chat'
          )}
        </button>

        {/* Footer */}
        <p className="mt-6 text-xs text-muted-foreground">
          Powered by{' '}
          <a
            href="https://octavus.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400 hover:text-teal-300"
          >
            Octavus
          </a>
        </p>
      </div>
    </main>
  );
}
