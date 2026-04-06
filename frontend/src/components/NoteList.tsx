import React from 'react';
import type { Note } from '../types';
import { NoteCard } from './NoteCard';

interface Props {
  notes: Note[];
  selectedId: number | null;
  isLoading: boolean;
  onSelect: (note: Note) => void;
}

/**
 * Dashboard note list panel (US-3).
 * Shows a spinner while loading, an empty state, or the full card list.
 */
export const NoteList: React.FC<Props> = ({ notes, selectedId, isLoading, onSelect }) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500
                        border-t-transparent" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293
                   l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p className="text-sm text-gray-400">No notes yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 overflow-y-auto pr-1" role="list">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteCard
            note={note}
            isSelected={note.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
};
