import React from 'react';
import type { Note } from '../types';

interface Props {
  note: Note;
  isSelected: boolean;
  onSelect: (note: Note) => void;
}

const BODY_PREVIEW_LEN = 120;

/**
 * Summary card shown in the note list (US-3).
 * Shows title, a truncated body preview, tags, and relative updated-at time.
 */
export const NoteCard: React.FC<Props> = ({ note, isSelected, onSelect }) => {
  const preview = note.body.length > BODY_PREVIEW_LEN
    ? `${note.body.slice(0, BODY_PREVIEW_LEN)}…`
    : note.body;

  const completedCount = countCompleted(note.todoItems);
  const totalCount = countTotal(note.todoItems);

  return (
    <button
      onClick={() => onSelect(note)}
      aria-pressed={isSelected}
      className={`w-full rounded-xl border p-4 text-left transition-all
        ${isSelected
          ? 'border-indigo-400 bg-indigo-50 shadow-md dark:border-indigo-600 dark:bg-indigo-900/30'
          : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800'
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
          {note.title || 'Untitled'}
        </h3>
        <time className="shrink-0 text-xs text-gray-400" dateTime={note.updatedAt}>
          {relativeTime(note.updatedAt)}
        </time>
      </div>

      {preview && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {preview}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Tags */}
        {note.tags.map((tag) => (
          <span key={tag.id}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600
                           dark:bg-gray-700 dark:text-gray-300">
            #{tag.name}
          </span>
        ))}

        {/* Todo progress */}
        {totalCount > 0 && (
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs
                           text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            {completedCount}/{totalCount} done
          </span>
        )}
      </div>
    </button>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countCompleted(items: Note['todoItems']): number {
  return items.reduce(
    (sum, item) => sum + (item.isCompleted ? 1 : 0) + countCompleted(item.children),
    0
  );
}

function countTotal(items: Note['todoItems']): number {
  return items.reduce((sum, item) => sum + 1 + countTotal(item.children), 0);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
