import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  FileText,
  Check,
  ExternalLink,
  Search,
  Wrench,
  Loader2,
} from 'lucide-react';
import {
  isOtherThread,
  type UIMessage,
  type UIMessagePart,
  type UITextPart,
  type UIReasoningPart,
  type UIToolCallPart,
  type UIOperationPart,
  type UISourcePart,
  type UIFilePart,
  type UIObjectPart,
} from '@octavus/react';

import { OperationCard } from './operation-card';

export interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  if (isUser) {
    const fileParts = message.parts.filter((p) => p.type === 'file');
    const textParts = message.parts.filter((p) => p.type === 'text');

    return (
      <div className="mb-4 flex flex-col items-end gap-2">
        {fileParts.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {fileParts.map((part, index) => (
              <UserFilePreview key={index} part={part} />
            ))}
          </div>
        )}
        {textParts.length > 0 && (
          <div className="relative max-w-[85%] rounded-lg bg-primary/10 px-4 py-3 text-foreground">
            {textParts.map((part, index) => (
              <UserPartRenderer key={index} part={part} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      {message.parts.map((part, index) => (
        <PartRenderer key={index} part={part} isFirst={index === 0} />
      ))}

      {/* Show streaming indicator if no parts yet */}
      {isStreaming && message.parts.length === 0 && (
        <div className="flex w-fit items-center gap-1.5 rounded-lg bg-card px-4 py-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      )}
    </div>
  );
}

function UserFilePreview({ part }: { part: UIMessagePart }) {
  if (part.type !== 'file') return null;

  const isImage = part.mediaType.startsWith('image/');

  if (isImage) {
    return (
      <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-card">
        <img
          src={part.url}
          alt={part.filename ?? 'Attached image'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-border bg-card px-2">
      <FileText className="mb-1 h-6 w-6 text-muted-foreground" />
      <span className="max-w-full truncate text-xs text-muted-foreground">
        {part.filename ?? 'File'}
      </span>
    </div>
  );
}

function UserPartRenderer({ part }: { part: UIMessagePart }) {
  if (part.type === 'text') {
    return <span>{part.text}</span>;
  }

  return null;
}

interface PartRendererProps {
  part: UIMessagePart;
  isFirst: boolean;
}

function PartRenderer({ part, isFirst }: PartRendererProps) {
  switch (part.type) {
    case 'text':
      if (isOtherThread(part)) {
        return <OtherThreadTextView part={part} isFirst={isFirst} />;
      }
      return <TextPartView part={part} isFirst={isFirst} />;

    case 'reasoning':
      if (isOtherThread(part)) {
        return <OtherThreadReasoningView part={part} isFirst={isFirst} />;
      }
      return <ReasoningPartView part={part} isFirst={isFirst} />;

    case 'tool-call':
      if (isOtherThread(part)) {
        return <OtherThreadToolCallView part={part} isFirst={isFirst} />;
      }
      return <ToolCallPartView part={part} isFirst={isFirst} />;

    case 'operation':
      return <OperationPartView part={part} isFirst={isFirst} />;

    case 'source':
      return <SourcePartView part={part} isFirst={isFirst} />;

    case 'file':
      return <FilePartView part={part} isFirst={isFirst} />;

    case 'object':
      return <ObjectPartView part={part} isFirst={isFirst} />;

    default:
      return null;
  }
}

function TextPartView({ part, isFirst }: { part: UITextPart; isFirst: boolean }) {
  if (!part.text) return null;

  return (
    <div className={isFirst ? '' : 'mt-3'}>
      <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:my-3 prose-ul:my-2 prose-ol:my-2">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ children, href, ...props }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            ),
          }}
        >
          {part.text}
        </Markdown>
      </div>
      {part.status === 'streaming' && (
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/50" />
      )}
    </div>
  );
}

function ReasoningPartView({ part, isFirst }: { part: UIReasoningPart; isFirst: boolean }) {
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevIsStreamingRef = useRef(part.status === 'streaming');

  const isStreaming = part.status === 'streaming';

  useEffect(() => {
    if (prevIsStreamingRef.current !== isStreaming) {
      prevIsStreamingRef.current = isStreaming;
      setUserOverride(null);
    }
  }, [isStreaming]);

  const isExpanded = userOverride ?? isStreaming;

  useEffect(() => {
    if (isStreaming && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [part.text, isStreaming, isExpanded]);

  if (!part.text) return null;

  return (
    <div className={isFirst ? '' : 'mt-2'}>
      <div className="overflow-hidden rounded-lg border border-teal-500/30 bg-teal-500/5">
        <button
          type="button"
          onClick={() => setUserOverride(!isExpanded)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-teal-500/10"
        >
          <Lightbulb
            className={`h-4 w-4 text-teal-400 ${isStreaming ? 'animate-pulse' : ''}`}
          />
          <span className="text-sm font-medium text-teal-400">
            {isStreaming ? 'Thinking...' : 'Thought process'}
          </span>
          {!isStreaming && <Check className="h-3.5 w-3.5 text-teal-400" />}
          {isExpanded ? (
            <ChevronDown className="ml-auto h-4 w-4 text-teal-400" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4 text-teal-400" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-teal-500/20 px-3 py-2">
            <div ref={contentRef} className="max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-teal-300/80">
                {part.text}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallPartView({ part, isFirst }: { part: UIToolCallPart; isFirst: boolean }) {
  const displayText = part.displayName || part.toolName;
  const isRunning = part.status === 'pending' || part.status === 'running';

  const IconComponent = part.toolName === 'web-search' ? Search : Wrench;

  return (
    <div className={`${isFirst ? '' : 'mt-2'} mb-2`}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm">
        <IconComponent
          className={`h-4 w-4 text-muted-foreground ${isRunning ? 'animate-pulse' : ''}`}
        />
        <span className="text-muted-foreground">{displayText}</span>
        {part.status === 'cancelled' && (
          <span className="text-sm text-amber-400">(cancelled)</span>
        )}
        <div className="ml-auto">
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {part.status === 'done' && <Check className="h-4 w-4 text-teal-400" />}
          {part.status === 'error' && <span className="text-sm text-red-400">error</span>}
          {part.status === 'cancelled' && <span className="text-sm text-amber-400">stopped</span>}
        </div>
      </div>
      {part.error && (
        <div className="mt-1 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2">
          <p className="text-sm text-red-400">{part.error}</p>
        </div>
      )}
    </div>
  );
}

function OperationPartView({ part, isFirst }: { part: UIOperationPart; isFirst: boolean }) {
  return (
    <div className={`${isFirst ? '' : 'mt-2'} mb-2`}>
      <OperationCard operation={part} />
    </div>
  );
}

function SourcePartView({ part, isFirst }: { part: UISourcePart; isFirst: boolean }) {
  if (part.sourceType === 'url') {
    let domain = '';
    try {
      domain = new URL(part.url).hostname.replace('www.', '');
    } catch {
      domain = part.url;
    }

    return (
      <div className={`${isFirst ? '' : 'mt-2'} mb-2`}>
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm transition-colors hover:bg-card"
        >
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          <span className="truncate text-muted-foreground group-hover:text-foreground">
            {part.title || domain}
          </span>
          <span className="ml-auto shrink-0 text-sm text-muted-foreground/60">{domain}</span>
        </a>
      </div>
    );
  }

  return (
    <div className={`${isFirst ? '' : 'mt-2'} mb-2`}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-muted-foreground">{part.title}</span>
        {part.filename && (
          <span className="ml-auto shrink-0 text-sm text-muted-foreground/60">{part.filename}</span>
        )}
      </div>
    </div>
  );
}

function FilePartView({ part, isFirst }: { part: UIFilePart; isFirst: boolean }) {
  const isImage = part.mediaType.startsWith('image/');
  const displayName = part.filename ?? 'Download file';

  if (isImage) {
    return (
      <div className={`${isFirst ? '' : 'mt-3'} mb-3`}>
        <a href={part.url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={part.url}
            alt={displayName}
            className="max-h-80 w-auto rounded-lg object-contain"
            loading="lazy"
          />
        </a>
      </div>
    );
  }

  return (
    <div className={`${isFirst ? '' : 'mt-2'} mb-2`}>
      <a
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm transition-colors hover:bg-card"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-muted-foreground group-hover:text-foreground">
          {displayName}
        </span>
        <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      </a>
    </div>
  );
}

function ObjectPartView({ part, isFirst }: { part: UIObjectPart; isFirst: boolean }) {
  const displayValue = part.object ?? part.partial;
  const isStreaming = part.status === 'streaming';
  const isError = part.status === 'error';

  return (
    <div className={isFirst ? '' : 'mt-3'}>
      {isError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="text-sm text-red-400">{part.error ?? 'Unknown error'}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">{part.typeName}</div>
          <pre className="overflow-auto text-sm text-foreground">
            {displayValue !== undefined ? JSON.stringify(displayValue, null, 2) : ''}
          </pre>
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/50" />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Other Thread Components (Amber themed)
// =============================================================================

function OtherThreadReasoningView({ part, isFirst }: { part: UIReasoningPart; isFirst: boolean }) {
  if (!part.text) return null;

  return (
    <div className={isFirst ? '' : 'mt-2'}>
      <OtherThreadCollapsible
        title={`${part.thread} (reasoning)`}
        content={part.text}
        isStreaming={part.status === 'streaming'}
        variant="reasoning"
      />
    </div>
  );
}

function OtherThreadTextView({ part, isFirst }: { part: UITextPart; isFirst: boolean }) {
  if (!part.text) return null;

  return (
    <div className={isFirst ? '' : 'mt-2'}>
      <OtherThreadCollapsible
        title={`${part.thread} output`}
        content={part.text}
        isStreaming={part.status === 'streaming'}
        variant="output"
      />
    </div>
  );
}

function OtherThreadToolCallView({ part, isFirst }: { part: UIToolCallPart; isFirst: boolean }) {
  const isRunning = part.status === 'pending' || part.status === 'running';

  return (
    <div className={isFirst ? '' : 'mt-2'}>
      <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 px-3 py-2">
          <Wrench className={`h-4 w-4 text-amber-400 ${isRunning ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium text-amber-400">
            {part.thread}: {part.displayName ?? part.toolName}
          </span>
          <div className="ml-auto">
            {part.status === 'done' && <Check className="h-4 w-4 text-teal-400" />}
            {isRunning && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />}
            {part.status === 'cancelled' && (
              <span className="text-sm text-amber-400">cancelled</span>
            )}
            {part.status === 'error' && <span className="text-sm text-red-400">error</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Collapsible component for non-main thread content (amber themed) */
function OtherThreadCollapsible({
  title,
  content,
  isStreaming,
  variant,
}: {
  title: string;
  content: string;
  isStreaming: boolean;
  variant: 'reasoning' | 'output';
}) {
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevIsStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (prevIsStreamingRef.current !== isStreaming) {
      prevIsStreamingRef.current = isStreaming;
      setUserOverride(null);
    }
  }, [isStreaming]);

  const isExpanded = userOverride ?? isStreaming;

  useEffect(() => {
    if (isStreaming && isExpanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isStreaming, isExpanded]);

  const Icon = variant === 'reasoning' ? Lightbulb : FileText;

  return (
    <div className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setUserOverride(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-amber-500/10"
      >
        <Icon className={`h-4 w-4 text-amber-400 ${isStreaming ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-amber-400">{title}</span>
        {!isStreaming && <Check className="h-4 w-4 text-teal-400" />}
        {isExpanded ? (
          <ChevronDown className="ml-auto h-4 w-4 text-amber-400" />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-amber-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-amber-500/20 px-3 py-2">
          <div ref={contentRef} className="max-h-64 overflow-y-auto">
            {variant === 'reasoning' ? (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-amber-300/80">
                {content}
              </pre>
            ) : (
              <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:my-3">
                <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
              </div>
            )}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-400" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
