import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  /** Text to display at the top of the modal */
  promptText?: string;
  /** Whether to show the rating stars */
  showRating?: boolean;
  /** Whether to show the comment input */
  showComment?: boolean;
  /** Called when user submits feedback */
  onSubmit: (rating: number | null, comment: string | null) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

export function FeedbackModal({
  promptText,
  showRating = true,
  showComment = true,
  onSubmit,
  onCancel,
}: FeedbackModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  function handleSubmit() {
    onSubmit(showRating ? rating : null, showComment ? comment || null : null);
  }

  const displayedRating = hoveredRating ?? rating;
  const canSubmit = !showRating || rating !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          {promptText || 'How was your experience?'}
        </h2>

        {/* Rating stars */}
        {showRating && (
          <div className="mb-4">
            <p className="mb-2 text-sm text-muted-foreground">Rate your experience</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-8 w-8',
                      displayedRating !== null && star <= displayedRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/50',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment input */}
        {showComment && (
          <div className="mb-4">
            <label htmlFor="feedback-comment" className="mb-2 block text-sm text-muted-foreground">
              Additional comments (optional)
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="h-24 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
