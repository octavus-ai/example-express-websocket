import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMetadata {
  title: string;
  summary: string;
  image: string;
}

interface ChatSidebarProps {
  metadata: ChatMetadata;
  onGenerateMetadata: () => void;
  isGenerating: boolean;
}

/**
 * Sidebar displaying chat metadata (title, summary, cover image).
 * Resources are updated via onResourceUpdate callback from useOctavusChat.
 */
export function ChatSidebar({ metadata, onGenerateMetadata, isGenerating }: ChatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasMetadata = metadata.title !== 'New Chat' || metadata.summary || metadata.image;

  return (
    <aside className="flex w-80 flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium text-foreground">Chat Details</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Chat Card */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Cover Image */}
          {metadata.image ? (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={metadata.image}
                alt="Chat cover"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-muted">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          )}

          {/* Title & Summary */}
          <div className="p-4">
            <h3 className="text-lg font-medium text-card-foreground">{metadata.title}</h3>

            {metadata.summary && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
                >
                  <span>Summary</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {metadata.summary}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Generate Metadata Button */}
        <button
          type="button"
          onClick={onGenerateMetadata}
          disabled={isGenerating}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-colors',
            isGenerating
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : 'bg-teal-600 text-white hover:bg-teal-500',
          )}
        >
          <Sparkles className={cn('h-5 w-5', isGenerating && 'animate-pulse')} />
          {isGenerating ? 'Generating...' : 'Generate Title & Image'}
        </button>

        {!hasMetadata && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Chat with the assistant, then generate a title, summary, and cover image.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Resources sync automatically via Octavus events.
        </p>
      </div>
    </aside>
  );
}
