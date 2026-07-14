import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Paperclip, X, Loader2, AlertCircle, Square, Send, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import {
  isRateLimitError,
  isAuthenticationError,
  isProviderError,
  type FileReference,
  type OctavusError,
  type UIMessage,
} from '@octavus/react';

import { cn } from '@/lib/utils';
import { useOctavusSocket } from '@/hooks/useOctavusSocket';
import { MessageBubble } from './message-bubble';
import { ChatSidebar, type ChatMetadata } from './chat-sidebar';
import { FeedbackModal } from './feedback-modal';

/** Schema for request-feedback tool arguments */
const feedbackToolArgsSchema = z.object({
  promptText: z.string().optional(),
  showRating: z.boolean().optional(),
  showComment: z.boolean().optional(),
});

interface PendingFile {
  file: File;
  id: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  fileRef?: FileReference;
  error?: string;
}

export interface ChatInterfaceProps {
  sessionId: string;
  initialMessages?: UIMessage[];
  onMessagesUpdate?: (messages: UIMessage[]) => void;
}

export function ChatInterface({
  sessionId,
  initialMessages,
  onMessagesUpdate,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [chatMetadata, setChatMetadata] = useState<ChatMetadata>({
    title: 'New Chat',
    summary: '',
    image: '',
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileIdCounter = useRef(0);

  const generateFileId = () => {
    fileIdCounter.current += 1;
    return `pending-${fileIdCounter.current}`;
  };

  const handleMetadata = useCallback(
    (metadata: { title: string; summary: string; image: string }) => {
      setChatMetadata(metadata);
    },
    [],
  );

  const handleFinish = useCallback(() => {
    setIsGeneratingMetadata(false);
  }, []);

  const handleError = useCallback((_err: OctavusError) => {
    setIsGeneratingMetadata(false);
  }, []);

  const { messages, status, error, send, stop, uploadFiles, pendingClientTools } = useOctavusSocket(
    {
      sessionId,
      initialMessages,
      onMetadata: handleMetadata,
      onMessagesUpdate,
      onFinish: handleFinish,
      onError: handleError,
    },
  );

  const isStreaming = status === 'streaming';
  const isAwaitingInput = status === 'awaiting-input';

  // Get pending feedback tools with parsed args
  const feedbackTools = useMemo(() => {
    const tools = pendingClientTools['request-feedback'] ?? [];
    return tools.map((tool) => {
      const result = feedbackToolArgsSchema.safeParse(tool.args);
      return {
        ...tool,
        parsedArgs: result.success ? result.data : {},
      };
    });
  }, [pendingClientTools]);

  // For simplicity, handle first pending feedback tool (multiple can be supported by mapping)
  const feedbackTool = feedbackTools[0] ?? null;

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    const frameId = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(frameId);
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allFilesReady =
    pendingFiles.length === 0 || pendingFiles.every((pf) => pf.status === 'done');
  const isUploading = pendingFiles.some((pf) => pf.status === 'uploading');
  const hasUploadErrors = pendingFiles.some((pf) => pf.status === 'error');

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if ((!inputValue.trim() && pendingFiles.length === 0) || isStreaming) return;
    if (!allFilesReady) return;

    const fileRefs = pendingFiles
      .filter((pf) => pf.status === 'done' && pf.fileRef !== undefined)
      .map((pf) => pf.fileRef!);

    const message = inputValue;
    setInputValue('');
    setPendingFiles([]);

    await send(
      'user-message',
      {
        USER_MESSAGE: message,
        ATTACHMENTS: fileRefs.length > 0 ? fileRefs : undefined,
      },
      {
        userMessage: {
          content: message,
          files: fileRefs.length > 0 ? fileRefs : undefined,
        },
      },
    );
  }

  async function handleGenerateMetadata() {
    if (isStreaming || isGeneratingMetadata) return;
    setIsGeneratingMetadata(true);
    await send('generate-metadata');
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    event.target.value = '';

    const newPendingFiles: PendingFile[] = files.map((file) => ({
      file,
      id: generateFileId(),
      status: 'uploading',
      progress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);

    for (const pendingFile of newPendingFiles) {
      try {
        const [fileRef] = await uploadFiles([pendingFile.file], (_index, progress) => {
          setPendingFiles((prev) =>
            prev.map((pf) => (pf.id === pendingFile.id ? { ...pf, progress } : pf)),
          );
        });

        setPendingFiles((prev) =>
          prev.map((pf) =>
            pf.id === pendingFile.id ? { ...pf, status: 'done', progress: 100, fileRef } : pf,
          ),
        );
      } catch (err) {
        setPendingFiles((prev) =>
          prev.map((pf) =>
            pf.id === pendingFile.id
              ? {
                  ...pf,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : pf,
          ),
        );
      }
    }
  }

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="border-b border-border bg-surface px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/octo.png" alt="Octavus" width={24} height={24} />
              <span className="font-medium text-foreground">Octavus Chat</span>
              <a
                href={`${import.meta.env.VITE_OCTAVUS_PLATFORM_URL || 'https://octavus.ai'}/sessions/${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <span>{sessionId.slice(0, 8)}...</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                status === 'streaming'
                  ? 'bg-teal-400/20 text-teal-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {status}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto max-w-4xl py-6">
            {messages.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-lg">Start a conversation</p>
                <p className="mt-2 text-sm">
                  Try asking about the time, generating a QR code, or uploading an image.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Error Display */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">
                      {(() => {
                        if (isRateLimitError(error)) return 'Service is temporarily busy';
                        if (isAuthenticationError(error)) return 'Service configuration error';
                        if (isProviderError(error)) return 'AI service temporarily unavailable';
                        return 'Something went wrong';
                      })()}
                    </p>
                    <p className="mt-1 text-xs text-red-400/70">{error.message}</p>

                    {isRateLimitError(error) && error.retryAfter !== undefined && (
                      <p className="mt-2 text-xs text-red-400/70">
                        Please try again in {error.retryAfter} seconds
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-surface px-4 py-4 backdrop-blur">
          <div className="mx-auto max-w-4xl">
            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {pendingFiles.map((pendingFile) => (
                  <div
                    key={pendingFile.id}
                    className={cn(
                      'relative flex items-center gap-2 rounded-lg px-3 py-2',
                      pendingFile.status === 'error'
                        ? 'border border-red-500/30 bg-red-900/30'
                        : 'bg-card',
                    )}
                  >
                    <div className="relative">
                      {pendingFile.file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(pendingFile.file)}
                          alt={pendingFile.file.name}
                          className={cn(
                            'h-10 w-10 rounded object-cover',
                            pendingFile.status === 'uploading' && 'opacity-50',
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground',
                            pendingFile.status === 'uploading' && 'opacity-50',
                          )}
                        >
                          {pendingFile.file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                        </div>
                      )}
                      {pendingFile.status === 'uploading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
                        </div>
                      )}
                      {pendingFile.status === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="max-w-[100px] truncate text-sm text-card-foreground">
                        {pendingFile.file.name}
                      </span>
                      {pendingFile.status === 'uploading' && (
                        <span className="text-xs text-teal-400">Uploading...</span>
                      )}
                      {pendingFile.status === 'error' && (
                        <span className="text-xs text-red-400">{pendingFile.error || 'Failed'}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(pendingFile.id)}
                      className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.md"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                className="shrink-0 rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isStreaming}
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="shrink-0 rounded-lg bg-red-600 p-2.5 text-white transition-colors hover:bg-red-500"
                >
                  <Square className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    isUploading ||
                    (!inputValue.trim() && pendingFiles.length === 0) ||
                    hasUploadErrors
                  }
                  className="shrink-0 rounded-lg bg-teal-600 p-2.5 text-white transition-colors hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <ChatSidebar
        metadata={chatMetadata}
        onGenerateMetadata={handleGenerateMetadata}
        isGenerating={isGeneratingMetadata || isStreaming}
      />

      {/* Feedback Modal for client-side tool */}
      {feedbackTool && (
        <FeedbackModal
          {...feedbackTool.parsedArgs}
          onSubmit={(rating, comment) => feedbackTool.submit({ rating, comment })}
          onCancel={() => feedbackTool.cancel()}
        />
      )}

      {/* Awaiting input indicator (for other interactive tools) */}
      {isAwaitingInput && !feedbackTool && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="rounded-lg border border-border bg-surface px-6 py-4 text-foreground">
            Waiting for input...
          </div>
        </div>
      )}
    </div>
  );
}
