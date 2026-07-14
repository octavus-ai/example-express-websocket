import { Check, Loader2, Settings2 } from 'lucide-react';
import type { UIOperationPart } from '@octavus/react';

interface OperationCardProps {
  operation: UIOperationPart;
}

/**
 * Displays internal Octavus operations like serialize-thread.
 * Shows status indicator with the operation name.
 */
export function OperationCard({ operation }: OperationCardProps) {
  const isRunning = operation.status === 'running';
  const isCancelled = operation.status === 'cancelled';

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card/50">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Settings2
          className={`h-4 w-4 text-muted-foreground ${isRunning ? 'animate-pulse' : ''}`}
        />
        <span className="text-muted-foreground">{operation.name}</span>
        {isCancelled && <span className="text-amber-400">(cancelled)</span>}
        <div className="ml-auto">
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {operation.status === 'done' && <Check className="h-4 w-4 text-teal-400" />}
          {isCancelled && <span className="text-amber-400">stopped</span>}
        </div>
      </div>
    </div>
  );
}
